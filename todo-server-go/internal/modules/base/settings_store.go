package base

import (
	"context"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SystemSettings struct {
	SiteTitle       string `json:"site_title"`
	SiteSubtitle    string `json:"site_subtitle"`
	SiteDescription string `json:"site_description"`
	FaviconURL      string `json:"favicon_url"`
	SmtpHost        string `json:"smtp_host"`
	SmtpPort        int    `json:"smtp_port"`
	SmtpUser        string `json:"smtp_user"`
	SmtpPassword    string `json:"smtp_password,omitempty"`
	SmtpFrom        string `json:"smtp_from"`
	InquiryEmail    string `json:"inquiry_email"`
}

type PublicSettings struct {
	SiteTitle       string `json:"site_title"`
	SiteSubtitle    string `json:"site_subtitle"`
	SiteDescription string `json:"site_description"`
	FaviconURL      string `json:"favicon_url"`
}

type settingsStore struct {
	pool *pgxpool.Pool
}

func newSettingsStore(pool *pgxpool.Pool) *settingsStore {
	return &settingsStore{pool: pool}
}

func (s *settingsStore) GetAll(ctx context.Context) (SystemSettings, error) {
	rows, err := s.pool.Query(ctx, `SELECT key, value FROM system_settings`)
	if err != nil {
		return SystemSettings{}, err
	}
	defer rows.Close()

	kv := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return SystemSettings{}, err
		}
		kv[k] = v
	}
	if err := rows.Err(); err != nil {
		return SystemSettings{}, err
	}
	return mapSettings(kv), nil
}

func (s *settingsStore) GetPublic(ctx context.Context) (PublicSettings, error) {
	all, err := s.GetAll(ctx)
	if err != nil {
		return PublicSettings{}, err
	}
	return PublicSettings{
		SiteTitle:       all.SiteTitle,
		SiteSubtitle:    all.SiteSubtitle,
		SiteDescription: all.SiteDescription,
		FaviconURL:      all.FaviconURL,
	}, nil
}

func (s *settingsStore) Save(ctx context.Context, in SystemSettings) error {
	pairs := settingsToMap(in)
	for k, v := range pairs {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO system_settings (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, k, v)
		if err != nil {
			return err
		}
	}
	return nil
}

func mapSettings(kv map[string]string) SystemSettings {
	port, _ := strconv.Atoi(kv["smtp_port"])
	return SystemSettings{
		SiteTitle:       kv["site_title"],
		SiteSubtitle:    kv["site_subtitle"],
		SiteDescription: kv["site_description"],
		FaviconURL:      kv["favicon_url"],
		SmtpHost:        kv["smtp_host"],
		SmtpPort:        port,
		SmtpUser:        kv["smtp_user"],
		SmtpPassword:    kv["smtp_password"],
		SmtpFrom:        kv["smtp_from"],
		InquiryEmail:    kv["inquiry_email"],
	}
}

func settingsToMap(in SystemSettings) map[string]string {
	out := map[string]string{
		"site_title":       strings.TrimSpace(in.SiteTitle),
		"site_subtitle":    strings.TrimSpace(in.SiteSubtitle),
		"site_description": strings.TrimSpace(in.SiteDescription),
		"favicon_url":      strings.TrimSpace(in.FaviconURL),
		"smtp_host":        strings.TrimSpace(in.SmtpHost),
		"smtp_port":        strconv.Itoa(in.SmtpPort),
		"smtp_user":        strings.TrimSpace(in.SmtpUser),
		"smtp_from":        strings.TrimSpace(in.SmtpFrom),
		"inquiry_email":    strings.TrimSpace(in.InquiryEmail),
	}
	if strings.TrimSpace(in.SmtpPassword) != "" {
		out["smtp_password"] = in.SmtpPassword
	}
	return out
}

func maskSettings(in SystemSettings) SystemSettings {
	if in.SmtpPassword != "" {
		in.SmtpPassword = "********"
	}
	return in
}
