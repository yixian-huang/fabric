package media

import "net/url"

// FileDownloadURL returns a browser-loadable API path for an uploaded file.
func FileDownloadURL(fileID string) string {
	return "/api/base/images/download_file?file_id=" + url.QueryEscape(fileID)
}
