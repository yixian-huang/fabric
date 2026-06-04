-- name: ListGridSharedByProject :many
SELECT shared_id, shared_key, password, project_id, vender, row_ids, created_at, updated_at
FROM grid_shared
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetGridSharedByKey :one
SELECT shared_id, shared_key, password, project_id, vender, vender_id, row_ids, created_at, updated_at
FROM grid_shared
WHERE shared_key = $1;
