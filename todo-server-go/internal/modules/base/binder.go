package base

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/infra/auth"
	"todo-server-go/internal/infra/storage"
)

type Binder struct {
	handler *Handler
}

func NewBinder(pool *pgxpool.Pool, jwtSvc *auth.JWT, store storage.Store) *Binder {
	userRepo := NewPGUserRepository(pool)
	imageRepo := NewPGImageRepository(pool)
	authSvc := NewAuthService(userRepo, jwtSvc)
	imageSvc := NewImageService(imageRepo, store)
	settings := newSettingsStore(pool)
	return &Binder{handler: NewHandler(authSvc, imageSvc, settings)}
}

func (b *Binder) Bind(r chi.Router, authMw func(http.Handler) http.Handler) {
	r.Route("/api/base", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", b.handler.Login)
			r.Post("/register", b.handler.Register)
			r.Post("/verify-email", b.handler.VerifyEmail)
			r.Post("/resend-verification", b.handler.ResendVerification)
			r.With(authMw).Get("/me", b.handler.Me)
		})
		r.Route("/users", func(r chi.Router) {
			r.Use(authMw)
			r.Get("/", b.handler.ListUsers)
			r.Post("/", b.handler.CreateUser)
			r.Get("/{user_id}", b.handler.GetUser)
			r.Put("/{user_id}", b.handler.UpdateUser)
			r.Patch("/{user_id}", b.handler.UpdateUser)
			r.Delete("/{user_id}", b.handler.DeleteUser)
		})
		r.With(authMw).Get("/me/favorite-count", b.handler.FavoriteCount)
		r.Get("/settings/public", b.handler.GetPublicSettings)
		r.With(authMw).Get("/settings", b.handler.GetSettings)
		r.With(authMw).Put("/settings", b.handler.UpdateSettings)
		r.Route("/images", func(r chi.Router) {
			r.With(authMw).Post("/upload", b.handler.UploadImage)
			r.With(authMw).Post("/upload/", b.handler.UploadImage)
			r.Get("/download_file", b.handler.DownloadFile)
			r.Get("/download_file/", b.handler.DownloadFile)
		})
	})
}
