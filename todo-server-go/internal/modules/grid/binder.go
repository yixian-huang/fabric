package grid

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/infra/storage"
)

type Binder struct {
	handler *Handler
}

func NewBinder(pool *pgxpool.Pool, store storage.Store) *Binder {
	baseURL := ""
	if store != nil {
		baseURL = store.BaseURL()
	}
	svc := NewPGService(pool, baseURL, store)
	return &Binder{
		handler: NewHandler(svc),
	}
}

func NewBinderWithService(svc Service) *Binder {
	return &Binder{
		handler: NewHandler(svc),
	}
}

func (b *Binder) Bind(r chi.Router, auth func(http.Handler) http.Handler) {
	r.Route("/api/grid", func(r chi.Router) {
		// Public shared access (no auth)
		r.Get("/shared/access", b.handler.AccessSharedLink)
		r.Get("/shared/access/", b.handler.AccessSharedLink)
		r.Get("/shared/project_access", b.handler.AccessSharedProject)
		r.Get("/shared/project_access/", b.handler.AccessSharedProject)
		r.Post("/shared/update_vendor_remark", b.handler.UpdateSharedVendorRemark)
		r.Post("/shared/update_vendor_remark/", b.handler.UpdateSharedVendorRemark)
		r.Get("/vendor-share/access", b.handler.AccessVendorShare)
		r.Get("/vendor-share/access/", b.handler.AccessVendorShare)
		r.Get("/vendor-share/vendor_access", b.handler.AccessVendorShareByVendor)
		r.Get("/vendor-share/vendor_access/", b.handler.AccessVendorShareByVendor)
		r.Post("/vendor-share/update_vendor_remark", b.handler.UpdateVendorShareRemark)
		r.Post("/vendor-share/update_vendor_remark/", b.handler.UpdateVendorShareRemark)

		r.Group(func(r chi.Router) {
			r.Use(auth)

			// Projects
			r.Get("/projects", b.handler.ListProjects)
			r.Get("/projects/", b.handler.ListProjects)
			r.Post("/projects", b.handler.CreateProject)
			r.Post("/projects/", b.handler.CreateProject)
			r.Get("/projects/todo", b.handler.GetTodoProject)
			r.Get("/projects/todo/", b.handler.GetTodoProject)
			r.Get("/projects/{project_id}", b.handler.GetProjectDetail)
			r.Get("/projects/{project_id}/", b.handler.GetProjectDetail)
			r.Patch("/projects/{project_id}", b.handler.UpdateProject)
			r.Patch("/projects/{project_id}/", b.handler.UpdateProject)
			r.Delete("/projects/{project_id}", b.handler.DeleteProject)
			r.Delete("/projects/{project_id}/", b.handler.DeleteProject)

			// Rows
			r.Get("/rows/get_rows", b.handler.GetRows)
			r.Post("/rows", b.handler.CreateRow)
			r.Post("/rows/", b.handler.CreateRow)
			r.Delete("/rows/{row_id}", b.handler.DeleteRow)
			r.Delete("/rows/{row_id}/", b.handler.DeleteRow)
			r.Post("/rows/toggle_hidden", b.handler.ToggleRowsHidden)
			r.Post("/rows/toggle_hidden/", b.handler.ToggleRowsHidden)

			// Columns
			r.Post("/columns", b.handler.CreateColumn)
			r.Post("/columns/", b.handler.CreateColumn)
			r.Patch("/columns/{column_id}", b.handler.UpdateColumn)
			r.Patch("/columns/{column_id}/", b.handler.UpdateColumn)
			r.Delete("/columns/{column_id}", b.handler.DeleteColumn)
			r.Delete("/columns/{column_id}/", b.handler.DeleteColumn)

			// Cells
			r.Patch("/cells/update", b.handler.UpdateCell)

			// Shared links
			r.Get("/shared", b.handler.ListSharedLinks)
			r.Get("/shared/", b.handler.ListSharedLinks)
			r.Post("/shared", b.handler.CreateSharedLinks)
			r.Post("/shared/", b.handler.CreateSharedLinks)
			r.Delete("/shared/{shared_id}", b.handler.DeleteSharedLink)
			r.Delete("/shared/{shared_id}/", b.handler.DeleteSharedLink)

			// Vendor share
			r.Get("/vendor-share", b.handler.ListVendorShares)
			r.Get("/vendor-share/", b.handler.ListVendorShares)
			r.Post("/vendor-share", b.handler.CreateVendorShare)
			r.Post("/vendor-share/", b.handler.CreateVendorShare)
			r.Post("/vendor-share/generate", b.handler.GenerateVendorLinks)
			r.Post("/vendor-share/generate/", b.handler.GenerateVendorLinks)
			r.Delete("/vendor-share/{vendor_share_id}", b.handler.DeleteVendorShare)
			r.Delete("/vendor-share/{vendor_share_id}/", b.handler.DeleteVendorShare)
		})
	})
}
