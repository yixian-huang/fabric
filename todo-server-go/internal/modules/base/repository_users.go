package base

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrEmailDuplicate     = errors.New("email already exists")
	ErrEmailNotFound      = errors.New("email not found")
	ErrInvalidToken       = errors.New("invalid verification token")
	ErrTokenExpired       = errors.New("verification token expired")
	ErrEmailAlreadyVerified = errors.New("email already verified")
	ErrAccountBlocked     = errors.New("account blocked")
)

type userRecord struct {
	ID            string
	Username      string
	Email         string
	Nickname      string
	Status        string
	EmailVerified bool
	Subscription  bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type RegisterUserInput struct {
	Username           string
	PasswordHash       string
	Email              string
	Nickname           string
	EmailSubscription  bool
}

func (r *pgUserRepository) CreateRegistered(in RegisterUserInput) (*user, string, error) {
	id := uuid.NewString()
	token, err := randomToken()
	if err != nil {
		return nil, "", err
	}
	expires := time.Now().Add(24 * time.Hour)
	nickname := strings.TrimSpace(in.Nickname)
	if nickname == "" {
		nickname = in.Username
	}
	ctx := context.Background()
	_, err = r.pool.Exec(ctx, `
		INSERT INTO users (
			user_id, username, password_hash, email, nickname, status,
			email_verified, email_subscription, verification_token, verification_token_expires
		) VALUES ($1, $2, $3, $4, $5, 'inactive', FALSE, $6, $7, $8)`,
		id, in.Username, in.PasswordHash, in.Email, nickname, in.EmailSubscription, token, expires)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if strings.Contains(pgErr.ConstraintName, "email") {
				return nil, "", ErrEmailDuplicate
			}
			return nil, "", ErrUsernameDuplicate
		}
		return nil, "", err
	}
	return &user{
		ID: id, Username: in.Username, Password: in.PasswordHash,
		Email: in.Email, Nickname: nickname, Status: "inactive",
	}, token, nil
}

func (r *pgUserRepository) FindByEmail(email string) (*user, error) {
	ctx := context.Background()
	u := &user{}
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, username, password_hash, email, nickname, status, email_verified
		FROM users WHERE email = $1`, email).
		Scan(&u.ID, &u.Username, &u.Password, &u.Email, &u.Nickname, &u.Status, &u.EmailVerified)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrEmailNotFound
	}
	return u, err
}

func (r *pgUserRepository) VerifyEmail(token string) (*user, error) {
	ctx := context.Background()
	u := &user{}
	var expires time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, username, password_hash, email, nickname, status, email_verified, verification_token_expires
		FROM users WHERE verification_token = $1`, token).
		Scan(&u.ID, &u.Username, &u.Password, &u.Email, &u.Nickname, &u.Status, &u.EmailVerified, &expires)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}
	if time.Now().After(expires) {
		return nil, ErrTokenExpired
	}
	_, err = r.pool.Exec(ctx, `
		UPDATE users SET email_verified = TRUE, status = 'active',
			verification_token = NULL, verification_token_expires = NULL, updated_at = NOW()
		WHERE user_id = $1`, u.ID)
	if err != nil {
		return nil, err
	}
	u.Status = "active"
	u.EmailVerified = true
	return u, nil
}

func (r *pgUserRepository) ResendVerification(email string) (string, error) {
	u, err := r.FindByEmail(email)
	if err != nil {
		return "", err
	}
	if u.EmailVerified {
		return "", ErrEmailAlreadyVerified
	}
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(24 * time.Hour)
	ctx := context.Background()
	_, err = r.pool.Exec(ctx, `
		UPDATE users SET verification_token = $2, verification_token_expires = $3, updated_at = NOW()
		WHERE user_id = $1`, u.ID, token, expires)
	return token, err
}

func (r *pgUserRepository) ListUsers() ([]userRecord, error) {
	ctx := context.Background()
	rows, err := r.pool.Query(ctx, `
		SELECT user_id, username, email, nickname, status, email_verified, email_subscription, created_at, updated_at
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]userRecord, 0)
	for rows.Next() {
		var u userRecord
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Nickname, &u.Status,
			&u.EmailVerified, &u.Subscription, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *pgUserRepository) UpdateUser(id string, patch UserUpdateInput) (*userRecord, error) {
	existing, err := r.getUserDetail(id)
	if err != nil {
		return nil, err
	}
	if patch.Nickname != nil {
		existing.Nickname = *patch.Nickname
	}
	if patch.Email != nil {
		existing.Email = *patch.Email
	}
	if patch.Status != nil {
		existing.Status = *patch.Status
	}
	if patch.NewPasswordHash != "" {
		_, err = r.pool.Exec(context.Background(), `
			UPDATE users SET password_hash = $2, updated_at = NOW() WHERE user_id = $1`,
			id, patch.NewPasswordHash)
		if err != nil {
			return nil, err
		}
	}
	_, err = r.pool.Exec(context.Background(), `
		UPDATE users SET nickname = $2, email = $3, status = $4, updated_at = NOW()
		WHERE user_id = $1`,
		id, existing.Nickname, existing.Email, existing.Status)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEmailDuplicate
		}
		return nil, err
	}
	return r.getUserDetail(id)
}

func (r *pgUserRepository) getUserDetail(id string) (*userRecord, error) {
	ctx := context.Background()
	u := &userRecord{}
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, username, email, nickname, status, email_verified, email_subscription, created_at, updated_at
		FROM users WHERE user_id = $1`, id).
		Scan(&u.ID, &u.Username, &u.Email, &u.Nickname, &u.Status,
			&u.EmailVerified, &u.Subscription, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (r *pgUserRepository) GetUserDetail(id string) (*userRecord, error) {
	return r.getUserDetail(id)
}

func (r *pgUserRepository) DeleteUser(id string) error {
	tag, err := r.pool.Exec(context.Background(), `DELETE FROM users WHERE user_id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *pgUserRepository) scanUserWithVerified(row pgx.Row) (*user, error) {
	u := &user{}
	err := row.Scan(&u.ID, &u.Username, &u.Password, &u.Email, &u.Nickname, &u.Status, &u.EmailVerified)
	return u, err
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
