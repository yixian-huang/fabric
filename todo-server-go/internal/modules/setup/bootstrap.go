package setup

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"todo-server-go/internal/config"
	baseModule "todo-server-go/internal/modules/base"
)

func countUsers(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	var n int
	err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

func bcryptGenerate(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func pickStorageEndpoint(mode string, app config.Config, runtime config.RuntimeConfig) string {
	switch mode {
	case "external-s3":
		if runtime.Storage.Endpoint != "" {
			return runtime.Storage.Endpoint
		}
		return app.MinioEndpoint
	case "embedded-minio":
		return app.MinioEndpoint
	default:
		return ""
	}
}

func pickStorageBucket(mode string, app config.Config, runtime config.RuntimeConfig) string {
	if mode == "local" {
		return ""
	}
	if runtime.Storage.Bucket != "" {
		return runtime.Storage.Bucket
	}
	return app.MinioBucket
}

func pickLocalPath(app config.Config, runtime config.RuntimeConfig) string {
	if runtime.Storage.LocalPath != "" {
		return runtime.Storage.LocalPath
	}
	return app.LocalStoragePath
}

func pickDatabaseHost(mode string, app config.Config, runtime config.RuntimeConfig) string {
	if mode == "external" {
		if runtime.Database.Host != "" {
			return runtime.Database.Host
		}
		return "external"
	}
	return app.DatabaseHostDisplay
}

func pickDatabaseName(mode string, app config.Config, runtime config.RuntimeConfig) string {
	if runtime.Database.Name != "" {
		return runtime.Database.Name
	}
	return app.PostgresDB
}

// EnsureBootstrapAdmin creates the default admin when no users exist.
func EnsureBootstrapAdmin(ctx context.Context, pool *pgxpool.Pool, users baseModule.UserRepository, username, password, email string) error {
	count, err := countUsers(ctx, pool)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	if username == "" {
		username = "admin"
	}
	if password == "" {
		return nil
	}
	if email == "" {
		email = "admin@local"
	}
	hash, err := bcryptGenerate(password)
	if err != nil {
		return err
	}
	_, err = users.Create(username, hash, email)
	return err
}

// EnsureRuntimeConfigFile writes default runtime config if missing.
func EnsureRuntimeConfigFile(dataDir, storageMode, databaseMode string) error {
	if _, err := config.LoadRuntimeConfig(dataDir); err == nil {
		return nil
	}
	return config.SaveRuntimeConfig(dataDir, config.DefaultRuntimeConfig(storageMode, databaseMode))
}
