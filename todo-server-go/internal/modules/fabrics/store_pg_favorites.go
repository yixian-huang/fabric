package fabrics

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type FavoriteItem struct {
	FavoriteID string    `json:"favorite_id"`
	Fabric     Fabric    `json:"fabric"`
	CreatedAt  time.Time `json:"created_at"`
}

type FavoriteShareDTO struct {
	ShareID    string    `json:"share_id"`
	ShareToken string    `json:"share_token"`
	ShareURL   string    `json:"share_url,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}

type SharedFavoritesShareInfo struct {
	Username  string    `json:"username"`
	SharedAt  time.Time `json:"shared_at"`
	ViewCount int       `json:"view_count"`
}

type SharedFavoritesResult struct {
	ShareInfo SharedFavoritesShareInfo `json:"share_info"`
	Favorites []FavoriteItem           `json:"favorites"`
}

func (s *pgStore) ListFavorites(ctx context.Context, userID string) ([]FavoriteItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT f.favorite_id::text, f.fabric_id::text, f.created_at
		FROM fabric_favorites f
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]FavoriteItem, 0)
	fabricIDs := make([]string, 0)
	meta := make([]FavoriteItem, 0)
	for rows.Next() {
		var item FavoriteItem
		var fabricID string
		if err := rows.Scan(&item.FavoriteID, &fabricID, &item.CreatedAt); err != nil {
			return nil, err
		}
		fabricIDs = append(fabricIDs, fabricID)
		meta = append(meta, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(fabricIDs) == 0 {
		return items, nil
	}

	fabricMap := make(map[string]Fabric, len(fabricIDs))
	for _, id := range fabricIDs {
		f, err := s.GetFabric(ctx, id)
		if err != nil {
			continue
		}
		f.IsFavorited = true
		fabricMap[id] = f
	}
	for i, item := range meta {
		if f, ok := fabricMap[fabricIDs[i]]; ok {
			item.Fabric = f
			items = append(items, item)
		}
	}
	return items, nil
}

func (s *pgStore) GetOrCreateFavoriteShare(ctx context.Context, userID string) (FavoriteShareDTO, error) {
	var share FavoriteShareDTO
	err := s.pool.QueryRow(ctx, `
		SELECT share_id::text, share_token, created_at, expires_at
		FROM favorite_shares
		WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 1`, userID).
		Scan(&share.ShareID, &share.ShareToken, &share.CreatedAt, &share.ExpiresAt)
	if err == nil {
		return share, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return FavoriteShareDTO{}, err
	}

	token, err := randomShareToken()
	if err != nil {
		return FavoriteShareDTO{}, err
	}
	shareID := uuid.NewString()
	err = s.pool.QueryRow(ctx, `
		INSERT INTO favorite_shares (share_id, user_id, share_token)
		VALUES ($1, $2, $3)
		RETURNING share_id::text, share_token, created_at, expires_at`,
		shareID, userID, token).
		Scan(&share.ShareID, &share.ShareToken, &share.CreatedAt, &share.ExpiresAt)
	return share, err
}

func (s *pgStore) ListSharedFavorites(ctx context.Context, token string) (SharedFavoritesResult, error) {
	var result SharedFavoritesResult
	var userID, shareID string
	var expiresAt *time.Time

	err := s.pool.QueryRow(ctx, `
		SELECT fs.share_id::text, fs.user_id::text, u.username, fs.created_at, fs.expires_at,
		       COALESCE(fs.view_count, 0)
		FROM favorite_shares fs
		JOIN users u ON u.user_id = fs.user_id
		WHERE fs.share_token = $1`, token).
		Scan(&shareID, &userID, &result.ShareInfo.Username, &result.ShareInfo.SharedAt, &expiresAt, &result.ShareInfo.ViewCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return SharedFavoritesResult{}, errors.New("share not found")
	}
	if err != nil {
		return SharedFavoritesResult{}, err
	}
	if expiresAt != nil && expiresAt.Before(time.Now().UTC()) {
		return SharedFavoritesResult{}, errors.New("share expired")
	}

	if _, err := s.pool.Exec(ctx, `
		UPDATE favorite_shares SET view_count = COALESCE(view_count, 0) + 1
		WHERE share_id = $1`, shareID); err != nil {
		return SharedFavoritesResult{}, err
	}
	result.ShareInfo.ViewCount++

	items, err := s.ListFavorites(ctx, userID)
	if err != nil {
		return SharedFavoritesResult{}, err
	}
	result.Favorites = items
	return result, nil
}

func randomShareToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
