-- name: GetGridProject :one
SELECT project_id, name, description, user_id, is_archived, is_public, created_at, updated_at
FROM grid_projects
WHERE project_id = $1;

-- name: ListGridProjectsByUser :many
SELECT project_id, name, description, user_id, is_archived, is_public, created_at, updated_at
FROM grid_projects
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: DeleteGridProject :exec
DELETE FROM grid_projects
WHERE project_id = $1 AND user_id = $2;
