package base

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgUserRepository struct {
	pool *pgxpool.Pool
}

func NewPGUserRepository(pool *pgxpool.Pool) UserRepository {
	return &pgUserRepository{pool: pool}
}

func (r *pgUserRepository) Create(username, passwordHash, email string) (*user, error) {
	id := uuid.NewString()
	if email == "" {
		email = username + "@local.dev"
	}
	ctx := context.Background()
	_, err := r.pool.Exec(ctx, `
		INSERT INTO users (user_id, username, password_hash, email, nickname, status, email_verified)
		VALUES ($1, $2, $3, $4, $5, 'active', TRUE)`,
		id, username, passwordHash, email, username)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrUsernameDuplicate
		}
		return nil, err
	}
	return &user{ID: id, Username: username, Password: passwordHash, Email: email, Nickname: username}, nil
}

func (r *pgUserRepository) FindByUsername(username string) (*user, error) {
	ctx := context.Background()
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, username, password_hash, email, nickname, status, email_verified
		FROM users WHERE username = $1`, username)
	u := &user{}
	if err := row.Scan(&u.ID, &u.Username, &u.Password, &u.Email, &u.Nickname, &u.Status, &u.EmailVerified); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepository) FindByID(id string) (*user, error) {
	ctx := context.Background()
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, username, password_hash, email, nickname, status, email_verified
		FROM users WHERE user_id = $1`, id)
	u := &user{}
	if err := row.Scan(&u.ID, &u.Username, &u.Password, &u.Email, &u.Nickname, &u.Status, &u.EmailVerified); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return u, nil
}

func (r *pgUserRepository) FavoriteCount(userID string) (int, error) {
	ctx := context.Background()
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM fabric_favorites WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

type pgImageRepository struct {
	pool *pgxpool.Pool
}

func NewPGImageRepository(pool *pgxpool.Pool) ImageRepository {
	return &pgImageRepository{pool: pool}
}

func (r *pgImageRepository) Save(meta imageMeta) error {
	ctx := context.Background()
	if meta.FileID == "" {
		meta.FileID = uuid.NewString()
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO images (file_id, title, file_name, object_name, content_type, size, url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		meta.FileID, meta.Title, meta.FileName, meta.ObjectKey, meta.ContentType, meta.Size, meta.URL)
	return err
}

func (r *pgImageRepository) FindByFileID(fileID string) (imageMeta, bool) {
	ctx := context.Background()
	row := r.pool.QueryRow(ctx, `
		SELECT file_id, title, file_name, object_name, content_type, size, url
		FROM images WHERE file_id = $1`, fileID)
	var m imageMeta
	if err := row.Scan(&m.FileID, &m.Title, &m.FileName, &m.ObjectKey, &m.ContentType, &m.Size, &m.URL); err != nil {
		return imageMeta{}, false
	}
	return m, true
}

func (r *pgImageRepository) Delete(fileID string) error {
	ctx := context.Background()
	tag, err := r.pool.Exec(ctx, `DELETE FROM images WHERE file_id = $1`, fileID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInvalidInput
	}
	return nil
}

func (r *pgImageRepository) FindByObjectKey(objectKey string) (imageMeta, bool) {
	ctx := context.Background()
	row := r.pool.QueryRow(ctx, `
		SELECT file_id, title, file_name, object_name, content_type, size, url
		FROM images WHERE object_name = $1`, objectKey)
	var m imageMeta
	if err := row.Scan(&m.FileID, &m.Title, &m.FileName, &m.ObjectKey, &m.ContentType, &m.Size, &m.URL); err != nil {
		return imageMeta{}, false
	}
	return m, true
}
