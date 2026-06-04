package grid

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"todo-server-go/internal/http/middleware"
	"todo-server-go/internal/http/response"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func writeGridError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, ErrProjectNotFound) {
		response.JSON(w, http.StatusNotFound, 40404, "project not found", nil)
		return true
	}
	if errors.Is(err, ErrForbidden) {
		response.JSON(w, http.StatusForbidden, 40301, "forbidden", nil)
		return true
	}
	if errors.Is(err, ErrColumnNotFound) {
		response.JSON(w, http.StatusNotFound, 40404, "column not found", nil)
		return true
	}
	return false
}

func writeSharedError(w http.ResponseWriter, err error) bool {
	if errors.Is(err, ErrSharedNotFound) {
		response.JSON(w, http.StatusNotFound, 40404, "共享链接不存在或已失效", nil)
		return true
	}
	if errors.Is(err, ErrInvalidPassword) {
		response.JSON(w, http.StatusForbidden, 40301, "密码错误", nil)
		return true
	}
	return false
}

func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projects, err := h.svc.ListProjects(user.UserID)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取项目列表成功", projects)
}

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	project, err := h.svc.CreateProject(user.UserID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建项目成功", project)
}

func (h *Handler) GetProjectDetail(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(chi.URLParam(r, "project_id"))
	if projectID == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "project_id is required", nil)
		return
	}

	detail, err := h.svc.GetProjectDetail(user.UserID, projectID)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取项目详情成功", detail)
}

func (h *Handler) GetTodoProject(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}

	detail, err := h.svc.GetOrCreateTodoProject(user.UserID)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "获取待办事项项目详情失败", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取待办事项项目详情成功", detail)
}

func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(chi.URLParam(r, "project_id"))
	defer r.Body.Close()

	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	project, err := h.svc.UpdateProject(user.UserID, projectID, req)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新项目成功", project)
}

func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(chi.URLParam(r, "project_id"))
	if err := h.svc.DeleteProject(user.UserID, projectID); err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "project not found", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除项目成功", nil)
}

func (h *Handler) GetRows(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(r.URL.Query().Get("project_id"))
	if projectID == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "project_id is required", nil)
		return
	}
	hidden := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("hidden")), "true")

	rows, err := h.svc.GetRows(user.UserID, projectID, hidden)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", rows)
}

func (h *Handler) CreateRow(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()

	var req CreateRowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	projectID := strings.TrimSpace(req.ProjectID)
	if projectID == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "project_id is required", nil)
		return
	}

	row, err := h.svc.CreateRow(user.UserID, projectID)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建行成功", row)
}

func (h *Handler) DeleteRow(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	rowID := strings.TrimSpace(chi.URLParam(r, "row_id"))
	if err := h.svc.DeleteRow(user.UserID, rowID); err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "row not found", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除行成功", nil)
}

func (h *Handler) ToggleRowsHidden(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()

	var req ToggleRowsHiddenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	count, err := h.svc.ToggleRowsHidden(user.UserID, req.RowIDs, req.Hidden)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	msg := "显示"
	if req.Hidden {
		msg = "隐藏"
	}
	response.JSON(w, http.StatusOK, 200, "已"+msg+" "+strconv.Itoa(count)+" 行", map[string]any{
		"updated_count": count,
		"row_ids":       req.RowIDs,
	})
}

func (h *Handler) UpdateCell(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()

	var req UpdateCellRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	req.Project = strings.TrimSpace(req.Project)
	req.Row = strings.TrimSpace(req.Row)
	req.Column = strings.TrimSpace(req.Column)

	cell, err := h.svc.UpsertCell(user.UserID, req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "ok", cell)
}

func (h *Handler) CreateColumn(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()

	var req CreateColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	col, err := h.svc.CreateColumn(user.UserID, req)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建列成功", col)
}

func (h *Handler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	columnID := strings.TrimSpace(chi.URLParam(r, "column_id"))
	if err := h.svc.DeleteColumn(user.UserID, columnID); err != nil {
		if writeGridError(w, err) {
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除列成功", nil)
}

func (h *Handler) UpdateColumn(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	columnID := strings.TrimSpace(chi.URLParam(r, "column_id"))
	defer r.Body.Close()

	var req UpdateColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}

	col, err := h.svc.UpdateColumn(user.UserID, columnID, req)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新列成功", col)
}

func (h *Handler) ListSharedLinks(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(r.URL.Query().Get("project_id"))
	links, err := h.svc.ListSharedLinks(user.UserID, projectID)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取共享链接列表成功", links)
}

func (h *Handler) CreateSharedLinks(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()
	var req CreateSharedRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	links, err := h.svc.CreateSharedLinks(user.UserID, req)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "成功创建共享链接", links)
}

func (h *Handler) DeleteSharedLink(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	sharedID := strings.TrimSpace(chi.URLParam(r, "shared_id"))
	if err := h.svc.DeleteSharedLink(user.UserID, sharedID); err != nil {
		if writeGridError(w, err) {
			return
		}
		if errors.Is(err, ErrSharedNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "共享链接不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除共享链接成功", nil)
}

func (h *Handler) AccessSharedLink(w http.ResponseWriter, r *http.Request) {
	sharedID := strings.TrimSpace(r.URL.Query().Get("shared_id"))
	sharedKey := strings.TrimSpace(r.URL.Query().Get("shared_key"))
	password := strings.TrimSpace(r.URL.Query().Get("password"))
	if sharedID == "" || sharedKey == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "缺少必要参数", nil)
		return
	}
	data, err := h.svc.AccessSharedLink(sharedID, sharedKey, password)
	if writeSharedError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "访问共享链接成功", data)
}

func (h *Handler) AccessSharedProject(w http.ResponseWriter, r *http.Request) {
	sharedKey := strings.TrimSpace(r.URL.Query().Get("shared_key"))
	password := strings.TrimSpace(r.URL.Query().Get("shared_password"))
	if sharedKey == "" || password == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "缺少必要参数", nil)
		return
	}
	data, err := h.svc.AccessSharedProject(sharedKey, password)
	if writeSharedError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "访问共享项目成功", data)
}

func (h *Handler) UpdateSharedVendorRemark(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req UpdateVendorRemarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	if err := h.svc.UpdateSharedVendorRemark(req); err != nil {
		if errors.Is(err, ErrInvalidPassword) {
			response.JSON(w, http.StatusForbidden, 40301, "密码错误", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新供应商备注成功", nil)
}

func (h *Handler) ListVendorShares(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	projectID := strings.TrimSpace(r.URL.Query().Get("project_id"))
	shares, err := h.svc.ListVendorShares(user.UserID, projectID)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "获取供应商共享列表成功", shares)
}

func (h *Handler) CreateVendorShare(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()
	var req CreateVendorShareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	share, err := h.svc.CreateVendorShare(user.UserID, req)
	if writeGridError(w, err) {
		return
	}
	if err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "创建供应商共享成功", share)
}

func (h *Handler) DeleteVendorShare(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	vendorShareID := strings.TrimSpace(chi.URLParam(r, "vendor_share_id"))
	if err := h.svc.DeleteVendorShare(user.UserID, vendorShareID); err != nil {
		if writeGridError(w, err) {
			return
		}
		if errors.Is(err, ErrSharedNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "共享链接不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "删除供应商共享成功", nil)
}

func (h *Handler) GenerateVendorLinks(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.CurrentUser(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
		return
	}
	defer r.Body.Close()
	var req GenerateVendorLinksRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	shares, err := h.svc.GenerateVendorLinks(user.UserID, req.ProjectID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "项目不存在", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "已生成供应商共享链接", shares)
}

func (h *Handler) AccessVendorShare(w http.ResponseWriter, r *http.Request) {
	sharedKey := strings.TrimSpace(r.URL.Query().Get("shared_key"))
	password := strings.TrimSpace(r.URL.Query().Get("shared_password"))
	if sharedKey == "" || password == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "缺少必要参数", nil)
		return
	}
	data, err := h.svc.AccessVendorShareStandard(sharedKey, password)
	if err != nil {
		if errors.Is(err, ErrSharedNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "共享链接不存在或已失效", nil)
			return
		}
		if errors.Is(err, ErrInvalidPassword) {
			response.JSON(w, http.StatusForbidden, 40301, "密码错误", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "访问供应商共享项目成功", data)
}

func (h *Handler) AccessVendorShareByVendor(w http.ResponseWriter, r *http.Request) {
	sharedKey := strings.TrimSpace(r.URL.Query().Get("shared_key"))
	password := strings.TrimSpace(r.URL.Query().Get("shared_password"))
	if sharedKey == "" || password == "" {
		response.JSON(w, http.StatusBadRequest, 40001, "缺少必要参数", nil)
		return
	}
	data, err := h.svc.AccessVendorShareByVendor(sharedKey, password)
	if err != nil {
		if errors.Is(err, ErrSharedNotFound) {
			response.JSON(w, http.StatusNotFound, 40404, "共享链接不存在", nil)
			return
		}
		if errors.Is(err, ErrInvalidPassword) {
			response.JSON(w, http.StatusForbidden, 40301, "密码错误", nil)
			return
		}
		response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "访问供应商共享项目成功", data)
}

func (h *Handler) UpdateVendorShareRemark(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req UpdateVendorRemarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.JSON(w, http.StatusBadRequest, 40001, "invalid request body", nil)
		return
	}
	if err := h.svc.UpdateVendorShareRemark(req); err != nil {
		if errors.Is(err, ErrInvalidPassword) {
			response.JSON(w, http.StatusForbidden, 40301, "密码错误", nil)
			return
		}
		response.JSON(w, http.StatusBadRequest, 40001, err.Error(), nil)
		return
	}
	response.JSON(w, http.StatusOK, 200, "更新供应商备注成功", nil)
}
