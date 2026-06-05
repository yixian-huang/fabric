package fabrics

import (
	"fmt"
	"html"
	"net/http"
	"strings"
)

const defaultSiteName = "DAILY SILK FABRIC HUB"

type ogPageData struct {
	SiteName    string
	Title       string
	Description string
	Canonical   string
	Image       string
	Redirect    string
	BodyText    string
	JSONLD      string
}

func buildFabricDescription(f Fabric) string {
	parts := make([]string, 0, 8)
	if f.ReferenceCode != "" {
		parts = append(parts, "Ref "+f.ReferenceCode)
	}
	if f.Code != "" {
		code := f.Code
		if f.MerchantCode != "" {
			code += "-" + f.MerchantCode
		}
		parts = append(parts, "Code "+code)
	}
	if len(f.Components) > 0 {
		compParts := make([]string, 0, len(f.Components))
		for _, c := range f.Components {
			compParts = append(compParts, fmt.Sprintf("%.0f%% %s", c.Percentage, c.Name))
		}
		parts = append(parts, strings.Join(compParts, ", "))
	}
	if f.Weight > 0 {
		unit := f.WeightUnit
		if unit == "" {
			unit = "g/m2"
		}
		parts = append(parts, fmt.Sprintf("%.0f %s", f.Weight, unit))
	}
	if f.Width != "" {
		parts = append(parts, f.Width)
	}
	if f.Remark != "" {
		parts = append(parts, f.Remark)
	}
	desc := strings.Join(parts, " · ")
	if len(desc) > 160 {
		desc = desc[:157] + "..."
	}
	return desc
}

func buildFabricTitle(f Fabric) string {
	parts := make([]string, 0, 3)
	if f.ReferenceCode != "" {
		parts = append(parts, f.ReferenceCode)
	}
	if len(f.Components) > 0 {
		parts = append(parts, fmt.Sprintf("%.0f%% %s", f.Components[0].Percentage, f.Components[0].Name))
	}
	if f.Weight > 0 {
		unit := f.WeightUnit
		if unit == "" {
			unit = "g/m2"
		}
		parts = append(parts, fmt.Sprintf("%.0fg/m2", f.Weight))
		if unit != "g/m2" {
			parts[len(parts)-1] = fmt.Sprintf("%.0f %s", f.Weight, unit)
		}
	}
	if len(parts) == 0 && f.Code != "" {
		parts = append(parts, f.Code)
	}
	return strings.Join(parts, " · ")
}

func renderOGFabricPage(f Fabric, baseURL string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "http://localhost"
	}
	ref := strings.TrimSpace(f.ReferenceCode)
	canonical := baseURL + "/fabric/" + ref
	image := strings.TrimSpace(f.ThumbnailURL)
	if image == "" {
		image = strings.TrimSpace(f.WatermarkImageURL)
	}
	if image != "" && !strings.HasPrefix(image, "http") {
		image = baseURL + image
	}

	title := buildFabricTitle(f)
	description := buildFabricDescription(f)
	bodyText := description
	if bodyText == "" {
		bodyText = title
	}

	jsonLD := fmt.Sprintf(`{"@context":"https://schema.org","@type":"Product","name":%q,"description":%q,"url":%q,"sku":%q,"image":%q}`,
		ref, description, canonical, ref, image)

	data := ogPageData{
		SiteName:    defaultSiteName,
		Title:       title + " | " + defaultSiteName,
		Description: description,
		Canonical:   canonical,
		Image:       image,
		Redirect:    canonical,
		BodyText:    bodyText,
		JSONLD:      jsonLD,
	}
	return renderOGHTML(data)
}

func renderOGHTML(data ogPageData) string {
	esc := html.EscapeString
	var imageTags strings.Builder
	if data.Image != "" {
		imageTags.WriteString(`<meta property="og:image" content="` + esc(data.Image) + `" />` + "\n")
		imageTags.WriteString(`<meta name="twitter:image" content="` + esc(data.Image) + `" />` + "\n")
	}
	cardType := "summary"
	if data.Image != "" {
		cardType = "summary_large_image"
	}

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>` + esc(data.Title) + `</title>
  <meta name="description" content="` + esc(data.Description) + `" />
  <link rel="canonical" href="` + esc(data.Canonical) + `" />
  <meta property="og:title" content="` + esc(data.Title) + `" />
  <meta property="og:description" content="` + esc(data.Description) + `" />
  <meta property="og:url" content="` + esc(data.Canonical) + `" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="` + esc(data.SiteName) + `" />
  <meta name="twitter:card" content="` + cardType + `" />
  <meta name="twitter:title" content="` + esc(data.Title) + `" />
  <meta name="twitter:description" content="` + esc(data.Description) + `" />
  ` + imageTags.String() + `
  <script type="application/ld+json">` + data.JSONLD + `</script>
  <meta http-equiv="refresh" content="0;url=` + esc(data.Redirect) + `" />
</head>
<body>
  <noscript>
    <h1>` + esc(data.Title) + `</h1>
    <p>` + esc(data.BodyText) + `</p>
    <p><a href="` + esc(data.Redirect) + `">View fabric details</a></p>
  </noscript>
  <p>Redirecting to <a href="` + esc(data.Redirect) + `">` + esc(data.Redirect) + `</a>...</p>
</body>
</html>`
}

func renderSitemapXML(baseURL string, refs []string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "http://localhost"
	}
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	b.WriteString("  <url><loc>" + html.EscapeString(baseURL+"/") + "</loc></url>\n")
	for _, ref := range refs {
		ref = strings.TrimSpace(ref)
		if ref == "" {
			continue
		}
		loc := baseURL + "/fabric/" + ref
		b.WriteString("  <url><loc>" + html.EscapeString(loc) + "</loc></url>\n")
	}
	b.WriteString("</urlset>\n")
	return b.String()
}

func publicBaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil || strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")), "https") {
		scheme = "https"
	}
	host := strings.TrimSpace(r.Host)
	if host == "" {
		host = "localhost"
	}
	return scheme + "://" + host
}
