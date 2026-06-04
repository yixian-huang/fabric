# Fabric API (Go) + 内置 nginx（/api + /install.sh + /releases/）

FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY db/ ./db/

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/fabric-api ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget nginx supervisor \
 && adduser -D -u 1000 -h /app app \
 && mkdir -p /app/data /app/install-www /var/log/nginx /run/nginx \
 && chown -R app:app /app/data /app/install-www

WORKDIR /app

COPY --from=builder /out/fabric-api /app/fabric-api
COPY db/migrations /app/db/migrations
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

ENV HTTP_ADDR=:8081
ENV MIGRATIONS_DIR=/app/db/migrations

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
