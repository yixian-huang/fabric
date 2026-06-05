package base

import (
	"context"
	"errors"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"todo-server-go/internal/infra/auth"
	"todo-server-go/internal/infra/storage"
	"todo-server-go/internal/http/media"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidInput       = errors.New("invalid input")
)

type AuthService struct {
	users UserRepository
	jwt   *auth.JWT
}

func NewAuthService(users UserRepository, jwt *auth.JWT) *AuthService {
	return &AuthService{users: users, jwt: jwt}
}

func hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func checkPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) Login(req LoginRequest) (*LoginData, error) {
	username := strings.TrimSpace(req.Username)
	password := strings.TrimSpace(req.Password)
	if username == "" || password == "" {
		return nil, ErrInvalidInput
	}
	u, err := s.users.FindByUsername(username)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if u.Status == "blocked" {
		return nil, ErrAccountBlocked
	}
	if !checkPassword(u.Password, password) {
		return nil, ErrInvalidCredentials
	}
	token, err := s.jwt.Sign(u.ID, u.Username)
	if err != nil {
		return nil, err
	}
	return &LoginData{
		Token: token,
		User: UserDTO{ID: u.ID, Username: u.Username, Name: u.Nickname},
	}, nil
}

func (s *AuthService) Me(userID string) (*MeResponse, error) {
	u, err := s.users.FindByID(userID)
	if err != nil {
		return nil, err
	}
	return &MeResponse{UserID: u.ID, Username: u.Username, Nickname: u.Nickname, Email: u.Email}, nil
}

func (s *AuthService) FavoriteCount(userID string) (*FavoriteCountResponse, error) {
	count, err := s.users.FavoriteCount(userID)
	if err != nil {
		return nil, err
	}
	return &FavoriteCountResponse{FavoriteCount: count}, nil
}

type ImageService struct {
	images  ImageRepository
	storage storage.Store
}

func NewImageService(images ImageRepository, store storage.Store) *ImageService {
	return &ImageService{images: images, storage: store}
}

var docExtensions = map[string]bool{
	"pdf": true, "doc": true, "docx": true, "xls": true, "xlsx": true,
	"ppt": true, "pptx": true, "zip": true,
}

func (s *ImageService) Upload(ctx context.Context, username, projectID string, file multipart.File, header *multipart.FileHeader) (*UploadImageResponse, error) {
	if file == nil || header == nil {
		return nil, ErrInvalidInput
	}
	if s.storage == nil {
		return nil, errors.New("storage not configured")
	}

	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(header.Filename), "."))
	filePath := "images"
	if docExtensions[ext] {
		filePath = "files"
	}
	fileID := uuid.NewString()
	objectKey := buildObjectKey(filePath, username, projectID, fileID, ext)

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if err := s.storage.Upload(ctx, objectKey, file, header.Size, contentType); err != nil {
		return nil, err
	}

	meta := imageMeta{
		FileID:      fileID,
		ObjectKey:   objectKey,
		FileName:    header.Filename,
		Title:       header.Filename,
		Size:        header.Size,
		ContentType: contentType,
		URL:         objectKey,
	}
	if err := s.images.Save(meta); err != nil {
		_ = s.storage.DeleteObject(ctx, objectKey)
		return nil, err
	}
	return &UploadImageResponse{
		FileID:   fileID,
		URL:      media.FileDownloadURL(fileID),
		FileName: header.Filename,
	}, nil
}

func buildObjectKey(filePath, username, projectID, fileID, ext string) string {
	username = strings.TrimSpace(username)
	if username == "" {
		username = "admin"
	}
	segment := strings.TrimSpace(projectID)
	if segment == "" {
		segment = "None"
	}
	return filePath + "/" + username + "/" + segment + "/" + fileID + "." + ext
}

func (s *ImageService) OpenDownload(ctx context.Context, fileID string) (*storage.Object, imageMeta, error) {
	meta, ok := s.images.FindByFileID(strings.TrimSpace(fileID))
	if !ok {
		return nil, imageMeta{}, ErrInvalidInput
	}
	if s.storage == nil {
		return nil, imageMeta{}, errors.New("storage not configured")
	}
	obj, err := s.storage.GetObject(ctx, meta.ObjectKey)
	if err != nil {
		return nil, imageMeta{}, err
	}
	return obj, meta, nil
}
