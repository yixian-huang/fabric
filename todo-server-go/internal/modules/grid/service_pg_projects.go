package grid

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrProjectNotFound = errors.New("project not found")

func (s *PGService) ListProjects(userID string) ([]ProjectSummary, error) {
	ctx := context.Background()
	rows, err := s.pool.Query(ctx, `
		SELECT project_id::text, name, description, user_id::text, is_archived, is_public, created_at, updated_at
		FROM grid_projects
		WHERE user_id = $1
		ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ProjectSummary, 0)
	for rows.Next() {
		var p ProjectSummary
		if err := rows.Scan(&p.ProjectID, &p.Name, &p.Description, &p.Creator,
			&p.IsArchived, &p.IsPublic, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *PGService) CreateProject(userID, name, description string) (ProjectSummary, error) {
	if strings.TrimSpace(name) == "" {
		return ProjectSummary{}, fmt.Errorf("name is required")
	}
	projectID := uuid.NewString()
	ctx := context.Background()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ProjectSummary{}, err
	}
	defer tx.Rollback(ctx)

	var summary ProjectSummary
	err = tx.QueryRow(ctx, `
		INSERT INTO grid_projects (project_id, user_id, name, description)
		VALUES ($1, $2, $3, $4)
		RETURNING project_id::text, name, description, user_id::text, is_archived, is_public, created_at, updated_at`,
		projectID, userID, name, description).
		Scan(&summary.ProjectID, &summary.Name, &summary.Description, &summary.Creator,
			&summary.IsArchived, &summary.IsPublic, &summary.CreatedAt, &summary.UpdatedAt)
	if err != nil {
		return ProjectSummary{}, err
	}

	if err := insertDefaultColumns(ctx, tx, projectID, defaultGridColumns); err != nil {
		return ProjectSummary{}, err
	}
	if err := insertDefaultRow(ctx, tx, projectID, 0); err != nil {
		return ProjectSummary{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ProjectSummary{}, err
	}
	return summary, nil
}

func (s *PGService) UpdateProject(userID, projectID string, patch UpdateProjectRequest) (ProjectSummary, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return ProjectSummary{}, err
	}

	var summary ProjectSummary
	err := s.pool.QueryRow(ctx, `
		SELECT project_id::text, name, description, user_id::text, is_archived, is_public, created_at, updated_at
		FROM grid_projects WHERE project_id = $1`, projectID).
		Scan(&summary.ProjectID, &summary.Name, &summary.Description, &summary.Creator,
			&summary.IsArchived, &summary.IsPublic, &summary.CreatedAt, &summary.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ProjectSummary{}, ErrProjectNotFound
	}
	if err != nil {
		return ProjectSummary{}, err
	}

	if patch.Name != nil {
		summary.Name = strings.TrimSpace(*patch.Name)
		if summary.Name == "" {
			return ProjectSummary{}, fmt.Errorf("name is required")
		}
	}
	if patch.Description != nil {
		summary.Description = strings.TrimSpace(*patch.Description)
	}
	if patch.IsArchived != nil {
		summary.IsArchived = *patch.IsArchived
	}
	if patch.IsPublic != nil {
		summary.IsPublic = *patch.IsPublic
	}

	err = s.pool.QueryRow(ctx, `
		UPDATE grid_projects SET
			name = $2, description = $3, is_archived = $4, is_public = $5, updated_at = NOW()
		WHERE project_id = $1
		RETURNING created_at, updated_at`,
		projectID, summary.Name, summary.Description, summary.IsArchived, summary.IsPublic).
		Scan(&summary.CreatedAt, &summary.UpdatedAt)
	if err != nil {
		return ProjectSummary{}, err
	}
	return summary, nil
}

func (s *PGService) DeleteProject(userID, projectID string) error {
	ctx := context.Background()
	tag, err := s.pool.Exec(ctx, `
		DELETE FROM grid_projects WHERE project_id = $1 AND user_id = $2`, projectID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrProjectNotFound
	}
	return nil
}

func (s *PGService) GetOrCreateTodoProject(userID string) (ProjectDetail, error) {
	ctx := context.Background()
	var todoID string
	err := s.pool.QueryRow(ctx, `
		SELECT value FROM user_configs WHERE user_id = $1 AND key = $2`, userID, userConfigKeyTodoID).Scan(&todoID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return ProjectDetail{}, err
	}
	if todoID != "" {
		if detail, err := s.loadProjectDetail(ctx, todoID); err == nil {
			return detail, nil
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ProjectDetail{}, err
	}
	defer tx.Rollback(ctx)

	projectID := uuid.NewString()
	var detail ProjectDetail
	err = tx.QueryRow(ctx, `
		INSERT INTO grid_projects (project_id, user_id, name, description)
		VALUES ($1, $2, '待办事项', '默认的待办事项管理项目')
		RETURNING project_id::text, name, description, user_id::text, is_archived, is_public, created_at, updated_at`,
		projectID, userID).
		Scan(&detail.ProjectID, &detail.Name, &detail.Description, &detail.Creator,
			&detail.IsArchived, &detail.IsPublic, &detail.CreatedAt, &detail.UpdatedAt)
	if err != nil {
		return ProjectDetail{}, err
	}

	if err := insertDefaultColumns(ctx, tx, projectID, defaultTodoColumns); err != nil {
		return ProjectDetail{}, err
	}
	if err := insertDefaultRow(ctx, tx, projectID, 0); err != nil {
		return ProjectDetail{}, err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_configs (user_id, key, value, description)
		VALUES ($1, $2, $3, '待办事项项目ID')
		ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
		userID, userConfigKeyTodoID, projectID)
	if err != nil {
		return ProjectDetail{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ProjectDetail{}, err
	}

	columns, err := s.loadColumns(ctx, projectID)
	if err != nil {
		return ProjectDetail{}, err
	}
	rows, err := s.loadRows(ctx, projectID, false, columns)
	if err != nil {
		return ProjectDetail{}, err
	}
	detail.Columns = columns
	detail.Rows = rows
	detail.BaseURL = s.baseURL
	return detail, nil
}

func (s *PGService) CreateRow(userID, projectID string) (RowDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return RowDTO{}, err
	}
	var maxIndex *int
	err := s.pool.QueryRow(ctx, `
		SELECT MAX(row_index) FROM grid_rows WHERE project_id = $1`, projectID).Scan(&maxIndex)
	if err != nil {
		return RowDTO{}, err
	}
	newIndex := 0
	if maxIndex != nil {
		newIndex = *maxIndex + 1
	}

	rowID := uuid.NewString()
	var row RowDTO
	err = s.pool.QueryRow(ctx, `
		INSERT INTO grid_rows (row_id, project_id, row_index, hidden)
		VALUES ($1, $2, $3, false)
		RETURNING row_id::text, row_index, hidden, created_at, updated_at`,
		rowID, projectID, newIndex).
		Scan(&row.RowID, &row.RowIndex, &row.Hidden, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		return RowDTO{}, err
	}
	row.Project = projectID

	columns, err := s.loadColumns(ctx, projectID)
	if err != nil {
		return RowDTO{}, err
	}
	row.Cells = assembleCells(projectID, row.RowID, columns, nil)
	return row, nil
}

func (s *PGService) DeleteRow(userID, rowID string) error {
	ctx := context.Background()
	projectID, err := s.projectIDByRow(ctx, rowID)
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

	var rowIndex int
	err = tx.QueryRow(ctx, `
		DELETE FROM grid_rows WHERE row_id = $1
		RETURNING row_index`, rowID).Scan(&rowIndex)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrProjectNotFound
	}
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE grid_rows SET row_index = row_index - 1
		WHERE project_id = $1 AND row_index > $2`, projectID, rowIndex)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PGService) ToggleRowsHidden(userID string, rowIDs []string, hidden bool) (int, error) {
	if len(rowIDs) == 0 {
		return 0, fmt.Errorf("row_ids is required")
	}
	ctx := context.Background()
	projectID, err := s.projectIDByRow(ctx, rowIDs[0])
	if err != nil {
		return 0, err
	}
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return 0, err
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE grid_rows SET hidden = $1, updated_at = NOW()
		WHERE row_id = ANY($2::uuid[])`, hidden, rowIDs)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *PGService) UpdateColumn(userID, columnID string, patch UpdateColumnRequest) (ColumnDTO, error) {
	ctx := context.Background()

	var existing ColumnDTO
	var style, rule *string
	err := s.pool.QueryRow(ctx, `
		SELECT column_id::text, project_id::text, title, width, type, column_index, style, rule, created_at, updated_at
		FROM grid_columns WHERE column_id = $1`, columnID).
		Scan(&existing.ColumnID, &existing.Project, &existing.Title, &existing.Width, &existing.Type,
			&existing.ColumnIndex, &style, &rule, &existing.CreatedAt, &existing.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ColumnDTO{}, ErrColumnNotFound
	}
	if err != nil {
		return ColumnDTO{}, err
	}
	if err := s.assertProjectOwner(ctx, existing.Project, userID); err != nil {
		return ColumnDTO{}, err
	}

	if patch.Title != nil {
		existing.Title = *patch.Title
	}
	if patch.Width != nil {
		existing.Width = *patch.Width
	}
	if patch.Type != nil {
		existing.Type = *patch.Type
	}
	if patch.ColumnIndex != nil {
		existing.ColumnIndex = *patch.ColumnIndex
	}
	if patch.Style != nil {
		s := *patch.Style
		style = &s
		existing.Style = s
		existing.StyleData = parseJSONMap(s)
	}
	if patch.Rule != nil {
		r := *patch.Rule
		rule = &r
		existing.Rule = r
		existing.RuleData = parseJSONMap(r)
	}
	if patch.StyleData != nil {
		b, err := json.Marshal(patch.StyleData)
		if err != nil {
			return ColumnDTO{}, err
		}
		s := string(b)
		style = &s
		existing.Style = s
		existing.StyleData = patch.StyleData
	}
	if patch.RuleData != nil {
		b, err := json.Marshal(patch.RuleData)
		if err != nil {
			return ColumnDTO{}, err
		}
		r := string(b)
		rule = &r
		existing.Rule = r
		existing.RuleData = patch.RuleData
	}

	styleVal := "{}"
	if style != nil {
		styleVal = *style
	}
	ruleVal := "{}"
	if rule != nil {
		ruleVal = *rule
	}

	err = s.pool.QueryRow(ctx, `
		UPDATE grid_columns SET
			title = $2, width = $3, type = $4, column_index = $5, style = $6, rule = $7, updated_at = NOW()
		WHERE column_id = $1
		RETURNING created_at, updated_at`,
		columnID, existing.Title, existing.Width, existing.Type, existing.ColumnIndex, styleVal, ruleVal).
		Scan(&existing.CreatedAt, &existing.UpdatedAt)
	if err != nil {
		return ColumnDTO{}, err
	}
	return existing, nil
}

func insertDefaultColumns(ctx context.Context, tx pgx.Tx, projectID string, cols []defaultColumn) error {
	for i, col := range cols {
		columnID := uuid.NewString()
		_, err := tx.Exec(ctx, `
			INSERT INTO grid_columns (column_id, project_id, title, width, type, column_index, style, rule)
			VALUES ($1, $2, $3, $4, $5, $6, '{}', '{}')`,
			columnID, projectID, col.Title, col.Width, col.Type, i)
		if err != nil {
			return err
		}
	}
	return nil
}

func insertDefaultRow(ctx context.Context, tx pgx.Tx, projectID string, rowIndex int) error {
	rowID := uuid.NewString()
	_, err := tx.Exec(ctx, `
		INSERT INTO grid_rows (row_id, project_id, row_index, hidden)
		VALUES ($1, $2, $3, false)`, rowID, projectID, rowIndex)
	return err
}
