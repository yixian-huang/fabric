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

func parseFabricType(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0
	}
	return n
}

func fabricTypeLabel(t int) string {
	if label, ok := fabricTypeDisplay[t]; ok {
		return label
	}
	return ""
}
