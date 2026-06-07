package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"todo-server-go/internal/app"
	"todo-server-go/internal/config"
	"todo-server-go/internal/http/router"
	baseModule "todo-server-go/internal/modules/base"
	fabricsModule "todo-server-go/internal/modules/fabrics"
	setupModule "todo-server-go/internal/modules/setup"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	container, err := app.New(ctx, cfg, logger)
	if err != nil {
		log.Fatalf("init container failed: %v", err)
	}
	defer container.Close()

	baseBinder := baseModule.NewBinder(container.PG, container.JWT, container.Storage)
	fabricsBinder := fabricsModule.NewBinder(container.PG, container.Storage, cfg, logger)
	setupBinder := setupModule.NewBinder(container.Setup)

	r := router.New(container.JWT, baseBinder, fabricsBinder, setupBinder)
	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("http server starting", "addr", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}
