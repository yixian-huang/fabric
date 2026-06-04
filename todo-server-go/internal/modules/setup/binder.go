package setup

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Binder struct {
	handler *Handler
}

func NewBinder(svc *Service) *Binder {
	return &Binder{handler: NewHandler(svc)}
}

func (b *Binder) Bind(r chi.Router, _ func(http.Handler) http.Handler) {
	r.Route("/api/base/setup", func(r chi.Router) {
		r.Get("/status", b.handler.Status)
		r.Get("/status/", b.handler.Status)
		r.Post("/complete", b.handler.Complete)
		r.Post("/complete/", b.handler.Complete)
	})
}
