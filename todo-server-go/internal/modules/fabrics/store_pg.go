package fabrics

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/infra/storage"
)

type pgStore struct {
	pool    *pgxpool.Pool
	storage storage.Store
}

func newPGStore(pool *pgxpool.Pool, store storage.Store) *pgStore {
	return &pgStore{pool: pool, storage: store}
}

var categoryLabels = map[string]string{
	"style":   "Style",
	"process": "Process",
}

func (s *pgStore) ListFabrics(ctx context.Context) ([]Fabric, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT fabric_id::text, code, COALESCE(reference_code, ''), merchant_code,
		       COALESCE(weight, 0), weight_unit, fabric_type, style_codes, process_codes,
		       remark, created_at, main_image_id::text
		FROM fabrics
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fabrics := make([]Fabric, 0)
	ids := make([]string, 0)
	for rows.Next() {
		f, err := scanFabric(rows)
		if err != nil {
			return nil, err
		}
		attachImageURLs(&f)
		fabrics = append(fabrics, f)
		ids = append(ids, f.FabricID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	components, err := s.loadComponents(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range fabrics {
		fabrics[i].Components = components[fabrics[i].FabricID]
	}
	return fabrics, nil
}

func (s *pgStore) loadComponents(ctx context.Context, fabricIDs []string) (map[string][]Component, error) {
	if len(fabricIDs) == 0 {
		return map[string][]Component{}, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT fabric_id::text, name, percentage, option_code
		FROM fabric_components
		WHERE fabric_id = ANY($1::uuid[])
		ORDER BY name`, fabricIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string][]Component)
	for rows.Next() {
		var fabricID string
		var c Component
		if err := rows.Scan(&fabricID, &c.Name, &c.Percentage, &c.OptionCode); err != nil {
			return nil, err
		}
		out[fabricID] = append(out[fabricID], c)
	}
	return out, rows.Err()
}

func (s *pgStore) ListOptions(ctx context.Context, category string) ([]Option, error) {
	var rows pgx.Rows
	var err error
	if category != "" {
		rows, err = s.pool.Query(ctx, `
			SELECT option_id::text, category_code, option_code, option_name, sort_order
			FROM options
			WHERE category_code = $1
			ORDER BY sort_order, option_code`, category)
	} else {
		rows, err = s.pool.Query(ctx, `
			SELECT option_id::text, category_code, option_code, option_name, sort_order
			FROM options
			ORDER BY category_code, sort_order, option_code`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Option, 0)
	for rows.Next() {
		var o Option
		if err := rows.Scan(&o.OptionID, &o.CategoryCode, &o.OptionCode, &o.OptionName, &o.SortOrder); err != nil {
			return nil, err
		}
		o.CategoryLabel = categoryLabels[o.CategoryCode]
		if o.CategoryLabel == "" {
			o.CategoryLabel = o.CategoryCode
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *pgStore) FabricCodeExists(ctx context.Context, code string) (bool, error) {
	code = strings.ToLower(strings.TrimSpace(code))
	if code == "" {
		return false, nil
	}
	var exists bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fabrics WHERE LOWER(code) = $1)`, code).Scan(&exists)
	return exists, err
}

func (s *pgStore) FavoriteSet(ctx context.Context, userID string) (map[string]struct{}, error) {
	rows, err := s.pool.Query(ctx, `SELECT fabric_id::text FROM fabric_favorites WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	set := make(map[string]struct{})
	for rows.Next() {
		var fabricID string
		if err := rows.Scan(&fabricID); err != nil {
			return nil, err
		}
		set[fabricID] = struct{}{}
	}
	return set, rows.Err()
}

func (s *pgStore) ToggleFavorite(ctx context.Context, userID, fabricID string) (bool, bool, error) {
	var fabricExists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fabrics WHERE fabric_id = $1)`, fabricID).Scan(&fabricExists); err != nil {
		return false, false, err
	}
	if !fabricExists {
		return false, false, nil
	}

	var favExists bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM fabric_favorites WHERE user_id = $1 AND fabric_id = $2)`,
		userID, fabricID).Scan(&favExists); err != nil {
		return false, false, err
	}

	if favExists {
		_, err := s.pool.Exec(ctx, `DELETE FROM fabric_favorites WHERE user_id = $1 AND fabric_id = $2`, userID, fabricID)
		return true, false, err
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO fabric_favorites (user_id, fabric_id) VALUES ($1, $2)`, userID, fabricID)
	return true, true, err
}

func (s *pgStore) RecordVisit(ctx context.Context, ip, userAgent, page string, now time.Time) (bool, error) {
	if page == "" {
		page = "fabric_preview"
	}
	var recent bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM visitor_logs
			WHERE ip_address = $1 AND user_agent = $2 AND page = $3
			  AND visited_at > $4
		)`, ip, userAgent, page, now.Add(-visitDedupTTL)).Scan(&recent)
	if err != nil {
		return false, err
	}
	if recent {
		return false, nil
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO visitor_logs (ip_address, user_agent, page, visited_at)
		VALUES ($1, $2, $3, $4)`, ip, userAgent, page, now)
	return err == nil, err
}

func (s *pgStore) VisitorStats(ctx context.Context, now time.Time) (VisitorStats, error) {
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var stats VisitorStats
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM visitor_logs`).Scan(&stats.TotalVisitors)
	if err != nil {
		return stats, err
	}
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM visitor_logs WHERE visited_at >= $1`, startOfDay).Scan(&stats.TodayVisitors)
	if err != nil {
		return stats, err
	}
	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT ip_address) FROM visitor_logs WHERE visited_at >= $1`, startOfDay).
		Scan(&stats.UniqueVisitorsToday)
	if err != nil {
		return stats, err
	}
	err = s.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT ip_address) FROM visitor_logs`).Scan(&stats.TotalUniqueVisitors)
	return stats, err
}
