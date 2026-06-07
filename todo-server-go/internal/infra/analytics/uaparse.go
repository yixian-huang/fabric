package analytics

import "strings"

type ParsedUA struct {
	Browser string
	OS      string
	Device  string
}

func ParseUserAgent(ua string) ParsedUA {
	ua = strings.TrimSpace(ua)
	if ua == "" {
		return ParsedUA{Browser: "Unknown", OS: "Unknown", Device: "Desktop"}
	}
	lower := strings.ToLower(ua)

	device := "Desktop"
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "iphone") || strings.Contains(lower, "android"):
		device = "Mobile"
	case strings.Contains(lower, "ipad") || strings.Contains(lower, "tablet"):
		device = "Tablet"
	}

	os := "Unknown"
	switch {
	case strings.Contains(lower, "windows"):
		os = "Windows"
	case strings.Contains(lower, "mac os") || strings.Contains(lower, "macintosh"):
		os = "macOS"
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad"):
		os = "iOS"
	case strings.Contains(lower, "android"):
		os = "Android"
	case strings.Contains(lower, "linux"):
		os = "Linux"
	}

	browser := "Unknown"
	switch {
	case strings.Contains(lower, "edg/"):
		browser = "Edge"
	case strings.Contains(lower, "chrome/") && !strings.Contains(lower, "edg/"):
		browser = "Chrome"
	case strings.Contains(lower, "firefox/"):
		browser = "Firefox"
	case strings.Contains(lower, "safari/") && !strings.Contains(lower, "chrome/"):
		browser = "Safari"
	case strings.Contains(lower, "opera") || strings.Contains(lower, "opr/"):
		browser = "Opera"
	case strings.Contains(lower, "msie") || strings.Contains(lower, "trident/"):
		browser = "IE"
	}

	return ParsedUA{Browser: browser, OS: os, Device: device}
}
