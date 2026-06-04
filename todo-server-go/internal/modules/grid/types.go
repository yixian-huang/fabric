package grid

import "time"

type ProjectSummary struct {
	ProjectID   string    `json:"project_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Creator     string    `json:"creator"`
	IsArchived  bool      `json:"is_archived"`
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ColumnDTO struct {
	ColumnID    string                 `json:"column_id"`
	Project     string                 `json:"project,omitempty"`
	Title       string                 `json:"title"`
	Width       int                    `json:"width"`
	Type        string                 `json:"type"`
	ColumnIndex int                    `json:"column_index"`
	Style       string                 `json:"style,omitempty"`
	Rule        string                 `json:"rule,omitempty"`
	StyleData   map[string]interface{} `json:"style_data,omitempty"`
	RuleData    map[string]interface{} `json:"rule_data,omitempty"`
	CreatedAt   *time.Time             `json:"created_at,omitempty"`
	UpdatedAt   *time.Time             `json:"updated_at,omitempty"`
}

type CellDTO struct {
	CellID    *string                `json:"cell_id"`
	Project   string                 `json:"project,omitempty"`
	Row       string                 `json:"row"`
	Column    string                 `json:"column"`
	Content   string                 `json:"content"`
	Style     string                 `json:"style,omitempty"`
	StyleData map[string]interface{} `json:"style_data,omitempty"`
	Type      string                 `json:"type"`
	CreatedAt *time.Time             `json:"created_at,omitempty"`
	UpdatedAt *time.Time             `json:"updated_at,omitempty"`
}

type RowDTO struct {
	RowID     string    `json:"row_id"`
	Project   string    `json:"project,omitempty"`
	RowIndex  int       `json:"row_index"`
	Hidden    bool      `json:"hidden,omitempty"`
	Cells     []CellDTO `json:"cells"`
	CreatedAt *time.Time `json:"created_at,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

type ProjectDetail struct {
	ProjectID   string      `json:"project_id"`
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Creator     string      `json:"creator"`
	IsArchived  bool        `json:"is_archived"`
	IsPublic    bool        `json:"is_public"`
	Columns     []ColumnDTO `json:"columns"`
	Rows        []RowDTO    `json:"rows"`
	BaseURL     string      `json:"base_url"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type UpdateCellRequest struct {
	Project   string                 `json:"project"`
	Row       string                 `json:"row"`
	Column    string                 `json:"column"`
	Content   string                 `json:"content"`
	Type      string                 `json:"type"`
	StyleData map[string]interface{} `json:"style_data"`
}

type CreateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type UpdateProjectRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsArchived  *bool   `json:"is_archived"`
	IsPublic    *bool   `json:"is_public"`
}

type CreateColumnRequest struct {
	ProjectID string `json:"project_id"`
	Title     string `json:"title"`
	Width     int    `json:"width"`
	Type      string `json:"type"`
}

type CreateRowRequest struct {
	ProjectID string `json:"project_id"`
}

type ToggleRowsHiddenRequest struct {
	RowIDs []string `json:"row_ids"`
	Hidden bool     `json:"hidden"`
}

type UpdateColumnRequest struct {
	Title       *string                `json:"title"`
	Width       *int                   `json:"width"`
	Type        *string                `json:"type"`
	ColumnIndex *int                   `json:"column_index"`
	Style       *string                `json:"style"`
	Rule        *string                `json:"rule"`
	StyleData   map[string]interface{} `json:"style_data"`
	RuleData    map[string]interface{} `json:"rule_data"`
}

type ProjectAccess struct {
	ProjectID string `json:"project_id"`
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	CanRead   bool   `json:"can_read"`
	CanWrite  bool   `json:"can_write"`
}

type SharedLinkDTO struct {
	SharedID       string    `json:"shared_id"`
	SharedKey      string    `json:"shared_key"`
	SharedPassword string    `json:"shared_password"`
	Project        string    `json:"project"`
	ProjectName    string    `json:"project_name"`
	Vender         string    `json:"vender,omitempty"`
	RowIDsList     []string  `json:"row_ids_list"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type VendorShareDTO struct {
	VendorShareID  string    `json:"vendor_share_id"`
	SharedKey      string    `json:"shared_key"`
	SharedPassword string    `json:"shared_password"`
	Project        string    `json:"project"`
	Vendor         string    `json:"vendor"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
