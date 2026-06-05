package fabrics

import (
	"strings"
	"testing"
)

func TestRenderOGFabricPage(t *testing.T) {
	f := Fabric{
		ReferenceCode: "250601001",
		Code:          "DS-001",
		MerchantCode:  "M1",
		Weight:        120,
		WeightUnit:    "g/m2",
		ThumbnailURL:  "/api/base/images/download/abc",
		Components: []Component{
			{Name: "Silk", Percentage: 70, OptionCode: "silk"},
			{Name: "Cotton", Percentage: 30, OptionCode: "cotton"},
		},
	}

	html := renderOGFabricPage(f, "https://example.com")
	checks := []string{
		"250601001",
		"og:title",
		"og:description",
		"og:image",
		"application/ld+json",
		"https://example.com/fabric/250601001",
		"https://example.com/api/base/images/download/abc",
	}
	for _, want := range checks {
		if !strings.Contains(html, want) {
			t.Fatalf("expected OG HTML to contain %q", want)
		}
	}
}

func TestRenderSitemapXML(t *testing.T) {
	xml := renderSitemapXML("https://example.com", []string{"250601001", "250601002"})
	if !strings.Contains(xml, "https://example.com/") {
		t.Fatal("missing homepage in sitemap")
	}
	if !strings.Contains(xml, "https://example.com/fabric/250601001") {
		t.Fatal("missing fabric URL in sitemap")
	}
}
