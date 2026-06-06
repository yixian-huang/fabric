-- One-time data migration: Django (todo-server) -> Go (todo-server-go) tables.
-- Run AFTER Go schema migrations have been applied to the same database.
-- Safe to re-run: uses ON CONFLICT DO NOTHING where applicable.

BEGIN;

-- grid_shared: Go expects "password", Django used "shared_password".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_shared' AND column_name = 'shared_password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_shared' AND column_name = 'password'
  ) THEN
    ALTER TABLE grid_shared RENAME COLUMN shared_password TO password;
  END IF;
END $$;

-- users
INSERT INTO users (
  user_id, username, password_hash, email, nickname, status,
  email_verified, email_subscription, verification_token, verification_token_expires,
  created_at, updated_at
)
SELECT
  user_id, username, password, email, COALESCE(nickname, username), status,
  email_verified, email_subscription, verification_token, verification_token_expires,
  created_at, updated_at
FROM base_user
ON CONFLICT (user_id) DO NOTHING;

-- images
INSERT INTO images (
  file_id, title, file_name, object_name, content_type, size, url, created_at
)
SELECT
  file_id, title, file_name, object_name, content_type, size, COALESCE(url, ''), created_at
FROM base_image
ON CONFLICT (file_id) DO NOTHING;

-- fabrics
INSERT INTO fabrics (
  fabric_id, code, reference_code, merchant_code, main_image_id,
  weight, weight_unit, fabric_type, style_codes, process_codes,
  remark, width, yarn_count, density, created_at, updated_at
)
SELECT
  fabric_id, code, reference_code, COALESCE(merchant_code, ''),
  main_image_id, weight, weight_unit, fabric_type::text,
  style_codes, process_codes, COALESCE(remark, ''),
  COALESCE(width, ''), COALESCE(yarn_count, ''), COALESCE(density, ''),
  created_at, updated_at
FROM fabrics_fabric
ON CONFLICT (fabric_id) DO NOTHING;

-- fabric_components
INSERT INTO fabric_components (component_id, fabric_id, name, percentage, option_code)
SELECT component_id, fabric_id, name, percentage, COALESCE(option_code, '')
FROM fabrics_component
ON CONFLICT (component_id) DO NOTHING;

-- options (skip dev-seed duplicates on option_code)
INSERT INTO options (option_id, category_code, option_code, option_name, sort_order, created_at, updated_at)
SELECT option_id, category_code, option_code, option_name, sort_order, NOW(), NOW()
FROM fabrics_option
ON CONFLICT (option_code) DO NOTHING;

-- vendors
INSERT INTO vendors (vendor_id, name, contact_person, contact_info, address, created_at, updated_at)
SELECT
  vendor_id, name, COALESCE(contact, ''),
  trim(both ' ' from concat_ws(' ', NULLIF(phone, ''), NULLIF(email, ''))),
  COALESCE(address, ''), created_at, updated_at
FROM fabrics_vendor
ON CONFLICT (vendor_id) DO NOTHING;

-- fabric_favorites
INSERT INTO fabric_favorites (favorite_id, user_id, fabric_id, created_at)
SELECT favorite_id, user_id, fabric_id, created_at
FROM fabrics_fabricfavorite
ON CONFLICT (user_id, fabric_id) DO NOTHING;

-- favorite_shares
INSERT INTO favorite_shares (share_id, user_id, share_token, title, created_at, expires_at, view_count)
SELECT share_id, user_id, share_token, '', created_at, expires_at, COALESCE(view_count, 0)
FROM fabrics_favoriteshare
ON CONFLICT (share_id) DO NOTHING;

-- visitor_logs
INSERT INTO visitor_logs (ip_address, user_agent, page, visited_at)
SELECT COALESCE(ip_address, ''), COALESCE(user_agent, ''), COALESCE(page_viewed, ''), visit_time
FROM fabrics_visitorlog;

-- user_configs
INSERT INTO user_configs (user_id, key, value, description, created_at, updated_at)
SELECT user_id, key, COALESCE(value, ''), COALESCE(description, ''), created_at, updated_at
FROM base_user_config
ON CONFLICT (user_id, key) DO NOTHING;

-- grid_projects
INSERT INTO grid_projects (
  project_id, user_id, name, description, is_archived, is_public, version, created_at, updated_at
)
SELECT
  project_id, creator_id, name, COALESCE(description, ''), is_archived, is_public, 1, created_at, updated_at
FROM grid_project
ON CONFLICT (project_id) DO NOTHING;

-- grid_columns
INSERT INTO grid_columns (
  column_id, project_id, title, column_index, width, type, style, rule, created_at, updated_at
)
SELECT
  column_id, project_id, title, column_index, width, type,
  COALESCE(style, '{}'), COALESCE(rule, '{}'), created_at, updated_at
FROM grid_column
ON CONFLICT (column_id) DO NOTHING;

-- grid_rows
INSERT INTO grid_rows (row_id, project_id, row_index, hidden, created_at, updated_at)
SELECT row_id, project_id, row_index, COALESCE(hidden, false), created_at, updated_at
FROM grid_row
ON CONFLICT (row_id) DO NOTHING;

-- grid_cells
INSERT INTO grid_cells (
  cell_id, project_id, row_id, column_id, content, style, type, version, created_at, updated_at
)
SELECT
  cell_id, project_id, row_id, column_id,
  COALESCE(content, ''), COALESCE(style, '{}'), type, 1, created_at, updated_at
FROM grid_cell
ON CONFLICT (project_id, row_id, column_id) DO NOTHING;

COMMIT;
