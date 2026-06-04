package base

import (
	"errors"
	"sync"

	"github.com/google/uuid"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUsernameDuplicate = errors.New("username already exists")
)

type user struct {
	ID            string
	Username      string
	Password      string
	Email         string
	Nickname      string
	Status        string
	EmailVerified bool
	FavoriteCount int
}

type UserUpdateInput struct {
	Nickname        *string
	Email           *string
	Status          *string
	NewPasswordHash string
}

type UserRepository interface {
	Create(username, passwordHash, email string) (*user, error)
	CreateRegistered(in RegisterUserInput) (*user, string, error)
	FindByUsername(username string) (*user, error)
	FindByID(id string) (*user, error)
	FindByEmail(email string) (*user, error)
	VerifyEmail(token string) (*user, error)
	ResendVerification(email string) (string, error)
	ListUsers() ([]userRecord, error)
	GetUserDetail(id string) (*userRecord, error)
	UpdateUser(id string, patch UserUpdateInput) (*userRecord, error)
	DeleteUser(id string) error
	FavoriteCount(userID string) (int, error)
}

type InMemoryUserRepository struct {
	mu         sync.RWMutex
	byID       map[string]*user
	byUsername map[string]string
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		byID:       make(map[string]*user),
		byUsername: make(map[string]string),
	}
}

func (r *InMemoryUserRepository) Create(username, passwordHash, email string) (*user, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.byUsername[username]; exists {
		return nil, ErrUsernameDuplicate
	}
	created := &user{ID: uuid.NewString(), Username: username, Password: passwordHash, Email: email, Nickname: username}
	r.byID[created.ID] = created
	r.byUsername[username] = created.ID
	return created, nil
}

func (r *InMemoryUserRepository) FindByUsername(username string) (*user, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.byUsername[username]
	if !ok {
		return nil, ErrUserNotFound
	}
	u := *r.byID[id]
	return &u, nil
}

func (r *InMemoryUserRepository) FindByID(id string) (*user, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.byID[id]
	if !ok {
		return nil, ErrUserNotFound
	}
	copyUser := *u
	return &copyUser, nil
}

func (r *InMemoryUserRepository) FavoriteCount(userID string) (int, error) {
	if _, err := r.FindByID(userID); err != nil {
		return 0, err
	}
	return 0, nil
}

func (r *InMemoryUserRepository) CreateRegistered(in RegisterUserInput) (*user, string, error) {
	u, err := r.Create(in.Username, in.PasswordHash, in.Email)
	if err != nil {
		return nil, "", err
	}
	return u, "dev-token", nil
}

func (r *InMemoryUserRepository) FindByEmail(email string) (*user, error) {
	return nil, ErrEmailNotFound
}

func (r *InMemoryUserRepository) VerifyEmail(token string) (*user, error) {
	return nil, ErrInvalidToken
}

func (r *InMemoryUserRepository) ResendVerification(email string) (string, error) {
	return "", ErrEmailNotFound
}

func (r *InMemoryUserRepository) ListUsers() ([]userRecord, error) {
	return []userRecord{}, nil
}

func (r *InMemoryUserRepository) GetUserDetail(id string) (*userRecord, error) {
	u, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	return &userRecord{ID: u.ID, Username: u.Username, Email: u.Email, Nickname: u.Nickname, Status: u.Status, EmailVerified: u.EmailVerified}, nil
}

func (r *InMemoryUserRepository) UpdateUser(id string, patch UserUpdateInput) (*userRecord, error) {
	return r.GetUserDetail(id)
}

func (r *InMemoryUserRepository) DeleteUser(id string) error {
	return ErrUserNotFound
}

type imageMeta struct {
	FileID      string
	ObjectKey   string
	FileName    string
	Title       string
	Size        int64
	ContentType string
	URL         string
}

type ImageRepository interface {
	Save(meta imageMeta) error
	FindByFileID(fileID string) (imageMeta, bool)
	FindByObjectKey(objectKey string) (imageMeta, bool)
	Delete(fileID string) error
}

type InMemoryImageRepository struct {
	mu    sync.RWMutex
	items map[string]imageMeta
}

func NewInMemoryImageRepository() *InMemoryImageRepository {
	return &InMemoryImageRepository{items: make(map[string]imageMeta)}
}

func (r *InMemoryImageRepository) Save(meta imageMeta) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if meta.FileID == "" {
		meta.FileID = uuid.NewString()
	}
	r.items[meta.ObjectKey] = meta
	return nil
}

func (r *InMemoryImageRepository) FindByObjectKey(objectKey string) (imageMeta, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	meta, ok := r.items[objectKey]
	return meta, ok
}

func (r *InMemoryImageRepository) Delete(fileID string) error {
	return ErrInvalidInput
}

func (r *InMemoryImageRepository) FindByFileID(fileID string) (imageMeta, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, meta := range r.items {
		if meta.FileID == fileID {
			return meta, true
		}
	}
	return imageMeta{}, false
}
