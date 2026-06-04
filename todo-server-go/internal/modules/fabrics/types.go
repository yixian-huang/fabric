package fabrics

import "time"

type Fabric struct {
	FabricID       string      `json:"fabric_id"`
	Code           string      `json:"code"`
	ReferenceCode  string      `json:"reference_code"`
	MerchantCode   string      `json:"merchant_code"`
	Weight         float64     `json:"weight"`
	WeightUnit     string      `json:"weight_unit"`
	FabricType     string      `json:"fabric_type"`
	StyleCodes     []string    `json:"style_codes"`
	ProcessCodes   []string    `json:"process_codes"`
	Remark         string      `json:"remark"`
	Components     []Component `json:"components"`
	CreatedAt      time.Time   `json:"created_at"`
	IsFavorited    bool        `json:"is_favorited"`
}

type Component struct {
	Name       string  `json:"name"`
	Percentage float64 `json:"percentage"`
	OptionCode string  `json:"option_code"`
}

type Option struct {
	OptionID      string `json:"option_id"`
	CategoryCode  string `json:"category_code"`
	CategoryLabel string `json:"category_display"`
	OptionCode    string `json:"option_code"`
	OptionName    string `json:"option_name"`
	SortOrder     int    `json:"sort_order"`
}

type ListQuery struct {
	Page                   int
	PageSize               int
	ReferenceCode          string
	FabricCode             string
	FabricType             string
	WeightUnit             string
	WeightMin              *float64
	WeightMax              *float64
	StyleCodes             []string
	StyleEnabledOR         bool
	ProcessCodes           []string
	ProcessEnabledOR       bool
	ComponentCode          string
	ComponentPercentageMin *float64
	ComponentPercentageMax *float64
}

type ListResult struct {
	Items    []Fabric `json:"items"`
	Total    int      `json:"total"`
	Page     int      `json:"page"`
	PageSize int      `json:"page_size"`
}

type VisitorStats struct {
	TodayVisitors       int `json:"today_visitors"`
	TotalVisitors       int `json:"total_visitors"`
	UniqueVisitorsToday int `json:"unique_visitors_today"`
	TotalUniqueVisitors int `json:"total_unique_visitors"`
}

type VisitRecord struct {
	IP        string
	UserAgent string
	Page      string
	VisitedAt time.Time
}

type Vendor struct {
	VendorID  string    `json:"vendor_id"`
	Name      string    `json:"name"`
	Contact   string    `json:"contact,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	Address   string    `json:"address,omitempty"`
	Email     string    `json:"email,omitempty"`
	Remark    string    `json:"remark,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
