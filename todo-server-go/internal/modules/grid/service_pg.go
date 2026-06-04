package grid

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PGService struct {
	pool    *pgxpool.Pool
	baseURL string
	storage fileStorage
}

type fileStorage interface {
	DeleteObject(ctx context.Context, objectName string) error
}

func NewPGService(pool *pgxpool.Pool, baseURL string, storage fileStorage) *PGService {
	return &PGService{pool: pool, baseURL: baseURL, storage: storage}
}

func (s *PGService) GetProjectDetail(userID, projectID string) (ProjectDetail, error) {
	detail, err := s.loadProjectDetail(context.Background(), projectID)
	if err != nil {
		return ProjectDetail{}, err
	}
	if userID != "" && detail.Creator != userID {
		return ProjectDetail{}, ErrForbidden
	}
	return detail, nil
}

func (s *PGService) loadProjectDetail(ctx context.Context, projectID string) (ProjectDetail, error) {
	var detail ProjectDetail
	err := s.pool.QueryRow(ctx, `
		SELECT project_id::text, name, description, user_id::text, is_archived, is_public, created_at, updated_at
		FROM grid_projects WHERE project_id = $1`, projectID).
		Scan(&detail.ProjectID, &detail.Name, &detail.Description, &detail.Creator,
			&detail.IsArchived, &detail.IsPublic, &detail.CreatedAt, &detail.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ProjectDetail{}, ErrProjectNotFound
	}
	if err != nil {
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

func (s *PGService) GetRows(userID, projectID string, hidden bool) ([]RowDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return nil, err
	}
	columns, err := s.loadColumns(ctx, projectID)
	if err != nil {
		return nil, err
	}
	rows, err := s.loadRows(ctx, projectID, hidden, columns)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *PGService) UpsertCell(userID string, req UpdateCellRequest) (CellDTO, error) {
	projectID := strings.TrimSpace(req.Project)
	rowID := strings.TrimSpace(req.Row)
	columnID := strings.TrimSpace(req.Column)
	if projectID == "" || rowID == "" || columnID == "" {
		return CellDTO{}, fmt.Errorf("project, row and column are required")
	}

	cellType := strings.TrimSpace(req.Type)
	if cellType == "" {
		cellType = "text"
	}
	style := "{}"
	if req.StyleData != nil {
		b, err := json.Marshal(req.StyleData)
		if err != nil {
			return CellDTO{}, err
		}
		style = string(b)
	}

	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return CellDTO{}, err
	}

	var colType, colRule string
	err := s.pool.QueryRow(ctx, `
		SELECT type, COALESCE(rule, '')
		FROM grid_columns
		WHERE project_id = $1 AND column_id = $2`, projectID, columnID).Scan(&colType, &colRule)
	if err != nil {
		return CellDTO{}, fmt.Errorf("column not found")
	}
	if cellType == "" {
		cellType = colType
	}
	if err := validateColumnRule(colType, colRule, req.Content); err != nil {
		return CellDTO{}, err
	}

	var oldContent, oldType string
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(content, ''), type FROM grid_cells
		WHERE project_id = $1 AND row_id = $2 AND column_id = $3`,
		projectID, rowID, columnID).Scan(&oldContent, &oldType)

	if err := s.cleanupRemovedFiles(ctx, oldContent, req.Content, oldType); err != nil {
		return CellDTO{}, err
	}

	cellID := uuid.NewString()
	var (
		outID      string
		content    string
		outStyle   *string
		outType    string
		createdAt  time.Time
		updatedAt  time.Time
	)
	err = s.pool.QueryRow(ctx, `
		INSERT INTO grid_cells (cell_id, project_id, row_id, column_id, content, style, type, version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
		ON CONFLICT (project_id, row_id, column_id) DO UPDATE SET
			content = EXCLUDED.content,
			style = EXCLUDED.style,
			type = EXCLUDED.type,
			version = grid_cells.version + 1,
			updated_at = NOW()
		RETURNING cell_id::text, content, style, type, created_at, updated_at`,
		cellID, projectID, rowID, columnID, req.Content, style, cellType).
		Scan(&outID, &content, &outStyle, &outType, &createdAt, &updatedAt)
	if err != nil {
		return CellDTO{}, err
	}

	styleStr := ""
	if outStyle != nil {
		styleStr = *outStyle
	}
	return cellDTOFromDB(outID, projectID, rowID, columnID, content, styleStr, outType, createdAt, updatedAt), nil
}

func (s *PGService) loadColumns(ctx context.Context, projectID string) ([]ColumnDTO, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT column_id::text, title, width, type, column_index, style, rule, created_at, updated_at
		FROM grid_columns
		WHERE project_id = $1
		ORDER BY column_index`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ColumnDTO, 0)
	for rows.Next() {
		var col ColumnDTO
		var style, rule *string
		if err := rows.Scan(&col.ColumnID, &col.Title, &col.Width, &col.Type, &col.ColumnIndex,
			&style, &rule, &col.CreatedAt, &col.UpdatedAt); err != nil {
			return nil, err
		}
		col.Project = projectID
		if style != nil {
			col.Style = *style
			col.StyleData = parseJSONMap(*style)
		}
		if rule != nil {
			col.Rule = *rule
			col.RuleData = parseJSONMap(*rule)
		}
		out = append(out, col)
	}
	return out, rows.Err()
}

func (s *PGService) loadRows(ctx context.Context, projectID string, hidden bool, columns []ColumnDTO) ([]RowDTO, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT row_id::text, row_index, hidden, created_at, updated_at
		FROM grid_rows
		WHERE project_id = $1 AND hidden = $2
		ORDER BY row_index`, projectID, hidden)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rowList := make([]RowDTO, 0)
	rowIDs := make([]string, 0)
	for rows.Next() {
		var row RowDTO
		if err := rows.Scan(&row.RowID, &row.RowIndex, &row.Hidden, &row.CreatedAt, &row.UpdatedAt); err != nil {
			return nil, err
		}
		row.Project = projectID
		row.Cells = make([]CellDTO, 0)
		rowList = append(rowList, row)
		rowIDs = append(rowIDs, row.RowID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(rowList) == 0 {
		return rowList, nil
	}

	cellsByRow, err := s.loadCellsByRows(ctx, projectID, rowIDs)
	if err != nil {
		return nil, err
	}

	for i := range rowList {
		existing := cellsByRow[rowList[i].RowID]
		rowList[i].Cells = assembleCells(projectID, rowList[i].RowID, columns, existing)
	}
	return rowList, nil
}

func (s *PGService) loadCellsByRows(ctx context.Context, projectID string, rowIDs []string) (map[string]map[string]CellDTO, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT cell_id::text, row_id::text, column_id::text, content, style, type, created_at, updated_at
		FROM grid_cells
		WHERE project_id = $1 AND row_id = ANY($2::uuid[])`, projectID, rowIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]map[string]CellDTO)
	for rows.Next() {
		var (
			cellID, rowID, columnID string
			content                 string
			style                   *string
			cellType                string
			createdAt, updatedAt    time.Time
		)
		if err := rows.Scan(&cellID, &rowID, &columnID, &content, &style, &cellType, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		styleStr := ""
		if style != nil {
			styleStr = *style
		}
		if out[rowID] == nil {
			out[rowID] = make(map[string]CellDTO)
		}
		out[rowID][columnID] = cellDTOFromDB(cellID, projectID, rowID, columnID, content, styleStr, cellType, createdAt, updatedAt)
	}
	return out, rows.Err()
}

func assembleCells(projectID, rowID string, columns []ColumnDTO, existing map[string]CellDTO) []CellDTO {
	cells := make([]CellDTO, 0, len(columns))
	for _, col := range columns {
		if cell, ok := existing[col.ColumnID]; ok {
			cells = append(cells, cell)
			continue
		}
		cells = append(cells, CellDTO{
			Row:     rowID,
			Column:  col.ColumnID,
			Content: "",
			Style:   "{}",
			Type:    col.Type,
		})
	}
	_ = projectID
	return cells
}

func cellDTOFromDB(cellID, projectID, rowID, columnID, content, style, cellType string, createdAt, updatedAt time.Time) CellDTO {
	id := cellID
	ca := createdAt
	ua := updatedAt
	return CellDTO{
		CellID:    &id,
		Project:   projectID,
		Row:       rowID,
		Column:    columnID,
		Content:   content,
		Style:     style,
		StyleData: parseJSONMap(style),
		Type:      cellType,
		CreatedAt: &ca,
		UpdatedAt: &ua,
	}
}

func parseJSONMap(raw string) map[string]interface{} {
	if strings.TrimSpace(raw) == "" {
		return map[string]interface{}{}
	}
	var out map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return map[string]interface{}{}
	}
	return out
}
