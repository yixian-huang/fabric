package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStore stores files on the local filesystem (NAS / single-node deploy).
type LocalStore struct {
	root string
}

func NewLocal(root string) (*LocalStore, error) {
	root = strings.TrimSpace(root)
	if root == "" {
		return nil, fmt.Errorf("local storage root is required")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &LocalStore{root: root}, nil
}

func (l *LocalStore) BaseURL() string { return "" }

func (l *LocalStore) Bucket() string { return "local" }

func (l *LocalStore) EnsureBucket(_ context.Context) error {
	return os.MkdirAll(l.root, 0o755)
}

func (l *LocalStore) objectPath(objectName string) (string, error) {
	clean := filepath.Clean(objectName)
	if clean == ".." || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("invalid object key")
	}
	return filepath.Join(l.root, clean), nil
}

func (l *LocalStore) Upload(_ context.Context, objectName string, reader io.Reader, _ int64, _ string) error {
	path, err := l.objectPath(objectName)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, reader)
	return err
}

func (l *LocalStore) GetObject(_ context.Context, objectName string) (*Object, error) {
	path, err := l.objectPath(objectName)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, err
	}
	ct := "application/octet-stream"
	return &Object{Reader: f, Size: info.Size(), ContentType: ct}, nil
}

func (l *LocalStore) DeleteObject(_ context.Context, objectName string) error {
	path, err := l.objectPath(objectName)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
