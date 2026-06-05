package fabrics

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"todo-server-go/internal/http/middleware"
	"todo-server-go/internal/http/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok || user.UserID == "" {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	query := parseListQuery(r)
	result := h.svc.List(query, user.UserID)
	response.JSON(w, http.StatusOK, 200, "获取面料列表成功", result)
}

func (h *Handler) ListPublic(w http.ResponseWriter, r *http.Request) {
	query := parseListQuery(r)
	result := h.svc.ListPublic(query)
	response.JSON(w, http.StatusOK, 200, "获取公开面料列表成功", result)
}

func (h *Handler) GetOptions(w http.ResponseWriter, r *http.Request) {
	categoryCode := strings.TrimSpace(r.URL.Query().Get("category_code"))
	opts := h.svc.GetOptions(categoryCode)
	response.JSON(w, http.StatusOK, 200, "获取选项字典成功", opts)
}

func (h *Handler) CheckFabricCode(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(r.URL.Query().Get("fabric_code"))
	exists := h.svc.CheckFabricCode(code)
	response.JSON(w, http.StatusOK, 200, "ok", exists)
}

func (h *Handler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok || user.UserID == "" {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}

	var req struct {
		FabricID string `json:"fabric_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 400, "请求参数错误", nil)
		return
	}

	found, favorited := h.svc.ToggleFavorite(user.UserID, strings.TrimSpace(req.FabricID))
	if !found {
		response.JSON(w, http.StatusNotFound, 404, "面料不存在", nil)
		return
	}
	msg := "取消收藏成功"
	if favorited {
		msg = "收藏成功"
	}
	response.JSON(w, http.StatusOK, 200, msg, map[string]interface{}{
		"fabric_id":    req.FabricID,
		"is_favorited": favorited,
	})
}

func (h *Handler) VisitorStats(w http.ResponseWriter, _ *http.Request) {
	stats := h.svc.VisitorStats(time.Now().UTC())
	response.JSON(w, http.StatusOK, 200, "获取访客统计成功", stats)
}

func (h *Handler) RecordVisit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Page string `json:"page"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	ip := clientIP(r)
	userAgent := r.UserAgent()
	page := strings.TrimSpace(req.Page)
	if page == "" {
		page = "fabric_preview"
	}

	created := h.svc.RecordVisit(ip, userAgent, page, time.Now().UTC())
	msg := "访客已记录在案"
	if created {
		msg = "访客记录已保存"
	}
	response.JSON(w, http.StatusOK, 200, msg, nil)
}

func (h *Handler) ListVendors(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListVendors(r.Context())
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取供应商列表成功", items)
}

func (h *Handler) CreateVendor(w http.ResponseWriter, r *http.Request) {
	var req Vendor
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid body", nil)
		return
	}
	created, err := h.svc.CreateVendor(r.Context(), req)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "create failed", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建供应商成功", created)
}

func (h *Handler) GetVendor(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "vendor_id")
	v, err := h.svc.GetVendor(r.Context(), id)
	if err != nil {
		response.JSON(w, http.StatusNotFound, 40401, "not found", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取供应商详情成功", v)
}

func (h *Handler) UpdateVendor(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(chi.URLParam(r, "vendor_id"))
	var req Vendor
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid body", nil)
		return
	}
	updated, err := h.svc.UpdateVendor(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, errNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "供应商不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新供应商成功", updated)
}

func (h *Handler) DeleteVendor(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(chi.URLParam(r, "vendor_id"))
	if err := h.svc.DeleteVendor(r.Context(), id); err != nil {
		if errors.Is(err, errNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "供应商不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除供应商成功", nil)
}

func (h *Handler) FabricList(w http.ResponseWriter, r *http.Request) {
	h.List(w, r)
}

func (h *Handler) GetFabric(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.CurrentUser(r.Context())
	fabricID := strings.TrimSpace(chi.URLParam(r, "fabric_id"))
	f, err := h.svc.GetFabric(fabricID, user.UserID)
	if err != nil {
		if errors.Is(err, ErrFabricNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "面料不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取面料详情成功", f)
}

func (h *Handler) CreateFabric(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req fabricPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	f, err := h.svc.CreateFabric(req.toInput())
	if err != nil {
		if errors.Is(err, ErrFabricCodeDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "面料编号已存在", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建面料成功", f)
}

func (h *Handler) UpdateFabric(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req fabricPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	fabricID := strings.TrimSpace(chi.URLParam(r, "fabric_id"))
	f, err := h.svc.UpdateFabric(fabricID, req.toInput())
	if err != nil {
		if errors.Is(err, ErrFabricNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "面料不存在", nil)
			return
		}
		if errors.Is(err, ErrFabricCodeDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "面料编号已存在", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新面料成功", f)
}

func (h *Handler) DeleteFabric(w http.ResponseWriter, r *http.Request) {
	fabricID := strings.TrimSpace(chi.URLParam(r, "fabric_id"))
	if err := h.svc.DeleteFabric(fabricID); err != nil {
		if errors.Is(err, ErrFabricNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "面料不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除面料成功", nil)
}

func (h *Handler) CreateOption(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req OptionInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	o, err := h.svc.CreateOption(req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建选项成功", o)
}

func (h *Handler) UpdateOption(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req struct {
		OptionName *string `json:"option_name"`
		SortOrder  *int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	optionID := strings.TrimSpace(chi.URLParam(r, "option_id"))
	o, err := h.svc.UpdateOption(optionID, req.OptionName, req.SortOrder)
	if err != nil {
		if errors.Is(err, ErrOptionNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "选项不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新选项成功", o)
}

func (h *Handler) DeleteOption(w http.ResponseWriter, r *http.Request) {
	optionID := strings.TrimSpace(chi.URLParam(r, "option_id"))
	if err := h.svc.DeleteOption(optionID); err != nil {
		if errors.Is(err, ErrOptionNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "选项不存在", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除选项成功", nil)
}

func (h *Handler) MyFavorites(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	items, err := h.svc.MyFavorites(user.UserID)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取收藏列表成功", items)
}

func (h *Handler) ShareFavorites(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	share, err := h.svc.ShareFavorites(user.UserID)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取分享链接成功", share)
}

func (h *Handler) SharedFavorites(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "缺少分享令牌", nil)
		return
	}
	items, err := h.svc.SharedFavorites(token)
	if err != nil {
		response.JSON(w, http.StatusNotFound, 40404, "分享链接无效或已过期", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取分享收藏列表成功", map[string]interface{}{
		"items": items,
	})
}

type fabricPayload struct {
	Code          string      `json:"code"`
	MerchantCode  string      `json:"merchant_code"`
	ReferenceCode string      `json:"reference_code"`
	ImageFileID   *string     `json:"image_file_id"`
	Weight        *float64    `json:"weight"`
	WeightUnit    string      `json:"weight_unit"`
	FabricType    flexInt     `json:"fabric_type"`
	StyleCodes    []string    `json:"style_codes"`
	ProcessCodes  []string    `json:"process_codes"`
	Remark        string      `json:"remark"`
	Components    []Component `json:"components"`
}

func (p fabricPayload) toInput() FabricInput {
	ft := strconv.Itoa(p.FabricType.Int())
	return FabricInput{
		Code:          p.Code,
		MerchantCode:  p.MerchantCode,
		ReferenceCode: p.ReferenceCode,
		ImageFileID:   normalizeImageFileID(p.ImageFileID),
		Weight:        p.Weight,
		WeightUnit:    p.WeightUnit,
		FabricType:    ft,
		StyleCodes:    p.StyleCodes,
		ProcessCodes:  p.ProcessCodes,
		Remark:        p.Remark,
		Components:    p.Components,
	}
}

func normalizeImageFileID(id *string) *string {
	if id == nil {
		return nil
	}
	s := strings.TrimSpace(*id)
	if s == "" {
		return nil
	}
	return &s
}

func parseListQuery(r *http.Request) ListQuery {
	q := r.URL.Query()
	return ListQuery{
		Page:                   parseIntWithDefault(q.Get("page"), defaultPage),
		PageSize:               parseIntWithDefault(q.Get("page_size"), defaultPageSize),
		ReferenceCode:          strings.TrimSpace(q.Get("reference_code")),
		FabricCode:             strings.TrimSpace(q.Get("fabric_code")),
		FabricType:             strings.TrimSpace(q.Get("fabric_type")),
		WeightUnit:             strings.TrimSpace(q.Get("weight_unit")),
		WeightMin:              parseOptionalFloat(q.Get("weight_min")),
		WeightMax:              parseOptionalFloat(q.Get("weight_max")),
		StyleCodes:             splitCSV(q.Get("style_codes")),
		StyleEnabledOR:         parseBool(q.Get("style_enabled_or")),
		ProcessCodes:           splitCSV(q.Get("process_codes")),
		ProcessEnabledOR:       parseBool(q.Get("process_enabled_or")),
		ComponentCode:          strings.TrimSpace(q.Get("component_code")),
		ComponentPercentageMin: parseOptionalFloat(q.Get("component_percentage_min")),
		ComponentPercentageMax: parseOptionalFloat(q.Get("component_percentage_max")),
	}
}

func parseIntWithDefault(raw string, fallback int) int {
	v, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return v
}

func parseOptionalFloat(raw string) *float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return nil
	}
	return &v
}

func parseBool(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "y":
		return true
	default:
		return false
	}
}

func splitCSV(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func clientIP(r *http.Request) string {
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xrip := strings.TrimSpace(r.Header.Get("X-Real-IP")); xrip != "" {
		return xrip
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
