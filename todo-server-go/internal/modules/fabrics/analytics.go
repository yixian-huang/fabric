package fabrics

import "time"

type AccessRecord struct {
	IP         string
	UserAgent  string
	Page       string
	URL        string
	Referrer   string
	StatusCode int
	Bytes      int64
	UserID     string
	VisitedAt  time.Time
}

type AnalyticsSummary struct {
	PageViews   int   `json:"page_views"`
	UniqueIPs   int   `json:"unique_ips"`
	Requests    int   `json:"requests"`
	TrafficBytes int64 `json:"traffic_bytes"`
}

type DimensionRow struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
	Bytes int64  `json:"bytes,omitempty"`
}

type TrendPoint struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

type AnalyticsQuery struct {
	From        time.Time
	To          time.Time
	Dimension   string
	Metric      string
	Granularity string
	Limit       int
}
