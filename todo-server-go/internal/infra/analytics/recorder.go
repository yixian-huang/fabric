package analytics

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const visitDedupTTL = 10 * time.Minute

type Record struct {
	IP         string
	UserAgent  string
	Page       string
	URL        string
	Referrer   string
	StatusCode int
	Bytes      int64
	UserID     string
	Browser    string
	OS         string
	Device     string
	VisitedAt  time.Time
}

type Recorder struct {
	pool *pgxpool.Pool
}

func NewRecorder(pool *pgxpool.Pool) *Recorder {
	return &Recorder{pool: pool}
}

func (r *Recorder) Record(ctx context.Context, rec Record, dedup bool) (bool, error) {
	if rec.Page == "" {
		rec.Page = rec.URL
	}
	if rec.Page == "" {
		rec.Page = "unknown"
	}
	if rec.StatusCode == 0 {
		rec.StatusCode = 200
	}
	if rec.VisitedAt.IsZero() {
		rec.VisitedAt = time.Now().UTC()
	}
	if rec.Browser == "" && rec.UserAgent != "" {
		parsed := ParseUserAgent(rec.UserAgent)
		rec.Browser = parsed.Browser
		rec.OS = parsed.OS
		rec.Device = parsed.Device
	}

	if dedup {
		var recent bool
		err := r.pool.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM visitor_logs
				WHERE ip_address = $1 AND user_agent = $2 AND page = $3
				  AND visited_at > $4
			)`, rec.IP, rec.UserAgent, rec.Page, rec.VisitedAt.Add(-visitDedupTTL)).Scan(&recent)
		if err != nil {
			return false, err
		}
		if recent {
			return false, nil
		}
	}

	var userID *string
	if strings.TrimSpace(rec.UserID) != "" {
		uid := strings.TrimSpace(rec.UserID)
		userID = &uid
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO visitor_logs (
			ip_address, user_agent, page, url, referrer, status_code,
			browser, os, device, bytes, user_id, visited_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		rec.IP, rec.UserAgent, rec.Page, rec.URL, rec.Referrer, rec.StatusCode,
		rec.Browser, rec.OS, rec.Device, rec.Bytes, userID, rec.VisitedAt)
	if err != nil {
		return false, err
	}

	if userID != nil {
		_, _ = r.pool.Exec(ctx, `
			UPDATE users SET last_visited_at = $2, updated_at = NOW()
			WHERE user_id = $1`, *userID, rec.VisitedAt)
	}

	return true, nil
}
