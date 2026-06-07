package base

import (
	"errors"
	"strings"
)

func (s *AuthService) Register(req RegisterRequest) (*RegisterResponse, error) {
	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	email := strings.TrimSpace(req.Email)
	confirm := strings.TrimSpace(req.PasswordConfirm)
	if username == "" || password == "" || email == "" {
		return nil, ErrInvalidInput
	}
	if confirm != "" && password != confirm {
		return nil, errors.New("两次密码不一致")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return nil, err
	}
	nickname := strings.TrimSpace(req.Nickname)
	if nickname == "" {
		nickname = username
	}
	u, token, err := s.users.CreateRegistered(RegisterUserInput{
		Username:          username,
		PasswordHash:      hash,
		Email:             email,
		Nickname:          nickname,
		EmailSubscription: req.EmailSubscription,
	})
	if err != nil {
		return nil, err
	}
	return &RegisterResponse{
		Message:           "注册成功，请查收邮件进行验证",
		User:              mapUserDetail(u),
		VerificationToken: token,
	}, nil
}

func (s *AuthService) VerifyEmail(token string) (*UserDetail, error) {
	u, err := s.users.VerifyEmail(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}
	d := mapUserDetail(u)
	return &d, nil
}

func (s *AuthService) ResendVerification(email string) (string, error) {
	return s.users.ResendVerification(strings.TrimSpace(email))
}

func (s *AuthService) ListUsers() (UserListResponse, error) {
	records, err := s.users.ListUsers()
	if err != nil {
		return UserListResponse{}, err
	}
	items := make([]UserDetail, len(records))
	for i := range records {
		items[i] = mapUserRecord(records[i])
	}
	return UserListResponse{Items: items, Total: len(items)}, nil
}

func (s *AuthService) GetUser(userID string) (*UserDetail, error) {
	rec, err := s.users.GetUserDetail(userID)
	if err != nil {
		return nil, err
	}
	d := mapUserRecord(*rec)
	return &d, nil
}

func (s *AuthService) CreateUser(req AdminCreateUserRequest) (*UserDetail, error) {
	if req.Password != req.PasswordConfirm {
		return nil, errors.New("两次密码不一致")
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "active"
	}
	u, err := s.users.Create(req.Username, hash, req.Email)
	if err != nil {
		return nil, err
	}
	if req.Nickname != "" {
		nickname := req.Nickname
		rec, err := s.users.UpdateUser(u.ID, UserUpdateInput{Nickname: &nickname, Status: &status})
		if err != nil {
			return nil, err
		}
		d := mapUserRecord(*rec)
		return &d, nil
	}
	d := mapUserDetail(u)
	return &d, nil
}

func (s *AuthService) UpdateUser(userID string, req UpdateUserRequest) (*UserDetail, error) {
	u, err := s.users.FindByID(userID)
	if err != nil {
		return nil, err
	}
	patch := UserUpdateInput{}
	if req.Nickname != "" {
		patch.Nickname = &req.Nickname
	}
	if req.Email != "" {
		patch.Email = &req.Email
	}
	if req.Status != "" {
		patch.Status = &req.Status
	}
	if req.NewPassword != "" {
		if !checkPassword(u.Password, req.CurrentPassword) {
			return nil, errors.New("当前密码不正确")
		}
		if req.NewPassword != req.NewPasswordConfirm {
			return nil, errors.New("两次密码不一致")
		}
		hash, err := hashPassword(req.NewPassword)
		if err != nil {
			return nil, err
		}
		patch.NewPasswordHash = hash
	}
	rec, err := s.users.UpdateUser(userID, patch)
	if err != nil {
		return nil, err
	}
	d := mapUserRecord(*rec)
	return &d, nil
}

func (s *AuthService) DeleteUser(userID string) error {
	return s.users.DeleteUser(userID)
}

func mapUserDetail(u *user) UserDetail {
	return UserDetail{
		UserID:        u.ID,
		Username:      u.Username,
		Email:         u.Email,
		Nickname:      u.Nickname,
		Status:        u.Status,
		EmailVerified: u.EmailVerified,
	}
}

func mapUserRecord(rec userRecord) UserDetail {
	return UserDetail{
		UserID:        rec.ID,
		Username:      rec.Username,
		Email:         rec.Email,
		Nickname:      rec.Nickname,
		Status:        rec.Status,
		EmailVerified: rec.EmailVerified,
		CreatedAt:     rec.CreatedAt,
		UpdatedAt:     rec.UpdatedAt,
		LastVisitedAt: rec.LastVisitedAt,
		FavoriteCount: rec.FavoriteCount,
	}
}
