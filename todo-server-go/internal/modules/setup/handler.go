package setup

import (
	"encoding/json"
	"errors"
	"net/http"

	"todo-server-go/internal/http/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Status(r.Context())
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", data)
}

func (h *Handler) Complete(w http.ResponseWriter, r *http.Request) {
	var req CompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	data, err := h.svc.Complete(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrSetupAlreadyCompleted):
			response.JSON(w, http.StatusConflict, 40901, "系统已完成初始化", nil)
		case errors.Is(err, ErrInvalidSetupInput):
			response.JSON(w, http.StatusBadRequest, 40001, "请填写有效的管理员密码", nil)
		case errors.Is(err, ErrAdminNotFound):
			response.JSON(w, http.StatusInternalServerError, 50001, "未找到默认管理员，请检查 BOOTSTRAP_ADMIN 配置", nil)
		default:
			response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		}
		return
	}
	response.JSON(w, http.StatusOK, 200, data.Message, data)
}
