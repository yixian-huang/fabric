package mail

import (
	"fmt"
	"net/smtp"
	"strings"
)

type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

func (c Config) Enabled() bool {
	return strings.TrimSpace(c.Host) != "" && c.Port > 0 && strings.TrimSpace(c.From) != ""
}

type Message struct {
	To      string
	Subject string
	Body    string
}

func Send(cfg Config, msg Message) error {
	if !cfg.Enabled() {
		return fmt.Errorf("smtp not configured")
	}
	to := strings.TrimSpace(msg.To)
	if to == "" {
		return fmt.Errorf("recipient required")
	}

	from := strings.TrimSpace(cfg.From)
	if cfg.User != "" {
		from = strings.TrimSpace(cfg.From)
	}

	headers := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + msg.Subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		msg.Body,
	}
	payload := strings.Join(headers, "\r\n")

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	var auth smtp.Auth
	if strings.TrimSpace(cfg.User) != "" {
		auth = smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, []byte(payload))
}
