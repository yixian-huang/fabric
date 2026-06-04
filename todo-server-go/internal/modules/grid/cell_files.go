package grid

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

type fileRef struct {
	FileID string `json:"file_id"`
}

func parseFileIDs(content string) []string {
	content = strings.TrimSpace(content)
	if content == "" || content == "[]" {
		return nil
	}
	var refs []fileRef
	if err := json.Unmarshal([]byte(content), &refs); err != nil {
		return nil
	}
	ids := make([]string, 0, len(refs))
	for _, r := range refs {
		if r.FileID != "" {
			ids = append(ids, r.FileID)
		}
	}
	return ids
}

func validateColumnRule(colType, rule, content string) error {
	if rule == "" || content == "" {
		return nil
	}
	var ruleData map[string]interface{}
	if err := json.Unmarshal([]byte(rule), &ruleData); err != nil {
		return nil
	}
	if colType == "text" {
		if maxLen, ok := ruleData["length"].(float64); ok && maxLen > 0 {
			if len(content) > int(maxLen) {
				return fmt.Errorf("内容长度不能超过 %d 个字符", int(maxLen))
			}
		}
	}
	return nil
}

func (s *PGService) cleanupRemovedFiles(ctx context.Context, oldContent, newContent, cellType string) error {
	if s.storage == nil || (cellType != "image" && cellType != "file") {
		return nil
	}
	oldIDs := toSet(parseFileIDs(oldContent))
	newIDs := toSet(parseFileIDs(newContent))
	for id := range oldIDs {
		if _, kept := newIDs[id]; kept {
			continue
		}
		if err := s.deleteImageFile(ctx, id); err != nil {
			return err
		}
	}
	return nil
}

func (s *PGService) deleteImageFile(ctx context.Context, fileID string) error {
	var objectName string
	err := s.pool.QueryRow(ctx, `
		DELETE FROM images WHERE file_id = $1 RETURNING object_name`, fileID).Scan(&objectName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if objectName != "" {
		_ = s.storage.DeleteObject(ctx, objectName)
	}
	return nil
}

func toSet(ids []string) map[string]struct{} {
	set := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		set[id] = struct{}{}
	}
	return set
}
