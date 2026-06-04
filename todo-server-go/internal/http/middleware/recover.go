package middleware

import (
	"net/http"

	"todo-server-go/internal/http/response"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recover() != nil {
				response.JSON(w, http.StatusInternalServerError, 50001, "internal error", nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
