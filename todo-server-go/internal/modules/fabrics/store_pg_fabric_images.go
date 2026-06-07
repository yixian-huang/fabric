package fabrics

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"todo-server-go/internal/http/media"
)

func normalizeVendorID(id *string) *string {
	if id == nil {
		return nil
	}
	s := strings.TrimSpace(*id)
	if s == "" {
		return nil
	}
	return &s
}

func (s *pgStore) attachFabricAdminMeta(ctx context.Context, f *Fabric) {
	if f == nil {
		return
	}
	if f.VendorID != nil && strings.TrimSpace(*f.VendorID) != "" {
		var name string
		err := s.pool.QueryRow(ctx, `SELECT name FROM vendors WHERE vendor_id = $1`, *f.VendorID).Scan(&name)
		if err == nil {
			f.VendorName = name
		}
	}
	images, err := s.loadExtraImages(ctx, f.FabricID)
	if err == nil {
		f.ExtraImages = images
	}
}

func (s *pgStore) loadExtraImages(ctx context.Context, fabricID string) ([]FabricImage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT fi.file_id::text, fi.sort_order
		FROM fabric_images fi
		WHERE fi.fabric_id = $1
		ORDER BY fi.sort_order, fi.created_at`, fabricID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]FabricImage, 0)
	for rows.Next() {
		var img FabricImage
		if err := rows.Scan(&img.FileID, &img.SortOrder); err != nil {
			return nil, err
		}
		img.URL = media.FileDownloadURL(img.FileID)
		out = append(out, img)
	}
	return out, rows.Err()
}

func replaceExtraImages(ctx context.Context, tx pgx.Tx, fabricID string, fileIDs []string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM fabric_images WHERE fabric_id = $1`, fabricID); err != nil {
		return err
	}
	for i, raw := range fileIDs {
		fileID := strings.TrimSpace(raw)
		if fileID == "" {
			continue
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO fabric_images (id, fabric_id, file_id, sort_order)
			VALUES ($1, $2, $3, $4)`,
			uuid.NewString(), fabricID, fileID, i)
		if err != nil {
			return err
		}
	}
	return nil
}
