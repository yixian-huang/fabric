package base

import "time"

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Username           string `json:"username"`
	Password           string `json:"password"`
	PasswordConfirm    string `json:"password_confirm"`
	Email              string `json:"email"`
	Nickname           string `json:"nickname"`
	EmailSubscription  bool   `json:"email_subscription"`
}

type RegisterResponse struct {
	Message           string     `json:"message,omitempty"`
	User              UserDetail `json:"user"`
	VerificationToken string     `json:"-"`
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

type ResendVerificationRequest struct {
	Email string `json:"email"`
}

type UserDetail struct {
	UserID        string     `json:"user_id"`
	Username      string     `json:"username"`
	Email         string     `json:"email"`
	Nickname      string     `json:"nickname"`
	Status        string     `json:"status"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	LastVisitedAt *time.Time `json:"last_visited_at,omitempty"`
	FavoriteCount int        `json:"favorite_count,omitempty"`
}

type UserListResponse struct {
	Items []UserDetail `json:"items"`
	Total int          `json:"total"`
}

type AdminCreateUserRequest struct {
	Username        string `json:"username"`
	Password        string `json:"password"`
	PasswordConfirm string `json:"password_confirm"`
	Email           string `json:"email"`
	Nickname        string `json:"nickname"`
	Status          string `json:"status"`
}

type UpdateUserRequest struct {
	Nickname            string `json:"nickname"`
	Email               string `json:"email"`
	Status              string `json:"status"`
	CurrentPassword     string `json:"current_password"`
	NewPassword         string `json:"new_password"`
	NewPasswordConfirm  string `json:"new_password_confirm"`
}

type UserDTO struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type LoginData struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

type MeResponse struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Email    string `json:"email"`
}

type FavoriteCountResponse struct {
	FavoriteCount int `json:"favorite_count"`
}

type UploadImageResponse struct {
	FileID   string `json:"file_id"`
	URL      string `json:"url"`
	FileName string `json:"file_name"`
}
