ALTER TABLE users DROP COLUMN IF EXISTS last_visited_at;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS fabric_images;
ALTER TABLE fabrics DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE options DROP COLUMN IF EXISTS option_name_zh;

DROP INDEX IF EXISTS idx_visitor_logs_ip;
DROP INDEX IF EXISTS idx_visitor_logs_page;
DROP INDEX IF EXISTS idx_visitor_logs_visited_at;

ALTER TABLE visitor_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS bytes;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS device;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS os;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS browser;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS status_code;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS referrer;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS url;
