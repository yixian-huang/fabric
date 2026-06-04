CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(150) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_subscription BOOLEAN NOT NULL DEFAULT TRUE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS images (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL DEFAULT '',
    file_name VARCHAR(255) NOT NULL,
    object_name VARCHAR(255) UNIQUE NOT NULL,
    content_type VARCHAR(100),
    size BIGINT,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabrics (
    fabric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    reference_code VARCHAR(64) UNIQUE,
    merchant_code VARCHAR(64) NOT NULL DEFAULT '',
    main_image_id UUID REFERENCES images(file_id) ON DELETE SET NULL,
    weight NUMERIC(10,2),
    weight_unit VARCHAR(16) NOT NULL DEFAULT 'g/m2',
    fabric_type VARCHAR(32) NOT NULL DEFAULT '',
    style_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    process_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    remark TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_components (
    component_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fabric_id UUID NOT NULL REFERENCES fabrics(fabric_id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    option_code VARCHAR(32) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS options (
    option_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(32) NOT NULL,
    option_code VARCHAR(32) UNIQUE,
    option_name VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) UNIQUE NOT NULL,
    contact_person VARCHAR(128) NOT NULL DEFAULT '',
    contact_info VARCHAR(255) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_favorites (
    favorite_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    fabric_id UUID NOT NULL REFERENCES fabrics(fabric_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, fabric_id)
);

CREATE TABLE IF NOT EXISTS favorite_shares (
    share_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    page VARCHAR(255) NOT NULL DEFAULT '',
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_columns (
    column_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES grid_projects(project_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    column_index INT NOT NULL,
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    rule JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, column_index)
);

CREATE TABLE IF NOT EXISTS grid_rows (
    row_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES grid_projects(project_id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, row_index)
);

CREATE TABLE IF NOT EXISTS grid_cells (
    cell_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES grid_projects(project_id) ON DELETE CASCADE,
    row_id UUID NOT NULL REFERENCES grid_rows(row_id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES grid_columns(column_id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    style JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, row_id, column_id)
);

CREATE TABLE IF NOT EXISTS grid_shared (
    shared_id VARCHAR(16) PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES grid_projects(project_id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    shared_key VARCHAR(16) UNIQUE NOT NULL,
    password VARCHAR(16) NOT NULL,
    row_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    view_count BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grid_vendor_share (
    vendor_share_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES grid_projects(project_id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    shared_key VARCHAR(16) UNIQUE NOT NULL,
    shared_password VARCHAR(16) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_grid_rows_project_hidden ON grid_rows(project_id, hidden);
CREATE INDEX IF NOT EXISTS idx_grid_cells_project_row ON grid_cells(project_id, row_id);
CREATE INDEX IF NOT EXISTS idx_grid_cells_project_col ON grid_cells(project_id, column_id);
CREATE INDEX IF NOT EXISTS idx_fabrics_style_codes_gin ON fabrics USING GIN(style_codes);
CREATE INDEX IF NOT EXISTS idx_fabrics_process_codes_gin ON fabrics USING GIN(process_codes);
