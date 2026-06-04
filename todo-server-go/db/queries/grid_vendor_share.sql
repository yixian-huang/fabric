-- name: ListGridVendorShareByProject :many
SELECT vendor_share_id, shared_key, shared_password, project_id, vendor_id, is_active, row_ids, created_at, updated_at
FROM grid_vendor_share
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetGridVendorShareByKey :one
SELECT vendor_share_id, shared_key, shared_password, project_id, vendor_id, is_active, row_ids, created_at, updated_at
FROM grid_vendor_share
WHERE shared_key = $1;
