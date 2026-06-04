-- Align Go schema with Django grid models for todo-table compatibility.

ALTER TABLE grid_columns RENAME COLUMN name TO title;
ALTER TABLE grid_columns ADD COLUMN IF NOT EXISTS width INT NOT NULL DEFAULT 100;
ALTER TABLE grid_columns ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'text';

ALTER TABLE grid_cells ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'text';

-- Django stores cell/column style as TEXT JSON strings.
ALTER TABLE grid_cells
  ALTER COLUMN content TYPE TEXT USING content::text,
  ALTER COLUMN style TYPE TEXT USING style::text;

ALTER TABLE grid_columns
  ALTER COLUMN style TYPE TEXT USING style::text,
  ALTER COLUMN rule TYPE TEXT USING rule::text;

ALTER TABLE grid_shared ADD COLUMN IF NOT EXISTS vender VARCHAR(100);
ALTER TABLE grid_shared ADD COLUMN IF NOT EXISTS vender_id VARCHAR(100);

ALTER TABLE grid_vendor_share
  ALTER COLUMN vendor_share_id TYPE VARCHAR(16) USING vendor_share_id::text;

ALTER TABLE grid_vendor_share ADD COLUMN IF NOT EXISTS row_ids TEXT;
