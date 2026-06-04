package middleware

import (
	"context"
	"net/http"
	"strings"

	"todo-server-go/internal/http/response"
	"todo-server-go/internal/infra/auth"
)

type userKey struct{}

type User struct {
	UserID   string
	Username string
}

func JWTAuth(jwtSvc *auth.JWT) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
				response.JSON(w, http.StatusUnauthorized, 40101, "unauthorized", nil)
				return
			}
			token := strings.TrimSpace(header[7:])
			claims, err := jwtSvc.Parse(token)
			if err != nil {
				response.JSON(w, http.StatusUnauthorized, 40101, "invalid token", nil)
				return
			}
			ctx := context.WithValue(r.Context(), userKey{}, User{
				UserID:   claims.UserID,
				Username: claims.Username,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func CurrentUser(ctx context.Context) (User, bool) {
	u, ok := ctx.Value(userKey{}).(User)
	return u, ok
}
