package config

import "strings"

func MergedPostgresDSN(app Config, runtime RuntimeConfig) string {
	if EffectiveDatabaseMode(app.DatabaseMode, runtime) == "external" {
		dsn := strings.TrimSpace(runtime.Database.DSN)
		if dsn != "" {
			return dsn
		}
	}
	return app.PostgresDSN
}
