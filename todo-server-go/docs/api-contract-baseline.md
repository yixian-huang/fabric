# todo-server Python API Contract Baseline

This document freezes the Python API behavior before Go migration.

## Global Rules

- Base URL prefixes:
  - `/api/base`
  - `/api/fabrics`
  - `/api/grid`
- Auth:
  - Default is JWT Bearer (`Authorization: Bearer <token>`)
  - Public endpoints are explicitly whitelisted
- Canonical JSON envelope:
  - `{"code": <int>, "message": "<string>", "data": <object|null>}`
  - Some list endpoints may still use DRF pagination shape in legacy behavior

## Base Module

- Auth:
  - `POST /api/base/auth/login`
  - `POST /api/base/auth/register`
  - `POST /api/base/auth/verify-email`
  - `POST /api/base/auth/resend-verification`
  - `GET /api/base/auth/me`
- Users:
  - `GET|POST /api/base/users/`
  - `GET|PUT|PATCH|DELETE /api/base/users/{user_id}/`
  - `GET /api/base/me/favorite-count`
- Images:
  - `GET|POST /api/base/images/`
  - `GET|PUT|PATCH|DELETE /api/base/images/{file_id}/`
  - `POST /api/base/images/upload`
  - `GET /api/base/images/download_file`

## Fabrics Module

- Fabrics:
  - `GET|POST /api/fabrics/fabrics/`
  - `GET|PUT|PATCH|DELETE /api/fabrics/fabrics/{fabric_id}/`
  - `GET /api/fabrics/list`
  - `GET /api/fabrics/list_public`
  - `GET /api/fabrics/check_fabric_code`
- Options:
  - `GET /api/fabrics/get_options`
  - `POST /api/fabrics/create_option`
  - `PUT /api/fabrics/update_option/{option_id}`
  - `DELETE /api/fabrics/delete_option/{option_id}`
- Favorites:
  - `POST /api/fabrics/toggle_favorite`
  - `GET /api/fabrics/fabrics/my_favorites/`
  - `POST /api/fabrics/fabrics/share_favorites/`
  - `GET /api/fabrics/fabrics/shared_favorites/`
- Visitor:
  - `POST /api/fabrics/record_visit`
  - `GET /api/fabrics/visitor_stats`
- Vendors:
  - `GET|POST /api/fabrics/vendors/`
  - `GET|PUT|PATCH|DELETE /api/fabrics/vendors/{vendor_id}/`

## Grid Module

- Projects:
  - `GET|POST /api/grid/projects/`
  - `GET|PUT|PATCH|DELETE /api/grid/projects/{project_id}/`
  - `GET /api/grid/projects/todo/`
- Columns:
  - `GET|POST /api/grid/columns/`
  - `GET|PUT|PATCH|DELETE /api/grid/columns/{column_id}/`
- Rows:
  - `GET|POST /api/grid/rows/`
  - `GET|PUT|PATCH|DELETE /api/grid/rows/{row_id}/`
  - `GET /api/grid/rows/get_rows`
  - `POST /api/grid/rows/toggle_hidden/`
- Cells:
  - `GET|POST /api/grid/cells/`
  - `GET|PUT|PATCH|DELETE /api/grid/cells/{cell_id}/`
  - `PATCH /api/grid/cells/update`
- Shared:
  - `GET|POST /api/grid/shared/`
  - `GET|PUT|PATCH|DELETE /api/grid/shared/{shared_id}/`
  - `GET /api/grid/shared/access`
  - `GET /api/grid/shared/project_access`
  - `POST /api/grid/shared/update_vendor_remark`
- Vendor share:
  - `GET|POST /api/grid/vendor-share/`
  - `GET|PUT|PATCH|DELETE /api/grid/vendor-share/{vendor_share_id}/`
  - `GET /api/grid/vendor-share/access`
  - `GET /api/grid/vendor-share/vendor_access`
  - `POST /api/grid/vendor-share/generate`
  - `POST /api/grid/vendor-share/update_vendor_remark`

## Migration Policy

- Optimize-first migration is allowed.
- Go service exposes:
  - New optimized routes
  - Compatibility aliases for high-traffic legacy routes
- Response envelope remains stable unless documented in changelog.
