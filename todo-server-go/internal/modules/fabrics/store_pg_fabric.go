package fabrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrFabricNotFound      = errors.New("fabric not found")
	ErrFabricCodeDuplicate = errors.New("fabric code already exists")
)

type FabricInput struct {
	Code          string
	MerchantCode  string
	ReferenceCode string
	ImageFileID   *string
	Weight        *float64
	WeightUnit    string
	FabricType    string
	StyleCodes    []string
	ProcessCodes  []string
	Remark        string
	Width         string
	YarnCount     string
	Density       string
	Components    []Component
}

func (s *pgStore) GetFabricByReferenceCode(ctx context.Context, referenceCode string) (Fabric, error) {
	referenceCode = strings.TrimSpace(referenceCode)
	if referenceCode == "" {
		return Fabric{}, ErrFabricNotFound
	}
	row := s.pool.QueryRow(ctx, `
		SELECT fabric_id::text, code, COALESCE(reference_code, ''), merchant_code,
		       COALESCE(weight, 0), weight_unit, fabric_type, style_codes, process_codes,
		       remark, width, yarn_count, density, created_at, main_image_id::text
		FROM fabrics WHERE reference_code = $1`, referenceCode)

	f, err := scanFabric(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Fabric{}, ErrFabricNotFound
	}
	if err != nil {
		return Fabric{}, err
	}
	components, err := s.loadComponents(ctx, []string{f.FabricID})
	if err != nil {
		return Fabric{}, err
	}
	f.Components = components[f.FabricID]
	attachImageURLs(&f)
	return f, nil
}

func (s *pgStore) ListPublicReferenceCodes(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT reference_code FROM fabrics
		WHERE reference_code IS NOT NULL AND TRIM(reference_code) <> ''
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0)
	for rows.Next() {
		var ref string
		if err := rows.Scan(&ref); err != nil {
			return nil, err
		}
		out = append(out, ref)
	}
	return out, rows.Err()
}

func (s *pgStore) GetFabric(ctx context.Context, fabricID string) (Fabric, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT fabric_id::text, code, COALESCE(reference_code, ''), merchant_code,
		       COALESCE(weight, 0), weight_unit, fabric_type, style_codes, process_codes,
		       remark, width, yarn_count, density, created_at, main_image_id::text
		FROM fabrics WHERE fabric_id = $1`, fabricID)

	f, err := scanFabric(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Fabric{}, ErrFabricNotFound
	}
	if err != nil {
		return Fabric{}, err
	}
	components, err := s.loadComponents(ctx, []string{f.FabricID})
	if err != nil {
		return Fabric{}, err
	}
	f.Components = components[f.FabricID]
	attachImageURLs(&f)
	return f, nil
}

func (s *pgStore) CreateFabric(ctx context.Context, in FabricInput) (Fabric, error) {
	code := strings.TrimSpace(in.Code)
	if code == "" {
		return Fabric{}, fmt.Errorf("code is required")
	}
	refCode := strings.TrimSpace(in.ReferenceCode)
	if refCode == "" {
		var err error
		refCode, err = s.generateReferenceCode(ctx)
		if err != nil {
			return Fabric{}, err
		}
	}

	fabricID := uuid.NewString()
	styleJSON, _ := json.Marshal(nonNilSlice(in.StyleCodes))
	processJSON, _ := json.Marshal(nonNilSlice(in.ProcessCodes))
	weightUnit := in.WeightUnit
	if weightUnit == "" {
		weightUnit = "g/m2"
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Fabric{}, err
	}
	defer tx.Rollback(ctx)

	var weightVal *float64
	if in.Weight != nil {
		weightVal = in.Weight
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO fabrics (
			fabric_id, code, reference_code, merchant_code, main_image_id,
			weight, weight_unit, fabric_type, style_codes, process_codes, remark,
			width, yarn_count, density
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		fabricID, code, refCode, strings.TrimSpace(in.MerchantCode), in.ImageFileID,
		weightVal, weightUnit, strings.TrimSpace(in.FabricType), styleJSON, processJSON, strings.TrimSpace(in.Remark),
		strings.TrimSpace(in.Width), strings.TrimSpace(in.YarnCount), strings.TrimSpace(in.Density))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Fabric{}, ErrFabricCodeDuplicate
		}
		return Fabric{}, err
	}

	if err := replaceComponents(ctx, tx, fabricID, in.Components); err != nil {
		return Fabric{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Fabric{}, err
	}
	return s.GetFabric(ctx, fabricID)
}

func (s *pgStore) UpdateFabric(ctx context.Context, fabricID string, in FabricInput) (Fabric, error) {
	existing, err := s.GetFabric(ctx, fabricID)
	if err != nil {
		return Fabric{}, err
	}

	var oldImageID *string
	if err := s.pool.QueryRow(ctx, `SELECT main_image_id::text FROM fabrics WHERE fabric_id = $1`, fabricID).
		Scan(&oldImageID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Fabric{}, err
	}
	imageChanged := in.ImageFileID != nil && (oldImageID == nil || *oldImageID != *in.ImageFileID)

	code := existing.Code
	if strings.TrimSpace(in.Code) != "" {
		code = strings.TrimSpace(in.Code)
	}
	merchantCode := existing.MerchantCode
	if in.MerchantCode != "" {
		merchantCode = in.MerchantCode
	}
	fabricType := strconv.Itoa(existing.FabricType)
	if in.FabricType != "" {
		fabricType = in.FabricType
	}
	weightUnit := existing.WeightUnit
	if in.WeightUnit != "" {
		weightUnit = in.WeightUnit
	}
	styleCodes := existing.StyleCodes
	if in.StyleCodes != nil {
		styleCodes = in.StyleCodes
	}
	processCodes := existing.ProcessCodes
	if in.ProcessCodes != nil {
		processCodes = in.ProcessCodes
	}
	remark := in.Remark
	if remark == "" {
		remark = existing.Remark
	}

	styleJSON, _ := json.Marshal(nonNilSlice(styleCodes))
	processJSON, _ := json.Marshal(nonNilSlice(processCodes))

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Fabric{}, err
	}
	defer tx.Rollback(ctx)

	var weightVal *float64
	if in.Weight != nil {
		weightVal = in.Weight
	} else if existing.Weight > 0 {
		w := existing.Weight
		weightVal = &w
	}

	width := strings.TrimSpace(in.Width)
	yarnCount := strings.TrimSpace(in.YarnCount)
	density := strings.TrimSpace(in.Density)

	_, err = tx.Exec(ctx, `
		UPDATE fabrics SET
			code = $2, merchant_code = $3, main_image_id = COALESCE($4, main_image_id),
			weight = $5, weight_unit = $6, fabric_type = $7,
			style_codes = $8, process_codes = $9, remark = $10,
			width = $11, yarn_count = $12, density = $13, updated_at = NOW()
		WHERE fabric_id = $1`,
		fabricID, code, merchantCode, in.ImageFileID, weightVal, weightUnit, fabricType,
		styleJSON, processJSON, remark, width, yarnCount, density)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Fabric{}, ErrFabricCodeDuplicate
		}
		return Fabric{}, err
	}

	if in.Components != nil {
		if err := replaceComponents(ctx, tx, fabricID, in.Components); err != nil {
			return Fabric{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Fabric{}, err
	}
	if imageChanged && oldImageID != nil && *oldImageID != "" {
		_ = s.deleteImageByFileID(ctx, *oldImageID)
	}
	return s.GetFabric(ctx, fabricID)
}

func (s *pgStore) DeleteFabric(ctx context.Context, fabricID string) error {
	var imageID *string
	_ = s.pool.QueryRow(ctx, `SELECT main_image_id::text FROM fabrics WHERE fabric_id = $1`, fabricID).Scan(&imageID)

	tag, err := s.pool.Exec(ctx, `DELETE FROM fabrics WHERE fabric_id = $1`, fabricID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrFabricNotFound
	}
	if imageID != nil && *imageID != "" {
		_ = s.deleteImageByFileID(ctx, *imageID)
	}
	return nil
}

func (s *pgStore) deleteImageByFileID(ctx context.Context, fileID string) error {
	var objectName string
	err := s.pool.QueryRow(ctx, `SELECT object_name FROM images WHERE file_id = $1`, fileID).Scan(&objectName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if s.storage != nil && objectName != "" {
		_ = s.storage.DeleteObject(ctx, objectName)
	}
	_, err = s.pool.Exec(ctx, `DELETE FROM images WHERE file_id = $1`, fileID)
	return err
}

func (s *pgStore) generateReferenceCode(ctx context.Context) (string, error) {
	now := time.Now()
	prefix := now.Format("060102")
	var lastRef *string
	err := s.pool.QueryRow(ctx, `
		SELECT reference_code FROM fabrics
		WHERE reference_code LIKE $1 || '%'
		ORDER BY reference_code DESC LIMIT 1`, prefix).Scan(&lastRef)
	if errors.Is(err, pgx.ErrNoRows) {
		return prefix + "001", nil
	}
	if err != nil {
		return "", err
	}
	if lastRef == nil || len(*lastRef) < 3 {
		return prefix + "001", nil
	}
	seq := 1
	if n, e := fmt.Sscanf((*lastRef)[len(*lastRef)-3:], "%d", &seq); n == 1 && e == nil {
		seq++
	}
	return fmt.Sprintf("%s%03d", prefix, seq), nil
}

func replaceComponents(ctx context.Context, tx pgx.Tx, fabricID string, components []Component) error {
	if _, err := tx.Exec(ctx, `DELETE FROM fabric_components WHERE fabric_id = $1`, fabricID); err != nil {
		return err
	}
	for _, c := range components {
		_, err := tx.Exec(ctx, `
			INSERT INTO fabric_components (component_id, fabric_id, name, percentage, option_code)
			VALUES ($1, $2, $3, $4, $5)`,
			uuid.NewString(), fabricID, c.Name, c.Percentage, c.OptionCode)
		if err != nil {
			return err
		}
	}
	return nil
}

type fabricScanner interface {
	Scan(dest ...any) error
}

func scanFabric(row fabricScanner) (Fabric, error) {
	var f Fabric
	var styleRaw, processRaw []byte
	var fabricTypeRaw string
	var mainImageID *string
	if err := row.Scan(&f.FabricID, &f.Code, &f.ReferenceCode, &f.MerchantCode,
		&f.Weight, &f.WeightUnit, &fabricTypeRaw, &styleRaw, &processRaw,
		&f.Remark, &f.Width, &f.YarnCount, &f.Density, &f.CreatedAt, &mainImageID); err != nil {
		return Fabric{}, err
	}
	_ = json.Unmarshal(styleRaw, &f.StyleCodes)
	_ = json.Unmarshal(processRaw, &f.ProcessCodes)
	f.FabricType = parseFabricType(fabricTypeRaw)
	f.FabricTypeDisplay = fabricTypeLabel(f.FabricType)
	if mainImageID != nil && strings.TrimSpace(*mainImageID) != "" {
		id := strings.TrimSpace(*mainImageID)
		f.ImageFileID = &id
	}
	return f, nil
}

func nonNilSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
