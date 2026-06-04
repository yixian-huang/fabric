package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppEnv      string
	HTTPAddr    string
	JWTSecret   string
	JWTIssuer   string
	JWTTTL      time.Duration
	PostgresDSN string
	PostgresDB  string
	MigrationsDir string
	RedisAddr   string
	RedisPass   string
	RedisDB     int

	DataDir            string
	StorageMode        string
	DatabaseMode       string
	LocalStoragePath   string
	DatabaseHostDisplay string

	BootstrapAdminUser     string
	BootstrapAdminPassword string
	BootstrapAdminEmail    string

	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioSecure    bool
}

func Load() Config {
	postgresDB := getEnv("POSTGRES_DB", "fabric")
	return Config{
		AppEnv:      getEnv("APP_ENV", "dev"),
		HTTPAddr:    getEnv("HTTP_ADDR", ":8080"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me"),
		JWTIssuer:   getEnv("JWT_ISSUER", "todo-server-go"),
		JWTTTL:      time.Duration(getEnvInt("JWT_TTL_HOURS", 168)) * time.Hour,
		PostgresDSN:   getEnv("POSTGRES_DSN", "postgres://postgres:postgres@127.0.0.1:55432/fabric?sslmode=disable"),
		PostgresDB:    postgresDB,
		MigrationsDir: getEnv("MIGRATIONS_DIR", "db/migrations"),
		RedisAddr:   getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPass:   getEnv("REDIS_PASSWORD", ""),
		RedisDB:     getEnvInt("REDIS_DB", 0),

		DataDir:             getEnv("DATA_DIR", "/app/data"),
		StorageMode:         getEnv("STORAGE_MODE", "embedded-minio"),
		DatabaseMode:        getEnv("DATABASE_MODE", "embedded"),
		LocalStoragePath:    getEnv("LOCAL_STORAGE_PATH", "/app/data/files"),
		DatabaseHostDisplay: getEnv("DATABASE_HOST_DISPLAY", "postgres"),

		BootstrapAdminUser:     getEnv("BOOTSTRAP_ADMIN_USER", "admin"),
		BootstrapAdminPassword: getEnv("BOOTSTRAP_ADMIN_PASSWORD", ""),
		BootstrapAdminEmail:    getEnv("BOOTSTRAP_ADMIN_EMAIL", "admin@local"),

		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "127.0.0.1:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:    getEnv("MINIO_BUCKET_NAME", "fabric"),
		MinioSecure:    getEnvBool("MINIO_SECURE", false),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
