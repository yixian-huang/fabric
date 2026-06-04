-- name: GetUserConfig :one
SELECT config_id, user_id, key, value, description, created_at, updated_at
FROM user_configs
WHERE user_id = $1 AND key = $2;

-- name: UpsertUserConfig :one
INSERT INTO user_configs (user_id, key, value, description)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW()
RETURNING config_id, user_id, key, value, description, created_at, updated_at;
