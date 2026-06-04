package grid

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrColumnNotFound = errors.New("column not found")

func (s *PGService) CreateColumn(userID string, req CreateColumnRequest) (ColumnDTO, error) {
	projectID := strings.TrimSpace(req.ProjectID)
	if projectID == "" {
		return ColumnDTO{}, fmt.Errorf("缺少project_id参数")
	}
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return ColumnDTO{}, err
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "新列"
	}
	width := req.Width
	if width <= 0 {
		width = 100
	}
	colType := strings.TrimSpace(req.Type)
	if colType == "" {
		colType = "text"
	}

	var maxIndex int
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(column_index), -1) FROM grid_columns WHERE project_id = $1`, projectID).Scan(&maxIndex)
	if err != nil {
		return ColumnDTO{}, err
	}
	newIndex := maxIndex + 1
	columnID := uuid.NewString()

	var col ColumnDTO
	err = s.pool.QueryRow(ctx, `
		INSERT INTO grid_columns (column_id, project_id, title, width, type, column_index, style, rule)
		VALUES ($1, $2, $3, $4, $5, $6, '{}', '{}')
		RETURNING column_id::text, project_id::text, title, width, type, column_index, style, rule, created_at, updated_at`,
		columnID, projectID, title, width, colType, newIndex).
		Scan(&col.ColumnID, &col.Project, &col.Title, &col.Width, &col.Type,
			&col.ColumnIndex, &col.Style, &col.Rule, &col.CreatedAt, &col.UpdatedAt)
	if err != nil {
		return ColumnDTO{}, err
	}
	col.StyleData = parseJSONMap(col.Style)
	col.RuleData = parseJSONMap(col.Rule)
	return col, nil
}

func (s *PGService) DeleteColumn(userID, columnID string) error {
	ctx := context.Background()

	var projectID string
	var columnIndex int
	err := s.pool.QueryRow(ctx, `
		SELECT project_id::text, column_index FROM grid_columns WHERE column_id = $1`, columnID).
		Scan(&projectID, &columnIndex)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrColumnNotFound
	}
	if err != nil {
		return err
	}
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `DELETE FROM grid_columns WHERE column_id = $1`, columnID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrColumnNotFound
	}

	_, err = tx.Exec(ctx, `
		UPDATE grid_columns SET column_index = column_index - 1, updated_at = NOW()
		WHERE project_id = $1 AND column_index > $2`, projectID, columnIndex)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
