package fabrics

import (
	"strconv"
	"strings"

	"todo-server-go/internal/http/media"
)

func attachImageURLs(f *Fabric) {
	if f.ImageFileID == nil || strings.TrimSpace(*f.ImageFileID) == "" {
		return
	}
	u := media.FileDownloadURL(strings.TrimSpace(*f.ImageFileID))
	f.ImageURL = u
	f.ThumbnailURL = u
	f.WatermarkImageURL = u
}

var fabricTypeFromString = map[string]int{
	"knit":    1,
	"knitted": 1,
	"针织":      1,
	"woven":   2,
	"梭织":      2,
	"lace":    3,
	"蕾丝":      3,
	"velvet":  4,
	"天鹅绒":     4,
}

func parseFabricType(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	if n, err := strconv.Atoi(raw); err == nil {
		return n
	}
	if mapped, ok := fabricTypeFromString[strings.ToLower(raw)]; ok {
		return mapped
	}
	return 0
}

func fabricTypeLabel(t int) string {
	if label, ok := fabricTypeDisplay[t]; ok {
		return label
	}
	return ""
}
