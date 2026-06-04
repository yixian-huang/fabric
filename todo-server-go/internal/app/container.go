package app

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"todo-server-go/internal/config"
	"todo-server-go/internal/infra/auth"
	"todo-server-go/internal/infra/cache"
	"todo-server-go/internal/infra/db"
	"todo-server-go/internal/infra/storage"
	baseModule "todo-server-go/internal/modules/base"
	setupModule "todo-server-go/internal/modules/setup"
)

const defaultMigrationsDir = "db/migrations"

type Container struct {
	Config  config.Config
	Runtime config.RuntimeConfig
	Logger  *slog.Logger

	PG      *pgxpool.Pool
	Redis   *redis.Client
	Storage storage.Store
	JWT     *auth.JWT
	Setup   *setupModule.Service
}

func New(ctx context.Context, cfg config.Config, logger *slog.Logger) (*Container, error) {
	_ = setupModule.EnsureRuntimeConfigFile(cfg.DataDir, cfg.StorageMode, cfg.DatabaseMode)

	runtime, err := config.LoadRuntimeConfig(cfg.DataDir)
	if err != nil {
		runtime = config.DefaultRuntimeConfig(cfg.StorageMode, cfg.DatabaseMode)
	}

	dsn := config.MergedPostgresDSN(cfg, runtime)
	pg, err := db.NewPool(ctx, dsn)
	if err != nil {
		return nil, err
	}

	migrationsDir := cfg.MigrationsDir
	if migrationsDir == "" {
		migrationsDir = defaultMigrationsDir
	}
	if err := db.RunMigrations(ctx, pg, migrationsDir); err != nil {
		pg.Close()
		return nil, err
	}

	userRepo := baseModule.NewPGUserRepository(pg)
	if err := setupModule.EnsureBootstrapAdmin(
		ctx, pg, userRepo,
		cfg.BootstrapAdminUser,
		cfg.BootstrapAdminPassword,
		cfg.BootstrapAdminEmail,
	); err != nil {
		pg.Close()
		return nil, err
	}

	rd := cache.NewClient(cfg.RedisAddr, cfg.RedisPass, cfg.RedisDB)
	if err := cache.Ping(ctx, rd); err != nil {
		logger.Warn("redis ping failed", "error", err)
	}

	store, err := storage.InitStore(ctx, cfg, runtime)
	if err != nil {
		logger.Warn("storage init failed", "error", err)
	}

	setupSvc := setupModule.NewService(pg, userRepo, cfg.DataDir, cfg, cfg.BootstrapAdminUser, cfg.BootstrapAdminPassword)

	return &Container{
		Config:  cfg,
		Runtime: runtime,
		Logger:  logger,
		PG:      pg,
		Redis:   rd,
		Storage: store,
		JWT:     auth.New(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTTTL),
		Setup:   setupSvc,
	}, nil
}

func (c *Container) Close() {
	if c.PG != nil {
		c.PG.Close()
	}
	if c.Redis != nil {
		_ = c.Redis.Close()
	}
}
