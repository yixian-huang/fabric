#!/usr/bin/env bash
# Fabric 本地开发一键安装（从源码构建，供开发者使用）
# 线上用户请使用:
#   curl -fsSL https://get.fabricoption.com/install.sh | bash
#
# 交互式安装（可改端口等）:
#   ./install.sh
#
# 非交互 / 管道安装:
#   ./install.sh --yes
#   ./install.sh --port 9000 --admin-user admin --admin-password 'your-pass'
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[fabric]${NC} $*"; }
warn()  { echo -e "${YELLOW}[fabric]${NC} $*"; }
error() { echo -e "${RED}[fabric]${NC} $*" >&2; }

# shellcheck source=scripts/install-lib.sh
source "$ROOT/scripts/install-lib.sh"

usage() {
  cat <<'EOF'
Fabric 本地安装（源码构建）

用法:
  ./install.sh [选项]

选项:
  --port, -p PORT           对外 HTTP 端口 (默认: 8088)
  --admin-user USER         默认管理员用户名 (默认: admin)
  --admin-password PASS     默认管理员密码 (留空则自动生成)
  --storage MODE            embedded-minio | local
  -y, --yes                 跳过交互确认，使用参数/默认值
  -h, --help                显示帮助
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --port|-p) HTTP_PORT="$2"; shift 2 ;;
      --admin-user) BOOTSTRAP_ADMIN_USER="$2"; shift 2 ;;
      --admin-password) BOOTSTRAP_ADMIN_PASSWORD="$2"; shift 2 ;;
      --db) FABRIC_DB_PROFILE="$2"; shift 2 ;;
      --storage) FABRIC_STORAGE_PROFILE="$2"; shift 2 ;;
      --postgres-dsn) POSTGRES_DSN="$2"; shift 2 ;;
      -y|--yes) FABRIC_YES=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) error "未知参数: $1"; usage; exit 1 ;;
    esac
  done
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    error "需要 Docker Compose v2（docker compose）或 docker-compose"
    exit 1
  fi
}

wait_for_api() {
  local port="${HTTP_PORT:-8088}"
  local max=60
  info "等待 API 就绪（最多 ${max}s）..."
  for ((i=1; i<=max; i++)); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  warn "健康检查超时，请运行: ${COMPOSE[*]} ps && ${COMPOSE[*]} logs api gateway"
  return 1
}

prepare_env() {
  local had_env=0
  [[ -f .env ]] && had_env=1

  if [[ ! -f .env ]]; then
    [[ -f .env.example ]] && cp .env.example .env
  fi

  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -a && source .env && set +a
  fi

  install_lib_load_env_defaults

  if install_lib_is_interactive; then
    install_lib_interactive_configure "$had_env"
  else
    install_lib_print_noninteractive_hint
  fi

  install_lib_write_env_file .env
  install_lib_generate_compose docker-compose.yml
  install_lib_compose_services_to_pull
  info "配置已写入 .env（数据库=${FABRIC_DB_PROFILE} 存储=${FABRIC_STORAGE_PROFILE}）"
  info "将启动服务: ${COMPOSE_PULL_SERVICES[*]}"
  # shellcheck disable=SC1091
  set -a && source .env && set +a
}

main() {
  parse_args "$@"

  if ! command -v docker >/dev/null 2>&1; then
    error "未找到 docker"
    exit 1
  fi
  detect_compose

  if ! docker info >/dev/null 2>&1; then
    error "Docker 未运行，请先启动 Docker / Container Manager"
    exit 1
  fi

  prepare_env

  info "构建并启动服务..."
  "${COMPOSE[@]}" up -d --build "${COMPOSE_PULL_SERVICES[@]}"

  wait_for_api || true

  local host
  host="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  [[ -z "$host" ]] && host="127.0.0.1"

  install_lib_print_success "$host" "${COMPOSE[*]}"
  echo "  日志: ${COMPOSE[*]} logs -f api gateway"
}

main "$@"
