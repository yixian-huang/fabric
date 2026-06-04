package storage

import (
	"context"
	"fmt"

	"todo-server-go/internal/config"
)

// NewFromConfig selects MinIO/S3 or local disk storage.
func NewFromConfig(app config.Config, runtime config.RuntimeConfig) (Store, error) {
	mode := config.EffectiveStorageMode(app.StorageMode, runtime)
	switch mode {
	case "local":
		path := runtime.Storage.LocalPath
		if path == "" {
			path = app.LocalStoragePath
		}
		return NewLocal(path)
	default:
		endpoint := app.MinioEndpoint
		accessKey := app.MinioAccessKey
		secretKey := app.MinioSecretKey
		bucket := app.MinioBucket
		secure := app.MinioSecure
		if mode == "external-s3" {
			if runtime.Storage.Endpoint != "" {
				endpoint = runtime.Storage.Endpoint
			}
			if runtime.Storage.AccessKey != "" {
				accessKey = runtime.Storage.AccessKey
			}
			if runtime.Storage.SecretKey != "" {
				secretKey = runtime.Storage.SecretKey
			}
			if runtime.Storage.Bucket != "" {
				bucket = runtime.Storage.Bucket
			}
			secure = runtime.Storage.Secure
		}
		if endpoint == "" || bucket == "" {
			return nil, fmt.Errorf("minio/s3 storage is not configured")
		}
		return New(endpoint, accessKey, secretKey, bucket, secure)
	}
}

func InitStore(ctx context.Context, app config.Config, runtime config.RuntimeConfig) (Store, error) {
	store, err := NewFromConfig(app, runtime)
	if err != nil {
		return nil, err
	}
	if err := store.EnsureBucket(ctx); err != nil {
		return store, err
	}
	return store, nil
}
