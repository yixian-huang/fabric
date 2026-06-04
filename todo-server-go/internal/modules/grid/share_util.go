package grid

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
)

const shareCodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func randomShareCode(n int) string {
	out := make([]byte, n)
	for i := range out {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(shareCodeChars))))
		out[i] = shareCodeChars[idx.Int64()]
	}
	return string(out)
}

func randomSharePassword(n int) string {
	out := make([]byte, n)
	for i := range out {
		idx, _ := rand.Int(rand.Reader, big.NewInt(10))
		out[i] = byte('0' + idx.Int64())
	}
	return string(out)
}

func parseRowIDs(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var ids []string
	if err := json.Unmarshal(raw, &ids); err != nil {
		return []string{}
	}
	return ids
}

func marshalRowIDs(ids []string) []byte {
	if ids == nil {
		ids = []string{}
	}
	b, _ := json.Marshal(ids)
	return b
}

type vendorRef struct {
	ID   string
	Name string
}

func parseVendorList(content string) []vendorRef {
	if content == "" {
		return nil
	}
	var raw []map[string]interface{}
	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		return nil
	}
	out := make([]vendorRef, 0, len(raw))
	for _, item := range raw {
		id, _ := item["id"].(string)
		name, _ := item["name"].(string)
		if id != "" {
			out = append(out, vendorRef{ID: id, Name: name})
		}
	}
	return out
}

func filterVendorContent(cell *CellDTO, vendorID string) {
	if cell.Type != "vendor" || cell.Content == "" || vendorID == "" {
		return
	}
	vendors := parseVendorList(cell.Content)
	for _, v := range vendors {
		if v.ID == vendorID {
			b, _ := json.Marshal([]map[string]string{{"id": vendorID, "name": v.Name}})
			cell.Content = string(b)
			return
		}
	}
}

func filterVendorRemark(cell *CellDTO, vendorID string) {
	if cell.Type != "vendorNote" || vendorID == "" {
		return
	}
	if cell.Content == "" {
		b, _ := json.Marshal(map[string]string{"vendorId": vendorID, "content": ""})
		cell.Content = string(b)
		return
	}
	var remarks []map[string]interface{}
	if err := json.Unmarshal([]byte(cell.Content), &remarks); err == nil {
		for _, remark := range remarks {
			if vid, _ := remark["vendorId"].(string); vid == vendorID {
				content, _ := remark["content"].(string)
				b, _ := json.Marshal(map[string]string{"vendorId": vendorID, "content": content})
				cell.Content = string(b)
				return
			}
		}
	}
	b, _ := json.Marshal(map[string]string{"vendorId": vendorID, "content": ""})
	cell.Content = string(b)
}

func columnRuleSelf(rule string) bool {
	if rule == "" {
		return false
	}
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(rule), &data); err != nil {
		return false
	}
	self, _ := data["self"].(bool)
	return self
}
