package grid

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

var (
	ErrSharedNotFound  = errors.New("shared link not found")
	ErrInvalidPassword = errors.New("invalid password")
)

func (s *PGService) ListSharedLinks(userID, projectID string) ([]SharedLinkDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT s.shared_id, s.shared_key, s.password, s.project_id::text, p.name,
		       COALESCE(s.vender, ''), s.row_ids, s.created_at, s.updated_at
		FROM grid_shared s
		JOIN grid_projects p ON p.project_id = s.project_id
		WHERE s.project_id = $1
		ORDER BY s.created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]SharedLinkDTO, 0)
	for rows.Next() {
		var link SharedLinkDTO
		var rowIDsRaw []byte
		if err := rows.Scan(&link.SharedID, &link.SharedKey, &link.SharedPassword, &link.Project,
			&link.ProjectName, &link.Vender, &rowIDsRaw, &link.CreatedAt, &link.UpdatedAt); err != nil {
			return nil, err
		}
		link.RowIDsList = parseRowIDs(rowIDsRaw)
		out = append(out, link)
	}
	return out, rows.Err()
}

func (s *PGService) CreateSharedLinks(userID string, req CreateSharedRequest) ([]SharedLinkDTO, error) {
	if len(req.RowIDsList) == 0 {
		return nil, fmt.Errorf("请选择要分享的行")
	}
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, req.Project, userID); err != nil {
		return nil, err
	}

	type rowVendor struct {
		RowID   string
		Vendors []vendorRef
	}
	rows, err := s.pool.Query(ctx, `
		SELECT gc.row_id::text, gc.content
		FROM grid_cells gc
		JOIN grid_columns col ON col.column_id = gc.column_id
		WHERE gc.project_id = $1
		  AND gc.row_id = ANY($2::uuid[])
		  AND col.type = 'vendor'`, req.Project, req.RowIDsList)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vendorsByRow := make(map[string][]vendorRef)
	for rows.Next() {
		var rowID, content string
		if err := rows.Scan(&rowID, &content); err != nil {
			return nil, err
		}
		vendorsByRow[rowID] = append(vendorsByRow[rowID], parseVendorList(content)...)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	vendorRows := make(map[string][]string)
	vendorNames := make(map[string]string)
	for _, rowID := range req.RowIDsList {
		vendors := vendorsByRow[rowID]
		if len(vendors) == 0 {
			return nil, fmt.Errorf("行 %s 未设置供应商，无法创建共享链接", rowID)
		}
		seen := make(map[string]struct{})
		for _, v := range vendors {
			if _, ok := seen[v.ID]; ok {
				continue
			}
			seen[v.ID] = struct{}{}
			vendorRows[v.ID] = append(vendorRows[v.ID], rowID)
			vendorNames[v.ID] = v.Name
		}
	}

	var projectName string
	if err := s.pool.QueryRow(ctx, `SELECT name FROM grid_projects WHERE project_id = $1`, req.Project).Scan(&projectName); err != nil {
		return nil, ErrProjectNotFound
	}

	out := make([]SharedLinkDTO, 0, len(vendorRows))
	for vendorID, rowIDs := range vendorRows {
		link := SharedLinkDTO{
			SharedID:       randomShareCode(8),
			SharedKey:      randomShareCode(8),
			SharedPassword: randomSharePassword(4),
			Project:        req.Project,
			ProjectName:    projectName,
			Vender:         vendorNames[vendorID],
		}
		link.RowIDsList = rowIDs
		rowIDsJSON := marshalRowIDs(rowIDs)

		_, err := s.pool.Exec(ctx, `
			INSERT INTO grid_shared (shared_id, project_id, shared_key, password, row_ids, vender, vender_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			link.SharedID, req.Project, link.SharedKey, link.SharedPassword, rowIDsJSON, link.Vender, vendorID)
		if err != nil {
			return nil, err
		}
		out = append(out, link)
	}
	return out, nil
}

func (s *PGService) DeleteSharedLink(userID, sharedID string) error {
	ctx := context.Background()
	var projectID string
	err := s.pool.QueryRow(ctx, `SELECT project_id::text FROM grid_shared WHERE shared_id = $1`, sharedID).Scan(&projectID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSharedNotFound
	}
	if err != nil {
		return err
	}
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return err
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM grid_shared WHERE shared_id = $1`, sharedID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrSharedNotFound
	}
	return nil
}

func (s *PGService) AccessSharedLink(sharedID, sharedKey, password string) (SharedAccessResponse, error) {
	ctx := context.Background()
	var link SharedLinkDTO
	var rowIDsRaw []byte
	err := s.pool.QueryRow(ctx, `
		SELECT s.shared_id, s.shared_key, s.password, s.project_id::text, p.name,
		       COALESCE(s.vender, ''), s.row_ids, s.created_at, s.updated_at
		FROM grid_shared s
		JOIN grid_projects p ON p.project_id = s.project_id
		WHERE s.shared_id = $1 AND s.shared_key = $2`, sharedID, sharedKey).
		Scan(&link.SharedID, &link.SharedKey, &link.SharedPassword, &link.Project,
			&link.ProjectName, &link.Vender, &rowIDsRaw, &link.CreatedAt, &link.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return SharedAccessResponse{}, ErrSharedNotFound
	}
	if err != nil {
		return SharedAccessResponse{}, err
	}
	if link.SharedPassword != "" && link.SharedPassword != password {
		return SharedAccessResponse{}, ErrInvalidPassword
	}
	link.RowIDsList = parseRowIDs(rowIDsRaw)

	detail, err := s.loadProjectDetail(ctx, link.Project)
	if err != nil {
		return SharedAccessResponse{}, err
	}
	detail.BaseURL = s.baseURL

	if len(link.RowIDsList) > 0 {
		allowed := make(map[string]struct{}, len(link.RowIDsList))
		for _, id := range link.RowIDsList {
			allowed[id] = struct{}{}
		}
		filtered := make([]RowDTO, 0)
		for _, row := range detail.Rows {
			if _, ok := allowed[row.RowID]; ok {
				filtered = append(filtered, row)
			}
		}
		detail.Rows = filtered
	}

	return SharedAccessResponse{Project: detail, Shared: link}, nil
}

func (s *PGService) AccessSharedProject(sharedKey, password string) (SharedAccessResponse, error) {
	ctx := context.Background()
	var link SharedLinkDTO
	var vendorID string
	var rowIDsRaw []byte
	err := s.pool.QueryRow(ctx, `
		SELECT s.shared_id, s.shared_key, s.password, s.project_id::text, p.name,
		       COALESCE(s.vender, ''), COALESCE(s.vender_id, ''), s.row_ids, s.created_at, s.updated_at
		FROM grid_shared s
		JOIN grid_projects p ON p.project_id = s.project_id
		WHERE s.shared_key = $1`, sharedKey).
		Scan(&link.SharedID, &link.SharedKey, &link.SharedPassword, &link.Project,
			&link.ProjectName, &link.Vender, &vendorID, &rowIDsRaw, &link.CreatedAt, &link.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return SharedAccessResponse{}, ErrSharedNotFound
	}
	if err != nil {
		return SharedAccessResponse{}, err
	}
	if link.SharedPassword != password {
		return SharedAccessResponse{}, ErrInvalidPassword
	}
	link.RowIDsList = parseRowIDs(rowIDsRaw)

	detail, err := s.loadProjectDetail(ctx, link.Project)
	if err != nil {
		return SharedAccessResponse{}, err
	}
	detail.BaseURL = s.baseURL

	if len(link.RowIDsList) > 0 {
		allowed := make(map[string]struct{}, len(link.RowIDsList))
		for _, id := range link.RowIDsList {
			allowed[id] = struct{}{}
		}
		filtered := make([]RowDTO, 0)
		for _, row := range detail.Rows {
			if _, ok := allowed[row.RowID]; ok {
				filtered = append(filtered, row)
			}
		}
		detail.Rows = filtered
	}

	for i := range detail.Rows {
		for j := range detail.Rows[i].Cells {
			filterVendorContent(&detail.Rows[i].Cells[j], vendorID)
			filterVendorRemark(&detail.Rows[i].Cells[j], vendorID)
		}
	}

	return SharedAccessResponse{Project: detail, Shared: link}, nil
}

func (s *PGService) UpdateSharedVendorRemark(req UpdateVendorRemarkRequest) error {
	ctx := context.Background()
	var projectID, storedPassword string
	err := s.pool.QueryRow(ctx, `
		SELECT project_id::text, password FROM grid_shared WHERE shared_key = $1`, req.SharedKey).
		Scan(&projectID, &storedPassword)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSharedNotFound
	}
	if err != nil {
		return err
	}
	if storedPassword != req.Password {
		return ErrInvalidPassword
	}
	return s.updateVendorRemarkCell(ctx, projectID, req.Row, req.Column, req.VendorID, req.Content)
}

func (s *PGService) updateVendorRemarkCell(ctx context.Context, projectID, rowID, columnID, vendorID, content string) error {
	var cellContent string
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(content, '') FROM grid_cells
		WHERE project_id = $1 AND row_id = $2 AND column_id = $3`,
		projectID, rowID, columnID).Scan(&cellContent)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("cell not found")
	}
	if err != nil {
		return err
	}

	remarks := make([]map[string]interface{}, 0)
	if cellContent != "" {
		_ = json.Unmarshal([]byte(cellContent), &remarks)
	}
	updated := false
	for i := range remarks {
		if vid, _ := remarks[i]["vendorId"].(string); vid == vendorID {
			remarks[i]["content"] = content
			updated = true
			break
		}
	}
	if !updated {
		remarks = append(remarks, map[string]interface{}{"vendorId": vendorID, "content": content})
	}
	b, err := json.Marshal(remarks)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE grid_cells SET content = $4, updated_at = NOW()
		WHERE project_id = $1 AND row_id = $2 AND column_id = $3`,
		projectID, rowID, columnID, string(b))
	return err
}
