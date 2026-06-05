package fabrics

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var ErrOptionNotFound = errors.New("option not found")

type OptionInput struct {
	CategoryCode string `json:"category_code"`
	OptionName   string `json:"option_name"`
	SortOrder    int    `json:"sort_order"`
}

type optionInputPayload struct {
	CategoryCode string `json:"category_code"`
	OptionName   string `json:"option_name"`
	SortOrder    int    `json:"sort_order"`
	CategoryCodePascal string `json:"CategoryCode"`
	OptionNamePascal   string `json:"OptionName"`
	SortOrderPascal    int    `json:"SortOrder"`
}

func (p optionInputPayload) normalize() OptionInput {
	cat := strings.TrimSpace(p.CategoryCode)
	if cat == "" {
		cat = strings.TrimSpace(p.CategoryCodePascal)
	}
	name := strings.TrimSpace(p.OptionName)
	if name == "" {
		name = strings.TrimSpace(p.OptionNamePascal)
	}
	sort := p.SortOrder
	if sort == 0 && p.SortOrderPascal != 0 {
		sort = p.SortOrderPascal
	}
	return OptionInput{
		CategoryCode: normalizeOptionCategoryCode(cat),
		OptionName:   name,
		SortOrder:    sort,
	}
}

// normalizeOptionCategoryCode maps legacy Django category codes to Go storage codes.
func normalizeOptionCategoryCode(raw string) string {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "COMPONENT":
		return "component"
	case "CRAFT":
		return "process"
	case "FABRIC_STYLE":
		return "style"
	default:
		return strings.TrimSpace(raw)
	}
}

func (s *pgStore) CreateOption(ctx context.Context, in OptionInput) (Option, error) {
	category := strings.TrimSpace(in.CategoryCode)
	name := strings.TrimSpace(in.OptionName)
	if category == "" || name == "" {
		return Option{}, fmt.Errorf("category_code and option_name are required")
	}

	optionCode, err := s.nextOptionCode(ctx, category)
	if err != nil {
		return Option{}, err
	}

	optionID := uuid.NewString()
	var o Option
	err = s.pool.QueryRow(ctx, `
		INSERT INTO options (option_id, category_code, option_code, option_name, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING option_id::text, category_code, option_code, option_name, sort_order`,
		optionID, category, optionCode, name, in.SortOrder).
		Scan(&o.OptionID, &o.CategoryCode, &o.OptionCode, &o.OptionName, &o.SortOrder)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Option{}, fmt.Errorf("option code conflict")
		}
		return Option{}, err
	}
	o.CategoryLabel = categoryLabels[o.CategoryCode]
	if o.CategoryLabel == "" {
		o.CategoryLabel = o.CategoryCode
	}
	return o, nil
}

func (s *pgStore) UpdateOption(ctx context.Context, optionID string, name *string, sortOrder *int) (Option, error) {
	var o Option
	err := s.pool.QueryRow(ctx, `
		SELECT option_id::text, category_code, option_code, option_name, sort_order
		FROM options WHERE option_id = $1`, optionID).
		Scan(&o.OptionID, &o.CategoryCode, &o.OptionCode, &o.OptionName, &o.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return Option{}, ErrOptionNotFound
	}
	if err != nil {
		return Option{}, err
	}
	if name != nil {
		o.OptionName = strings.TrimSpace(*name)
	}
	if sortOrder != nil {
		o.SortOrder = *sortOrder
	}
	err = s.pool.QueryRow(ctx, `
		UPDATE options SET option_name = $2, sort_order = $3, updated_at = NOW()
		WHERE option_id = $1
		RETURNING option_id::text, category_code, option_code, option_name, sort_order`,
		optionID, o.OptionName, o.SortOrder).
		Scan(&o.OptionID, &o.CategoryCode, &o.OptionCode, &o.OptionName, &o.SortOrder)
	if err != nil {
		return Option{}, err
	}
	o.CategoryLabel = categoryLabels[o.CategoryCode]
	if o.CategoryLabel == "" {
		o.CategoryLabel = o.CategoryCode
	}
	return o, nil
}

func (s *pgStore) DeleteOption(ctx context.Context, optionID string) error {
	var optionCode string
	err := s.pool.QueryRow(ctx, `SELECT option_code FROM options WHERE option_id = $1`, optionID).Scan(&optionCode)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrOptionNotFound
	}
	if err != nil {
		return err
	}

	var used int
	err = s.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM fabrics WHERE style_codes @> to_jsonb(ARRAY[$1]::text[])) +
			(SELECT COUNT(*) FROM fabrics WHERE process_codes @> to_jsonb(ARRAY[$1]::text[])) +
			(SELECT COUNT(*) FROM fabric_components WHERE option_code = $1)`,
		optionCode).Scan(&used)
	if err != nil {
		return err
	}
	if used > 0 {
		return fmt.Errorf("选项已被使用，无法删除")
	}

	tag, err := s.pool.Exec(ctx, `DELETE FROM options WHERE option_id = $1`, optionID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrOptionNotFound
	}
	return nil
}

func (s *pgStore) nextOptionCode(ctx context.Context, category string) (string, error) {
	var latest *string
	err := s.pool.QueryRow(ctx, `
		SELECT option_code FROM options
		WHERE category_code = $1
		ORDER BY option_code DESC LIMIT 1`, category).Scan(&latest)
	if errors.Is(err, pgx.ErrNoRows) || latest == nil {
		return category + "001", nil
	}
	if err != nil {
		return "", err
	}
	prefix := strings.TrimRightFunc(*latest, func(r rune) bool { return unicode.IsDigit(r) })
	numPart := strings.TrimPrefix(*latest, prefix)
	if numPart == "" {
		return category + "001", nil
	}
	var n int
	if _, e := fmt.Sscanf(numPart, "%d", &n); e != nil {
		return category + "001", nil
	}
	return fmt.Sprintf("%s%03d", prefix, n+1), nil
}
