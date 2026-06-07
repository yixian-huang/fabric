-- Extended access analytics on visitor_logs
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS referrer TEXT NOT NULL DEFAULT '';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS status_code INT NOT NULL DEFAULT 200;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS browser VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS os VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS device VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_logs_visited_at ON visitor_logs (visited_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_page ON visitor_logs (page);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON visitor_logs (ip_address);

-- Option Chinese display name
ALTER TABLE options ADD COLUMN IF NOT EXISTS option_name_zh VARCHAR(64) NOT NULL DEFAULT '';

-- Fabric supplier link
ALTER TABLE fabrics ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL;

-- Internal extra fabric images (first image remains main_image_id for public display)
CREATE TABLE IF NOT EXISTS fabric_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fabric_id UUID NOT NULL REFERENCES fabrics(fabric_id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES images(file_id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fabric_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_fabric_images_fabric_id ON fabric_images (fabric_id);

-- Runtime system settings (key-value)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User last visit tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ;
