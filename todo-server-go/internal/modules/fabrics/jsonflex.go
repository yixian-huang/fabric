package fabrics

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// flexInt accepts JSON number or string (Django/前端兼容).
type flexInt int

func (v *flexInt) UnmarshalJSON(b []byte) error {
	if len(b) == 0 || string(b) == "null" {
		*v = 0
		return nil
	}
	if b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		if s == "" {
			*v = 0
			return nil
		}
		n, err := strconv.Atoi(s)
		if err != nil {
			return fmt.Errorf("invalid int string: %s", s)
		}
		*v = flexInt(n)
		return nil
	}
	var n int
	if err := json.Unmarshal(b, &n); err != nil {
		return err
	}
	*v = flexInt(n)
	return nil
}

func (v flexInt) Int() int { return int(v) }
