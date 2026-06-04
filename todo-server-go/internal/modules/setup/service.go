package setup

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"todo-server-go/internal/config"
	baseModule "todo-server-go/internal/modules/base"
)

var (
	ErrSetupAlreadyCompleted = errors.New("setup already completed")
	ErrInvalidSetupInput     = errors.New("invalid setup input")
	ErrAdminNotFound         = errors.New("bootstrap admin not found")
)

type Service struct {
	pool               *pgxpool.Pool
	users              baseModule.UserRepository
	dataDir            string
	appCfg             config.Config
	bootstrapUser      string
	bootstrapPassword  string
}

func NewService(pool *pgxpool.Pool, users baseModule.UserRepository, dataDir string, appCfg config.Config, bootstrapUser, bootstrapPassword string) *Service {
	return &Service{
		pool:              pool,
		users:             users,
		dataDir:           dataDir,
		appCfg:            appCfg,
		bootstrapUser:     bootstrapUser,
		bootstrapPassword: bootstrapPassword,
	}
}

func (s *Service) loadRuntime() (config.RuntimeConfig, error) {
	cfg, err := config.LoadRuntimeConfig(s.dataDir)
	if err != nil {
		return config.DefaultRuntimeConfig(s.appCfg.StorageMode, s.appCfg.DatabaseMode), nil
	}
	return cfg, nil
}

func (s *Service) Status(ctx context.Context) (StatusResponse, error) {
	runtime, _ := s.loadRuntime()
	count, err := countUsers(ctx, s.pool)
	if err != nil {
		return StatusResponse{}, err
	}

	storageMode := config.EffectiveStorageMode(s.appCfg.StorageMode, runtime)
	dbMode := config.EffectiveDatabaseMode(s.appCfg.DatabaseMode, runtime)

	return StatusResponse{
		SetupRequired:   !runtime.SetupCompleted,
		UserCount:       count,
		StorageMode:     storageMode,
		DatabaseMode:    dbMode,
		RestartRequired: runtime.RestartRequired,
		Storage: StorageStatus{
			ModeValue: storageMode,
			Options:   []string{"embedded-minio", "local", "external-s3"},
			Endpoint:  pickStorageEndpoint(storageMode, s.appCfg, runtime),
			Bucket:    pickStorageBucket(storageMode, s.appCfg, runtime),
			LocalPath: pickLocalPath(s.appCfg, runtime),
		},
		Database: DatabaseStatus{
			Mode:    dbMode,
			Options: []string{"embedded", "external"},
			Host:    pickDatabaseHost(dbMode, s.appCfg, runtime),
			Name:    pickDatabaseName(dbMode, s.appCfg, runtime),
		},
		Bootstrap: BootstrapInfo{
			Username:            s.bootstrapUser,
			HasDefaultPassword:  s.bootstrapPassword != "",
			DefaultPasswordHint: "安装日志中的 BOOTSTRAP_ADMIN_PASSWORD，或查看服务器 .env",
		},
	}, nil
}

func (s *Service) Complete(ctx context.Context, req CompleteRequest) (CompleteResponse, error) {
	runtime, _ := s.loadRuntime()
	if runtime.SetupCompleted {
		return CompleteResponse{}, ErrSetupAlreadyCompleted
	}

	adminPassword := strings.TrimSpace(req.AdminPassword)
	confirm := strings.TrimSpace(req.AdminPasswordConfirm)
	if adminPassword == "" || len(adminPassword) < 8 || adminPassword != confirm {
		return CompleteResponse{}, ErrInvalidSetupInput
	}

	admin, err := s.users.FindByUsername(s.bootstrapUser)
	if err != nil {
		return CompleteResponse{}, ErrAdminNotFound
	}
	hash, err := bcryptGenerate(adminPassword)
	if err != nil {
		return CompleteResponse{}, err
	}
	if _, err := s.users.UpdateUser(admin.ID, baseModule.UserUpdateInput{NewPasswordHash: hash}); err != nil {
		return CompleteResponse{}, err
	}

	storageMode := strings.TrimSpace(req.StorageMode)
	if storageMode == "" {
		storageMode = "embedded-minio"
	}
	dbMode := strings.TrimSpace(req.DatabaseMode)
	if dbMode == "" {
		dbMode = "embedded"
	}

	restartRequired := storageMode != "embedded-minio" || dbMode == "external"
	if dbMode == "external" && strings.TrimSpace(req.Database.DSN) == "" {
		return CompleteResponse{}, ErrInvalidSetupInput
	}
	if storageMode == "external-s3" && strings.TrimSpace(req.Storage.Endpoint) == "" {
		return CompleteResponse{}, ErrInvalidSetupInput
	}

	localPath := strings.TrimSpace(req.Storage.LocalPath)
	if storageMode == "local" && localPath == "" {
		localPath = s.appCfg.LocalStoragePath
	}

	runtime = config.RuntimeConfig{
		SetupCompleted:  true,
		StorageMode:     storageMode,
		DatabaseMode:    dbMode,
		RestartRequired: restartRequired,
		Storage: config.StorageRuntimeConfig{
			Endpoint:  strings.TrimSpace(req.Storage.Endpoint),
			AccessKey: strings.TrimSpace(req.Storage.AccessKey),
			SecretKey: strings.TrimSpace(req.Storage.SecretKey),
			Bucket:    strings.TrimSpace(req.Storage.Bucket),
			Secure:    req.Storage.Secure,
			LocalPath: localPath,
		},
		Database: config.DatabaseRuntimeConfig{
			DSN:  strings.TrimSpace(req.Database.DSN),
			Host: strings.TrimSpace(req.Database.Host),
			Port: req.Database.Port,
			Name: strings.TrimSpace(req.Database.Name),
			User: strings.TrimSpace(req.Database.User),
		},
	}
	if err := config.SaveRuntimeConfig(s.dataDir, runtime); err != nil {
		return CompleteResponse{}, err
	}

	msg := "初始化完成，请使用新密码登录。"
	if restartRequired {
		msg = "配置已保存。使用外部数据库或 S3 时请执行: docker compose restart api"
	}

	return CompleteResponse{
		Message:         msg,
		RestartRequired: restartRequired,
		SetupURL:        "/login",
	}, nil
}
