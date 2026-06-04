package grid

import "time"

type CreateSharedRequest struct {
	Project    string   `json:"project"`
	RowIDsList []string `json:"row_ids_list"`
}

type CreateVendorShareRequest struct {
	Project    string   `json:"project"`
	Vendor     string   `json:"vendor"`
	RowIDsList []string `json:"row_ids_list"`
}

type GenerateVendorLinksRequest struct {
	ProjectID string `json:"project_id"`
}

type UpdateVendorRemarkRequest struct {
	SharedKey string `json:"shared_key"`
	Password  string `json:"password"`
	Row       string `json:"row"`
	Column    string `json:"column"`
	VendorID  string `json:"vendorId"`
	Content   string `json:"content"`
}

type SharedAccessResponse struct {
	Project ProjectDetail `json:"project"`
	Shared  interface{}   `json:"shared"`
}

type VendorShareDetailDTO struct {
	VendorShareID  string    `json:"vendor_share_id"`
	SharedKey      string    `json:"shared_key"`
	SharedPassword string    `json:"shared_password"`
	Project        string    `json:"project"`
	ProjectName    string    `json:"project_name,omitempty"`
	Vendor         string    `json:"vendor"`
	VendorName     string    `json:"vendor_name,omitempty"`
	IsActive       bool      `json:"is_active"`
	RowIDsList     []string  `json:"row_ids_list,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
