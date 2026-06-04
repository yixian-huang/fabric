package fabrics

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgVendorRepo struct {
	pool *pgxpool.Pool
}

func newPGVendorRepo(pool *pgxpool.Pool) *pgVendorRepo {
	return &pgVendorRepo{pool: pool}
}

func (r *pgVendorRepo) List(ctx context.Context) ([]Vendor, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT vendor_id, name, contact_person, contact_info, address, created_at, updated_at
		FROM vendors ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Vendor, 0)
	for rows.Next() {
		var v Vendor
		if err := rows.Scan(&v.VendorID, &v.Name, &v.Contact, &v.Phone, &v.Address, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *pgVendorRepo) Create(ctx context.Context, v Vendor) (Vendor, error) {
	if v.VendorID == "" {
		v.VendorID = uuid.NewString()
	}
	contact := v.Contact
	if v.Phone != "" {
		contact = v.Phone
	}
	name := strings.ToUpper(strings.TrimSpace(v.Name))
	err := r.pool.QueryRow(ctx, `
		INSERT INTO vendors (vendor_id, name, contact_person, contact_info, address)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at`,
		v.VendorID, name, v.Contact, contact, v.Address).Scan(&v.CreatedAt, &v.UpdatedAt)
	v.Name = name
	return v, err
}

func (r *pgVendorRepo) Get(ctx context.Context, vendorID string) (Vendor, error) {
	var v Vendor
	err := r.pool.QueryRow(ctx, `
		SELECT vendor_id, name, contact_person, contact_info, address, created_at, updated_at
		FROM vendors WHERE vendor_id = $1`, vendorID).
		Scan(&v.VendorID, &v.Name, &v.Contact, &v.Phone, &v.Address, &v.CreatedAt, &v.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Vendor{}, errNotFound
	}
	return v, err
}

func (r *pgVendorRepo) Update(ctx context.Context, vendorID string, v Vendor) (Vendor, error) {
	contactInfo := v.Phone
	if contactInfo == "" {
		contactInfo = v.Contact
	}
	name := strings.ToUpper(strings.TrimSpace(v.Name))
	err := r.pool.QueryRow(ctx, `
		UPDATE vendors SET
			name = $2, contact_person = $3, contact_info = $4, address = $5, updated_at = NOW()
		WHERE vendor_id = $1
		RETURNING vendor_id, name, contact_person, contact_info, address, created_at, updated_at`,
		vendorID, name, strings.TrimSpace(v.Contact), contactInfo, strings.TrimSpace(v.Address)).
		Scan(&v.VendorID, &v.Name, &v.Contact, &v.Phone, &v.Address, &v.CreatedAt, &v.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Vendor{}, errNotFound
	}
	return v, err
}

func (r *pgVendorRepo) Delete(ctx context.Context, vendorID string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM vendors WHERE vendor_id = $1`, vendorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

var errNotFound = errors.New("not found")
