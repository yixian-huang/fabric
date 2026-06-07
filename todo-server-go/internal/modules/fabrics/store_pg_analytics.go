package fabrics

import (
	"context"
	"fmt"
	"strings"
	"time"

	"todo-server-go/internal/infra/analytics"
)

func (s *pgStore) accessRec() *analytics.Recorder {
	if s._accessRec == nil {
		s._accessRec = analytics.NewRecorder(s.pool)
	}
	return s._accessRec
}

func accessRecordToInfra(rec AccessRecord) analytics.Record {
	parsed := analytics.ParseUserAgent(rec.UserAgent)
	return analytics.Record{
		IP:         rec.IP,
		UserAgent:  rec.UserAgent,
		Page:       rec.Page,
		URL:        rec.URL,
		Referrer:   rec.Referrer,
		StatusCode: rec.StatusCode,
		Bytes:      rec.Bytes,
		UserID:     rec.UserID,
		Browser:    parsed.Browser,
		OS:         parsed.OS,
		Device:     parsed.Device,
		VisitedAt:  rec.VisitedAt,
	}
}

func (s *pgStore) RecordAccess(ctx context.Context, rec AccessRecord, dedup bool) (bool, error) {
	return s.accessRec().Record(ctx, accessRecordToInfra(rec), dedup)
}

func (s *pgStore) AnalyticsSummary(ctx context.Context, from, to time.Time) (AnalyticsSummary, error) {
	var summary AnalyticsSummary
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*),
		       COUNT(DISTINCT ip_address),
		       COALESCE(SUM(bytes), 0)
		FROM visitor_logs
		WHERE visited_at >= $1 AND visited_at < $2`, from, to).Scan(
		&summary.Requests, &summary.UniqueIPs, &summary.TrafficBytes)
	if err != nil {
		return summary, err
	}
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM visitor_logs
		WHERE visited_at >= $1 AND visited_at < $2
		  AND status_code >= 200 AND status_code < 400`, from, to).Scan(&summary.PageViews)
	return summary, err
}

func (s *pgStore) AnalyticsDimensions(ctx context.Context, q AnalyticsQuery) ([]DimensionRow, error) {
	column, err := dimensionColumn(q.Dimension)
	if err != nil {
		return nil, err
	}
	limit := q.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := fmt.Sprintf(`
		SELECT COALESCE(NULLIF(TRIM(%s), ''), '(empty)') AS dim_key,
		       COUNT(*) AS cnt,
		       COALESCE(SUM(bytes), 0) AS total_bytes
		FROM visitor_logs
		WHERE visited_at >= $1 AND visited_at < $2
		GROUP BY dim_key
		ORDER BY cnt DESC
		LIMIT $3`, column)

	rows, err := s.pool.Query(ctx, query, q.From, q.To, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DimensionRow, 0)
	for rows.Next() {
		var row DimensionRow
		if err := rows.Scan(&row.Key, &row.Count, &row.Bytes); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func dimensionColumn(dimension string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(dimension)) {
	case "url":
		return "COALESCE(NULLIF(url, ''), page)", nil
	case "source", "referrer":
		return "referrer", nil
	case "ip":
		return "ip_address", nil
	case "browser":
		return "browser", nil
	case "os", "operating_system":
		return "os", nil
	case "device":
		return "device", nil
	case "status_code", "status":
		return "status_code::text", nil
	case "page":
		return "page", nil
	default:
		return "", fmt.Errorf("unsupported dimension: %s", dimension)
	}
}

func (s *pgStore) AnalyticsTrends(ctx context.Context, q AnalyticsQuery) ([]TrendPoint, error) {
	trunc := "day"
	switch strings.ToLower(q.Granularity) {
	case "hour":
		trunc = "hour"
	case "week":
		trunc = "week"
	case "month":
		trunc = "month"
	}

	expr, err := trendValueExpr(q.Metric)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT to_char(date_trunc('%s', visited_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS bucket,
		       %s AS val
		FROM visitor_logs
		WHERE visited_at >= $1 AND visited_at < $2
		GROUP BY bucket
		ORDER BY bucket`, trunc, expr)

	rows, err := s.pool.Query(ctx, query, q.From, q.To)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]TrendPoint, 0)
	for rows.Next() {
		var p TrendPoint
		var val int64
		if err := rows.Scan(&p.Date, &val); err != nil {
			return nil, err
		}
		p.Value = val
		out = append(out, p)
	}
	return out, rows.Err()
}

func trendValueExpr(metric string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(metric)) {
	case "pv", "page_views", "pageviews":
		return `COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)`, nil
	case "uv", "visitors", "unique_visitors":
		return `COUNT(DISTINCT ip_address)`, nil
	case "traffic", "bytes":
		return `COALESCE(SUM(bytes), 0)`, nil
	case "requests", "req":
		return `COUNT(*)`, nil
	default:
		return "", fmt.Errorf("unsupported metric: %s", metric)
	}
}

func parseAnalyticsTimeRange(fromRaw, toRaw string, now time.Time) (time.Time, time.Time, error) {
	to := now.UTC()
	if strings.TrimSpace(toRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(toRaw))
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid to time")
		}
		to = parsed.UTC()
	}
	from := to.AddDate(0, 0, -7)
	if strings.TrimSpace(fromRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(fromRaw))
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid from time")
		}
		from = parsed.UTC()
	}
	if !from.Before(to) {
		return time.Time{}, time.Time{}, fmt.Errorf("from must be before to")
	}
	return from, to, nil
}
