package base

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"todo-server-go/internal/http/middleware"
	"todo-server-go/internal/http/response"
)

type Handler struct {
	authSvc        *AuthService
	imageSvc       *ImageService
	settingsStore  *settingsStore
}

func NewHandler(authSvc *AuthService, imageSvc *ImageService, settings *settingsStore) *Handler {
	return &Handler{
		authSvc:       authSvc,
		imageSvc:      imageSvc,
		settingsStore: settings,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	data, err := h.authSvc.Login(req)
	if err != nil {
		if errors.Is(err, ErrAccountBlocked) {
			response.JSON(w, http.StatusForbidden, 40301, "账号已被封禁", nil)
			return
		}
		if errors.Is(err, ErrInvalidInput) || errors.Is(err, ErrInvalidCredentials) {
			response.JSON(w, http.StatusUnauthorized, 40101, "invalid username or password", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", data)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	data, err := h.authSvc.Register(req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
			return
		}
		if errors.Is(err, ErrUsernameDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "用户名已存在", nil)
			return
		}
		if errors.Is(err, ErrEmailDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "邮箱已被注册", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	if data.VerificationToken != "" {
		slog.Info("verification token issued", "email", data.User.Email, "token", data.VerificationToken)
	}
	response.JSON(w, http.StatusCreated, 200, data.Message, data.User)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	currentUser, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}

	data, err := h.authSvc.Me(currentUser.UserID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.JSON(w, http.StatusUnauthorized, 40101, "user not found", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", data)
}

func (h *Handler) FavoriteCount(w http.ResponseWriter, r *http.Request) {
	currentUser, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}

	data, err := h.authSvc.FavoriteCount(currentUser.UserID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.JSON(w, http.StatusUnauthorized, 40101, "user not found", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", data)
}

func (h *Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid multipart form", nil)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "file is required", nil)
		return
	}
	defer file.Close()

	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := r.FormValue("project_id")
	data, err := h.imageSvc.Upload(r.Context(), user.Username, projectID, file, header)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.JSON(w, http.StatusBadRequest, 40001, "invalid upload input", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", data)
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	user, err := h.authSvc.VerifyEmail(req.Token)
	if err != nil {
		if errors.Is(err, ErrInvalidToken) {
			response.JSON(w, http.StatusBadRequest, 40001, "无效的验证令牌", nil)
			return
		}
		if errors.Is(err, ErrTokenExpired) {
			response.JSON(w, http.StatusBadRequest, 40001, "验证令牌已过期", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "邮箱验证成功，账号已激活", user)
}

func (h *Handler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req ResendVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	token, err := h.authSvc.ResendVerification(req.Email)
	if err != nil {
		if errors.Is(err, ErrEmailNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "邮箱未注册", nil)
			return
		}
		if errors.Is(err, ErrEmailAlreadyVerified) {
			response.JSON(w, http.StatusBadRequest, 40001, "邮箱已经验证过了", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	slog.Info("verification token reissued", "email", req.Email, "token", token)
	response.JSON(w, http.StatusOK, 200, "验证邮件已重新发送", nil)
}

func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	data, err := h.authSvc.ListUsers()
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取用户列表成功", data)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	user, err := h.authSvc.GetUser(userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "用户不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取用户详情成功", user)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req AdminCreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	user, err := h.authSvc.CreateUser(req)
	if err != nil {
		if errors.Is(err, ErrUsernameDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "用户名已存在", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusCreated, 200, "用户注册成功", user)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	user, err := h.authSvc.UpdateUser(userID, req)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "用户不存在", nil)
			return
		}
		if errors.Is(err, ErrEmailDuplicate) {
			response.JSON(w, http.StatusConflict, 40901, "邮箱已被注册", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新用户信息成功", user)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "user_id")
	if err := h.authSvc.DeleteUser(userID); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "用户不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除用户成功", nil)
}

func (h *Handler) DownloadFile(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Query().Get("file_id")
	obj, meta, err := h.imageSvc.OpenDownload(r.Context(), fileID)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.JSON(w, http.StatusNotFound, 40404, "file not found", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	defer obj.Reader.Close()

	fileName := meta.FileName
	if fileName == "" {
		fileName = "download"
	}
	w.Header().Set("Content-Type", obj.ContentType)
	disposition := "attachment"
	if strings.HasPrefix(strings.ToLower(obj.ContentType), "image/") {
		disposition = "inline"
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`%s; filename="%s"`, disposition, fileName))
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, obj.Reader)
}

func (h *Handler) GetPublicSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsStore.GetPublic(r.Context())
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", settings)
}

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsStore.GetAll(r.Context())
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", maskSettings(settings))
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req SystemSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	existing, err := h.settingsStore.GetAll(r.Context())
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	if req.SmtpPassword == "********" || req.SmtpPassword == "" {
		req.SmtpPassword = existing.SmtpPassword
	}
	if err := h.settingsStore.Save(r.Context(), req); err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	updated, _ := h.settingsStore.GetAll(r.Context())
	response.JSON(w, http.StatusOK, 200, "保存成功", maskSettings(updated))
}
