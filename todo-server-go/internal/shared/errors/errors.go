package errors

import "net/http"

type AppError struct {
	Code       int
	Message    string
	HTTPStatus int
}

func (e *AppError) Error() string { return e.Message }

func New(httpStatus int, code int, message string) *AppError {
	return &AppError{HTTPStatus: httpStatus, Code: code, Message: message}
}

var (
	ErrUnauthorized = New(http.StatusUnauthorized, 40101, "unauthorized")
	ErrForbidden    = New(http.StatusForbidden, 40301, "forbidden")
	ErrNotFound     = New(http.StatusNotFound, 40401, "resource not found")
	ErrBadRequest   = New(http.StatusBadRequest, 40001, "bad request")
	ErrInternal     = New(http.StatusInternalServerError, 50001, "internal error")
)
