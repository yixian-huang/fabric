package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const FabricConfigFile = "fabric-config.json"

// RuntimeConfig is persisted under DATA_DIR and drives first-run setup.
type RuntimeConfig struct {
	SetupCompleted   bool      `json:"setup_completed"`
	SetupCompletedAt time.Time `json:"setup_completed_at,omitempty"`
	StorageMode      string    `json:"storage_mode"`  // embedded-minio | local | external-s3
	DatabaseMode     string    `json:"database_mode"` // embedded | external
	Storage          StorageRuntimeConfig  `json:"storage,omitempty"`
	Database         DatabaseRuntimeConfig `json:"database,omitempty"`
	RestartRequired  bool      `json:"restart_required,omitempty"`
}

type StorageRuntimeConfig struct {
	Endpoint  string `json:"endpoint,omitempty"`
	AccessKey string `json:"access_key,omitempty"`
	SecretKey string `json:"secret_key,omitempty"`
	Bucket    string `json:"bucket,omitempty"`
	Secure    bool   `json:"secure,omitempty"`
	LocalPath string `json:"local_path,omitempty"`
}

type DatabaseRuntimeConfig struct {
	DSN string `json:"dsn,omitempty"`
	Host string `json:"host,omitempty"`
	Port int    `json:"port,omitempty"`
	Name string `json:"name,omitempty"`
	User string `json:"user,omitempty"`
}

func DefaultRuntimeConfig(storageMode, databaseMode string) RuntimeConfig {
	if storageMode == "" {
		storageMode = "embedded-minio"
	}
	if databaseMode == "" {
		databaseMode = "embedded"
	}
	return RuntimeConfig{
		SetupCompleted: false,
		StorageMode:    storageMode,
		DatabaseMode:   databaseMode,
	}
}

func RuntimeConfigPath(dataDir string) string {
	return filepath.Join(dataDir, FabricConfigFile)
}

func LoadRuntimeConfig(dataDir string) (RuntimeConfig, error) {
	path := RuntimeConfigPath(dataDir)
	b, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return RuntimeConfig{}, err
		}
		return RuntimeConfig{}, err
	}
	var cfg RuntimeConfig
	if err := json.Unmarshal(b, &cfg); err != nil {
		return RuntimeConfig{}, err
	}
	return cfg, nil
}

func SaveRuntimeConfig(dataDir string, cfg RuntimeConfig) error {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	tmp := RuntimeConfigPath(dataDir) + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, RuntimeConfigPath(dataDir))
}

func EffectiveStorageMode(envMode string, runtime RuntimeConfig) string {
	if runtime.StorageMode != "" {
		return runtime.StorageMode
	}
	envMode = strings.TrimSpace(envMode)
	if envMode == "" {
		return "embedded-minio"
	}
	return envMode
}

func EffectiveDatabaseMode(envMode string, runtime RuntimeConfig) string {
	if runtime.DatabaseMode != "" {
		return runtime.DatabaseMode
	}
	envMode = strings.TrimSpace(envMode)
	if envMode == "" {
		return "embedded"
	}
	return envMode
}
