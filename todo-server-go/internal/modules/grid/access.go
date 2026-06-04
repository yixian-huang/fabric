package grid

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var ErrForbidden = errors.New("forbidden")

func (s *PGService) assertProjectOwner(ctx context.Context, projectID, userID string) error {
	if userID == "" {
		return ErrForbidden
	}
	var ownerID string
	err := s.pool.QueryRow(ctx, `SELECT user_id::text FROM grid_projects WHERE project_id = $1`, projectID).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrProjectNotFound
	}
	if err != nil {
		return err
	}
	if ownerID != userID {
		return ErrForbidden
	}
	return nil
}

func (s *PGService) projectIDByRow(ctx context.Context, rowID string) (string, error) {
	var projectID string
	err := s.pool.QueryRow(ctx, `SELECT project_id::text FROM grid_rows WHERE row_id = $1`, rowID).Scan(&projectID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrProjectNotFound
	}
	return projectID, err
}

func (s *PGService) projectIDByColumn(ctx context.Context, columnID string) (string, error) {
	var projectID string
	err := s.pool.QueryRow(ctx, `SELECT project_id::text FROM grid_columns WHERE column_id = $1`, columnID).Scan(&projectID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrProjectNotFound
	}
	return projectID, err
}
