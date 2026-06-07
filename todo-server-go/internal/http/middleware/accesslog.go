package middleware

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/infra/analytics"
)

// AccessLog records HTTP requests for analytics (skips health checks and static assets).
func AccessLog(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	recorder := analytics.NewRecorder(pool)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if shouldSkipAccessLog(path) {
				next.ServeHTTP(w, r)
				return
			}

			rw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rw, r)

			userID := ""
			if u, ok := CurrentUser(r.Context()); ok {
				userID = u.UserID
			}

			page := path
			if strings.HasPrefix(path, "/api/") {
				page = "api:" + path
			}

			bytes := int64(0)
			if rw.written > 0 {
				bytes = int64(rw.written)
			}

			rec := analytics.Record{
				IP:         clientIPFromRequest(r),
				UserAgent:  r.UserAgent(),
				Page:       page,
				URL:        r.URL.String(),
				Referrer:   r.Referer(),
				StatusCode: rw.status,
				Bytes:      bytes,
				UserID:     userID,
				VisitedAt:  time.Now().UTC(),
			}
			_, _ = recorder.Record(r.Context(), rec, false)
		})
	}
}

func shouldSkipAccessLog(path string) bool {
	if path == "/healthz" {
		return true
	}
	if strings.HasPrefix(path, "/api/base/images/download") {
		return true
	}
	return false
}

type statusWriter struct {
	http.ResponseWriter
	status  int
	written int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.written += n
	return n, err
}

func clientIPFromRequest(r *http.Request) string {
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
