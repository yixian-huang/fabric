package storage

import (
	"context"
	"io"
)

// Store abstracts object/file storage (MinIO/S3 or local disk).
type Store interface {
	BaseURL() string
	Bucket() string
	EnsureBucket(ctx context.Context) error
	Upload(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) error
	GetObject(ctx context.Context, objectName string) (*Object, error)
	DeleteObject(ctx context.Context, objectName string) error
}
