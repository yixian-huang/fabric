package grid

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func (s *PGService) ListVendorShares(userID, projectID string) ([]VendorShareDetailDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		SELECT vs.vendor_share_id, vs.shared_key, vs.shared_password, vs.project_id::text,
		       p.name, vs.vendor_id::text, v.name, vs.is_active, COALESCE(vs.row_ids, ''), vs.created_at, vs.updated_at
		FROM grid_vendor_share vs
		JOIN grid_projects p ON p.project_id = vs.project_id
		JOIN vendors v ON v.vendor_id = vs.vendor_id
		WHERE vs.project_id = $1
		ORDER BY vs.created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]VendorShareDetailDTO, 0)
	for rows.Next() {
		var item VendorShareDetailDTO
		var rowIDsRaw string
		if err := rows.Scan(&item.VendorShareID, &item.SharedKey, &item.SharedPassword, &item.Project,
			&item.ProjectName, &item.Vendor, &item.VendorName, &item.IsActive, &rowIDsRaw,
			&item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		if rowIDsRaw != "" {
			item.RowIDsList = parseRowIDs([]byte(rowIDsRaw))
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *PGService) CreateVendorShare(userID string, req CreateVendorShareRequest) (VendorShareDetailDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, req.Project, userID); err != nil {
		return VendorShareDetailDTO{}, err
	}
	item := VendorShareDetailDTO{
		VendorShareID:  randomShareCode(8),
		SharedKey:      randomShareCode(8),
		SharedPassword: randomSharePassword(4),
		Project:        req.Project,
		Vendor:         req.Vendor,
		IsActive:       true,
		RowIDsList:     req.RowIDsList,
	}
	rowIDsJSON := string(marshalRowIDs(req.RowIDsList))

	err := s.pool.QueryRow(ctx, `
		INSERT INTO grid_vendor_share (vendor_share_id, project_id, vendor_id, shared_key, shared_password, is_active, row_ids)
		VALUES ($1, $2, $3, $4, $5, true, $6)
		RETURNING created_at, updated_at`,
		item.VendorShareID, req.Project, req.Vendor, item.SharedKey, item.SharedPassword, rowIDsJSON).
		Scan(&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return VendorShareDetailDTO{}, err
	}

	_ = s.pool.QueryRow(ctx, `
		SELECT p.name, v.name FROM grid_projects p, vendors v
		WHERE p.project_id = $1 AND v.vendor_id = $2`, req.Project, req.Vendor).
		Scan(&item.ProjectName, &item.VendorName)
	return item, nil
}

func (s *PGService) DeleteVendorShare(userID, vendorShareID string) error {
	ctx := context.Background()
	var projectID string
	err := s.pool.QueryRow(ctx, `SELECT project_id::text FROM grid_vendor_share WHERE vendor_share_id = $1`, vendorShareID).Scan(&projectID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrSharedNotFound
	}
	if err != nil {
		return err
	}
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return err
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM grid_vendor_share WHERE vendor_share_id = $1`, vendorShareID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrSharedNotFound
	}
	return nil
}

func (s *PGService) GenerateVendorLinks(userID, projectID string) ([]VendorShareDetailDTO, error) {
	ctx := context.Background()
	if err := s.assertProjectOwner(ctx, projectID, userID); err != nil {
		return nil, err
	}
	vendorIDs := make(map[string]struct{})
	rows, err := s.pool.Query(ctx, `
		SELECT gc.content
		FROM grid_cells gc
		JOIN grid_rows gr ON gr.row_id = gc.row_id
		WHERE gc.project_id = $1 AND gr.hidden = false AND gc.type = 'vendor'`, projectID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var content string
		if err := rows.Scan(&content); err != nil {
			rows.Close()
			return nil, err
		}
		for _, v := range parseVendorList(content) {
			vendorIDs[v.ID] = struct{}{}
		}
	}
	rows.Close()

	existing, err := s.ListVendorShares(userID, projectID)
	if err != nil {
		return nil, err
	}
	existingSet := make(map[string]struct{}, len(existing))
	for _, e := range existing {
		existingSet[e.Vendor] = struct{}{}
	}

	for vendorID := range existingSet {
		if _, ok := vendorIDs[vendorID]; !ok {
			_, _ = s.pool.Exec(ctx, `DELETE FROM grid_vendor_share WHERE project_id = $1 AND vendor_id = $2`, projectID, vendorID)
		}
	}

	for vendorID := range vendorIDs {
		if _, ok := existingSet[vendorID]; ok {
			continue
		}
		_, err := s.CreateVendorShare(userID, CreateVendorShareRequest{Project: projectID, Vendor: vendorID})
		if err != nil {
			return nil, err
		}
	}
	return s.ListVendorShares(userID, projectID)
}

func (s *PGService) AccessVendorShareStandard(sharedKey, password string) (SharedAccessResponse, error) {
	ctx := context.Background()
	share, err := s.loadVendorShareByKey(ctx, sharedKey)
	if err != nil {
		return SharedAccessResponse{}, err
	}
	if share.SharedPassword != password {
		return SharedAccessResponse{}, ErrInvalidPassword
	}
	if !share.IsActive {
		return SharedAccessResponse{}, fmt.Errorf("共享链接已停用")
	}

	detail, err := s.loadProjectDetail(ctx, share.Project)
	if err != nil {
		return SharedAccessResponse{}, err
	}

	if len(share.RowIDsList) > 0 {
		allowed := make(map[string]struct{}, len(share.RowIDsList))
		for _, id := range share.RowIDsList {
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
	return SharedAccessResponse{Project: detail, Shared: share}, nil
}

func (s *PGService) AccessVendorShareByVendor(sharedKey, password string) (SharedAccessResponse, error) {
	ctx := context.Background()
	share, err := s.loadVendorShareByKey(ctx, sharedKey)
	if err != nil {
		share, err = s.loadVendorShareByVendorName(ctx, sharedKey)
		if err != nil {
			return SharedAccessResponse{}, err
		}
	}
	if share.SharedPassword != password {
		return SharedAccessResponse{}, ErrInvalidPassword
	}

	detail, err := s.loadProjectDetail(ctx, share.Project)
	if err != nil {
		return SharedAccessResponse{}, err
	}

	vendorID := share.Vendor
	filteredRows := make([]RowDTO, 0)
	for _, row := range detail.Rows {
		if row.Hidden {
			continue
		}
		if !rowHasVendor(row, vendorID) {
			continue
		}
		cells := make([]CellDTO, 0, len(row.Cells))
		for _, cell := range row.Cells {
			colRule := ""
			for _, col := range detail.Columns {
				if col.ColumnID == cell.Column {
					colRule = col.Rule
					break
				}
			}
			if columnRuleSelf(colRule) {
				continue
			}
			c := cell
			filterVendorContent(&c, vendorID)
			filterVendorRemark(&c, vendorID)
			cells = append(cells, c)
		}
		row.Cells = cells
		filteredRows = append(filteredRows, row)
	}
	detail.Rows = filteredRows

	filteredCols := make([]ColumnDTO, 0, len(detail.Columns))
	for _, col := range detail.Columns {
		if !columnRuleSelf(col.Rule) {
			filteredCols = append(filteredCols, col)
		}
	}
	detail.Columns = filteredCols
	return SharedAccessResponse{Project: detail, Shared: share}, nil
}

func (s *PGService) UpdateVendorShareRemark(req UpdateVendorRemarkRequest) error {
	ctx := context.Background()
	var projectID, storedPassword string
	err := s.pool.QueryRow(ctx, `
		SELECT project_id::text, shared_password FROM grid_vendor_share WHERE shared_key = $1`, req.SharedKey).
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

func (s *PGService) loadVendorShareByKey(ctx context.Context, sharedKey string) (VendorShareDetailDTO, error) {
	var item VendorShareDetailDTO
	var rowIDsRaw string
	err := s.pool.QueryRow(ctx, `
		SELECT vs.vendor_share_id, vs.shared_key, vs.shared_password, vs.project_id::text,
		       p.name, vs.vendor_id::text, v.name, vs.is_active, COALESCE(vs.row_ids, ''), vs.created_at, vs.updated_at
		FROM grid_vendor_share vs
		JOIN grid_projects p ON p.project_id = vs.project_id
		JOIN vendors v ON v.vendor_id = vs.vendor_id
		WHERE vs.shared_key = $1`, sharedKey).
		Scan(&item.VendorShareID, &item.SharedKey, &item.SharedPassword, &item.Project,
			&item.ProjectName, &item.Vendor, &item.VendorName, &item.IsActive, &rowIDsRaw,
			&item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return VendorShareDetailDTO{}, ErrSharedNotFound
	}
	if err != nil {
		return VendorShareDetailDTO{}, err
	}
	if rowIDsRaw != "" {
		item.RowIDsList = parseRowIDs([]byte(rowIDsRaw))
	}
	return item, nil
}

func (s *PGService) loadVendorShareByVendorName(ctx context.Context, name string) (VendorShareDetailDTO, error) {
	var item VendorShareDetailDTO
	var rowIDsRaw string
	err := s.pool.QueryRow(ctx, `
		SELECT vs.vendor_share_id, vs.shared_key, vs.shared_password, vs.project_id::text,
		       p.name, vs.vendor_id::text, v.name, vs.is_active, COALESCE(vs.row_ids, ''), vs.created_at, vs.updated_at
		FROM grid_vendor_share vs
		JOIN grid_projects p ON p.project_id = vs.project_id
		JOIN vendors v ON v.vendor_id = vs.vendor_id
		WHERE UPPER(v.name) = UPPER($1)`, name).
		Scan(&item.VendorShareID, &item.SharedKey, &item.SharedPassword, &item.Project,
			&item.ProjectName, &item.Vendor, &item.VendorName, &item.IsActive, &rowIDsRaw,
			&item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return VendorShareDetailDTO{}, ErrSharedNotFound
	}
	if err != nil {
		return VendorShareDetailDTO{}, err
	}
	if rowIDsRaw != "" {
		item.RowIDsList = parseRowIDs([]byte(rowIDsRaw))
	}
	return item, nil
}

func rowHasVendor(row RowDTO, vendorID string) bool {
	for _, cell := range row.Cells {
		if cell.Type != "vendor" {
			continue
		}
		for _, v := range parseVendorList(cell.Content) {
			if v.ID == vendorID {
				return true
			}
		}
	}
	return false
}
