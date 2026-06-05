package fabrics

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/infra/storage"
)

type Binder struct {
	handler *Handler
}

func NewBinder(pool *pgxpool.Pool, blob storage.Store) *Binder {
	pgStore := newPGStore(pool, blob)
	vendorRepo := newPGVendorRepo(pool)
	svc := NewService(pgStore, vendorRepo)
	return &Binder{handler: NewHandler(svc)}
}

func (b *Binder) Bind(r chi.Router, auth func(http.Handler) http.Handler) {
	r.Get("/og/fabric/{reference_code}", b.handler.OGFabricPage)

	r.Route("/api/fabrics", func(cr chi.Router) {
		cr.With(auth).Get("/list", b.handler.List)
		cr.Get("/list_public", b.handler.ListPublic)
		cr.Get("/public/{reference_code}", b.handler.GetPublicByReferenceCode)
		cr.Get("/sitemap.xml", b.handler.Sitemap)
		cr.Get("/get_options", b.handler.GetOptions)
		cr.With(auth).Get("/check_fabric_code", b.handler.CheckFabricCode)
		cr.With(auth).Post("/toggle_favorite", b.handler.ToggleFavorite)
		cr.With(auth).Get("/visitor_stats", b.handler.VisitorStats)
		cr.Post("/record_visit", b.handler.RecordVisit)

		cr.With(auth).Post("/create_option", b.handler.CreateOption)
		cr.With(auth).Put("/update_option/{option_id}", b.handler.UpdateOption)
		cr.With(auth).Delete("/delete_option/{option_id}", b.handler.DeleteOption)

		cr.Route("/fabrics", func(fr chi.Router) {
			fr.With(auth).Get("/", b.handler.FabricList)
			fr.With(auth).Post("/", b.handler.CreateFabric)
			fr.With(auth).Get("/my_favorites", b.handler.MyFavorites)
			fr.With(auth).Get("/my_favorites/", b.handler.MyFavorites)
			fr.With(auth).Post("/share_favorites", b.handler.ShareFavorites)
			fr.With(auth).Post("/share_favorites/", b.handler.ShareFavorites)
			fr.Get("/shared_favorites", b.handler.SharedFavorites)
			fr.Get("/shared_favorites/", b.handler.SharedFavorites)
			fr.With(auth).Get("/{fabric_id}", b.handler.GetFabric)
			fr.With(auth).Get("/{fabric_id}/", b.handler.GetFabric)
			fr.With(auth).Put("/{fabric_id}", b.handler.UpdateFabric)
			fr.With(auth).Put("/{fabric_id}/", b.handler.UpdateFabric)
			fr.With(auth).Patch("/{fabric_id}", b.handler.UpdateFabric)
			fr.With(auth).Patch("/{fabric_id}/", b.handler.UpdateFabric)
			fr.With(auth).Delete("/{fabric_id}", b.handler.DeleteFabric)
			fr.With(auth).Delete("/{fabric_id}/", b.handler.DeleteFabric)
		})

		cr.Route("/vendors", func(vr chi.Router) {
			vr.With(auth).Get("/", b.handler.ListVendors)
			vr.With(auth).Post("/", b.handler.CreateVendor)
			vr.With(auth).Get("/{vendor_id}", b.handler.GetVendor)
			vr.With(auth).Get("/{vendor_id}/", b.handler.GetVendor)
			vr.With(auth).Put("/{vendor_id}", b.handler.UpdateVendor)
			vr.With(auth).Put("/{vendor_id}/", b.handler.UpdateVendor)
			vr.With(auth).Patch("/{vendor_id}", b.handler.UpdateVendor)
			vr.With(auth).Patch("/{vendor_id}/", b.handler.UpdateVendor)
			vr.With(auth).Delete("/{vendor_id}", b.handler.DeleteVendor)
			vr.With(auth).Delete("/{vendor_id}/", b.handler.DeleteVendor)
		})
	})
}
