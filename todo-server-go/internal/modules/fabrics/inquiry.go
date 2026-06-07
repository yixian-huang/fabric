package fabrics

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"todo-server-go/internal/config"
	"todo-server-go/internal/infra/mail"
)

var (
	ErrInquiryInvalidInput = errors.New("invalid inquiry input")
	ErrInquiryNotConfigured = errors.New("inquiry email not configured")
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type InquiryRequest struct {
	ReferenceCode string `json:"reference_code"`
	Email         string `json:"email"`
	Message       string `json:"message"`
}

type InquiryService struct {
	cfg    config.Config
	svc    *Service
	logger *slog.Logger
}

func NewInquiryService(cfg config.Config, svc *Service, logger *slog.Logger) *InquiryService {
	if logger == nil {
		logger = slog.Default()
	}
	return &InquiryService{cfg: cfg, svc: svc, logger: logger}
}

func (is *InquiryService) Submit(ctx context.Context, req InquiryRequest) error {
	ref := strings.TrimSpace(req.ReferenceCode)
	emailAddr := strings.TrimSpace(req.Email)
	message := strings.TrimSpace(req.Message)

	if ref == "" || emailAddr == "" || message == "" {
		return ErrInquiryInvalidInput
	}
	if len(message) > 5000 {
		return ErrInquiryInvalidInput
	}
	if !emailPattern.MatchString(emailAddr) {
		return ErrInquiryInvalidInput
	}

	to := strings.TrimSpace(is.cfg.InquiryToEmail)
	if to == "" {
		return ErrInquiryNotConfigured
	}

	fabric, err := is.svc.GetPublicByReferenceCode(ref)
	if err != nil {
		return err
	}

	subject := fmt.Sprintf("[Fabric Inquiry] %s — %s", fabric.ReferenceCode, fabric.Code)
	body := strings.Join([]string{
		"New fabric inquiry",
		"",
		fmt.Sprintf("Reference: %s", fabric.ReferenceCode),
		fmt.Sprintf("Fabric code: %s-%s", fabric.Code, fabric.MerchantCode),
		fmt.Sprintf("From email: %s", emailAddr),
		"",
		"Message:",
		message,
		"",
	}, "\n")

	if fabric.ThumbnailURL != "" {
		body += fmt.Sprintf("Thumbnail: %s\n", fabric.ThumbnailURL)
	}
	if fabric.WatermarkImageURL != "" {
		body += fmt.Sprintf("Image: %s\n", fabric.WatermarkImageURL)
	}

	mailCfg := mail.Config{
		Host:     is.cfg.SMTPHost,
		Port:     is.cfg.SMTPPort,
		User:     is.cfg.SMTPUser,
		Password: is.cfg.SMTPPassword,
		From:     is.cfg.SMTPFrom,
	}

	if mailCfg.Enabled() {
		return mail.Send(mailCfg, mail.Message{
			To:      to,
			Subject: subject,
			Body:    body,
		})
	}

	is.logger.Info("fabric inquiry (smtp not configured, logged only)",
		"to", to,
		"reference_code", fabric.ReferenceCode,
		"from_email", emailAddr,
		"message", message,
	)
	return nil
}
