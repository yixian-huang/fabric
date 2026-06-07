package router

import (
	"net/http"
	"time"

	chiMw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	appmw "todo-server-go/internal/http/middleware"
	"todo-server-go/internal/http/response"
	"todo-server-go/internal/infra/auth"
)

type RouteBinder interface {
	Bind(r chi.Router, auth func(http.Handler) http.Handler)
}

func New(jwtSvc *auth.JWT, pool *pgxpool.Pool, binders ...RouteBinder) http.Handler {
	r := chi.NewRouter()
	r.Use(chiMw.RealIP)
	r.Use(chiMw.Timeout(30 * time.Second))
	r.Use(appmw.RequestID)
	r.Use(appmw.Recover)
	r.Use(appmw.CORS)
	if pool != nil {
		r.Use(appmw.AccessLog(pool))
	}

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		response.JSON(w, http.StatusOK, 200, "ok", map[string]string{"status": "up"})
	})

	authMw := appmw.JWTAuth(jwtSvc)
	for _, b := range binders {
		b.Bind(r, authMw)
	}
	return r
}
