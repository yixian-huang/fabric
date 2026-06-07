package fabrics

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"todo-server-go/internal/http/middleware"
	"todo-server-go/internal/http/response"
)

func (h *Handler) AnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	from, to, err := parseAnalyticsTimeRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), time.Now().UTC())
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	summary, err := h.svc.AnalyticsSummary(from, to)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", summary)
}

func (h *Handler) AnalyticsDimensions(w http.ResponseWriter, r *http.Request) {
	from, to, err := parseAnalyticsTimeRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), time.Now().UTC())
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	dimension := strings.TrimSpace(r.URL.Query().Get("dimension"))
	if dimension == "" {
		dimension = "url"
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	rows, err := h.svc.AnalyticsDimensions(AnalyticsQuery{
		From: from, To: to, Dimension: dimension, Limit: limit,
	})
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", rows)
}

func (h *Handler) AnalyticsTrends(w http.ResponseWriter, r *http.Request) {
	from, to, err := parseAnalyticsTimeRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), time.Now().UTC())
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	metric := strings.TrimSpace(r.URL.Query().Get("metric"))
	if metric == "" {
		metric = "pv"
	}
	granularity := strings.TrimSpace(r.URL.Query().Get("granularity"))
	if granularity == "" {
		granularity = "day"
	}
	points, err := h.svc.AnalyticsTrends(AnalyticsQuery{
		From: from, To: to, Metric: metric, Granularity: granularity,
	})
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", points)
}

func (h *Handler) RecordVisitEnhanced(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Page     string `json:"page"`
		URL      string `json:"url"`
		Referrer string `json:"referrer"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	page := strings.TrimSpace(req.Page)
	if page == "" {
		page = "fabric_preview"
	}
	url := strings.TrimSpace(req.URL)
	if url == "" {
		url = page
	}
	referrer := strings.TrimSpace(req.Referrer)
	if referrer == "" {
		referrer = strings.TrimSpace(r.Referer())
	}

	userID := ""
	if u, ok := middleware.CurrentUser(r.Context()); ok {
		userID = u.UserID
	}

	rec := AccessRecord{
		IP:         clientIP(r),
		UserAgent:  r.UserAgent(),
		Page:       page,
		URL:        url,
		Referrer:   referrer,
		StatusCode: 200,
		UserID:     userID,
		VisitedAt:  time.Now().UTC(),
	}
	created := h.svc.RecordAccess(rec, true)
	msg := "访客已记录在案"
	if created {
		msg = "访客记录已保存"
	}
	response.JSON(w, http.StatusOK, 200, msg, nil)
}
