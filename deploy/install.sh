#!/usr/bin/env bash
# Fabric 线上一键安装（仅下载部署清单 + 拉取预构建镜像，不含源码）
#
# 用户一行命令（默认交互，每步可回车）:
#   curl -fsSL http://<host>:18081/install.sh | bash
#
# 非交互（默认 sqlite + 本地盘）:
#   curl -fsSL http://<host>:18081/install.sh | bash -s -- -y --port 8088
#
# 指定版本 / 目录:
#   curl -fsSL http://<host>:18081/install.sh | bash -s -- --version 1.0.0 --dir /opt/fabric
#
# 环境变量（可选）:
#   FABRIC_INSTALL_BASE  安装包 CDN 根 URL（publish-release 会写入发布默认值）
#   FABRIC_VERSION       版本号，默认 latest
#   FABRIC_INSTALL_DIR   安装目录，默认 $HOME/fabric
#
set -euo pipefail

FABRIC_INSTALL_BASE="${FABRIC_INSTALL_BASE:-https://get.fabricoption.com}"
FABRIC_VERSION="${FABRIC_VERSION:-latest}"
FABRIC_INSTALL_DIR="${FABRIC_INSTALL_DIR:-$HOME/fabric}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[fabric]${NC} $*"; }
warn()  { echo -e "${YELLOW}[fabric]${NC} $*"; }
error() { echo -e "${RED}[fabric]${NC} $*" >&2; }

usage() {
  cat <<'EOF'
Fabric 一键安装

用法:
  curl -fsSL http://<host>:18081/install.sh | bash
  curl -fsSL http://<host>:18081/install.sh | bash -s -- [选项]

选项:
  --version, -v VERSION   安装版本 (默认: latest)
  --dir, -d PATH          安装目录 (默认: ~/fabric)
  --port, -p PORT         对外 HTTP 端口 (默认: 8088)
  --admin-user USER       默认管理员用户名
  --admin-password PASS   默认管理员密码
  --db MODE               sqlite | external | setup
  --storage MODE          local | minio | external-s3 | setup
  --postgres-dsn URL      外部库 DSN（--db external 时必填）
  --base-url URL          安装包 CDN 地址
  --skip-checksum         跳过文件校验（不推荐）
  -y, --yes               跳过交互（默认 sqlite + 本地盘）
  --upgrade, -U           升级模式（保留 .env，仅更新清单与镜像）
  --reconfigure           已有安装时仍走完整配置向导
  -h, --help              显示帮助

环境变量:
  FABRIC_INSTALL_BASE  FABRIC_VERSION  FABRIC_INSTALL_DIR
EOF
}

parse_args() {
  SKIP_CHECKSUM=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version|-v) FABRIC_VERSION="$2"; shift 2 ;;
      --dir|-d) FABRIC_INSTALL_DIR="$2"; shift 2 ;;
      --port|-p) HTTP_PORT="$2"; shift 2 ;;
      --admin-user) BOOTSTRAP_ADMIN_USER="$2"; shift 2 ;;
      --admin-password) BOOTSTRAP_ADMIN_PASSWORD="$2"; shift 2 ;;
      --storage) FABRIC_STORAGE_PROFILE="$2"; shift 2 ;;
      --db) FABRIC_DB_PROFILE="$2"; shift 2 ;;
      --postgres-dsn) POSTGRES_DSN="$2"; shift 2 ;;
      --base-url) FABRIC_INSTALL_BASE="$2"; shift 2 ;;
      --skip-checksum) SKIP_CHECKSUM=1; shift ;;
      -y|--yes) FABRIC_YES=1; shift ;;
      --upgrade|-U) FABRIC_UPGRADE=1; shift ;;
      --reconfigure) FABRIC_RECONFIGURE=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) error "未知参数: $1"; usage; exit 1 ;;
    esac
  done
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "未找到命令: $1"
    exit 1
  fi
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    error "需要 sha256sum 或 shasum 以校验安装包"
    exit 1
  fi
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    error "需要 Docker Compose v2（docker compose）"
    exit 1
  fi
}

# 安装目录尚未就绪时，从 CDN 预加载 install-lib（供交互 / TTY 附着）
bootstrap_install_lib() {
  local base="${FABRIC_INSTALL_BASE%/}"
  local ver="${FABRIC_VERSION:-latest}"
  local tmp
  tmp="$(mktemp -d)"
  download "${base}/releases/${ver}/install-lib-compose.sh" "$tmp/install-lib-compose.sh"
  download "${base}/releases/${ver}/install-lib.sh" "$tmp/install-lib.sh"
  # shellcheck source=install-lib.sh
  source "$tmp/install-lib.sh"
  rm -rf "$tmp"
}

download() {
  local url="$1"
  local dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    error "需要 curl 或 wget"
    exit 1
  fi
}

verify_file_checksum() {
  local file="$1"
  local expected="$2"
  [[ -z "$expected" ]] && return 0
  local actual
  actual="$(sha256_file "$file")"
  if [[ "$actual" != "$expected" ]]; then
    error "校验失败: $(basename "$file") (expected $expected, got $actual)"
    exit 1
  fi
}

json_get() {
  # 简单 JSON 字符串提取（避免依赖 jq/python）
  local key="$1"
  local file="$2"
  { grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$file" || true; } \
    | head -1 | sed 's/.*"\([^"]*\)"$/\1/'
}

json_nested_get() {
  local section="$1"
  local key="$2"
  local file="$3"
  sed -n "/\"${section}\"/,/}/p" "$file" \
    | { grep "\"${key}\"" || true; } \
    | head -1 \
    | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/'
}

fetch_release() {
  local release_url="${FABRIC_INSTALL_BASE%/}/releases/${FABRIC_VERSION}"
  local manifest_url="${release_url}/manifest.json"

  info "下载发布清单: ${manifest_url}"
  download "$manifest_url" "$FABRIC_INSTALL_DIR/manifest.json"

  RESOLVED_VERSION="$(json_get version "$FABRIC_INSTALL_DIR/manifest.json")"
  [[ -n "$RESOLVED_VERSION" ]] && FABRIC_VERSION="$RESOLVED_VERSION"

  IMAGE_API="$(json_nested_get images api "$FABRIC_INSTALL_DIR/manifest.json")"
  IMAGE_WEB="$(json_nested_get images web "$FABRIC_INSTALL_DIR/manifest.json")"
  IMAGE_TABLE="$(json_nested_get images table "$FABRIC_INSTALL_DIR/manifest.json")"

  if [[ -z "$IMAGE_API" || -z "$IMAGE_WEB" || -z "$IMAGE_TABLE" ]]; then
    error "manifest.json 缺少镜像地址"
    exit 1
  fi

  info "版本 ${FABRIC_VERSION} | API=${IMAGE_API}"

  local files=(docker-compose.yml nginx.conf env.example install-lib.sh install-lib-compose.sh)
  for f in "${files[@]}"; do
    info "下载 ${f}..."
    download "${release_url}/${f}" "$FABRIC_INSTALL_DIR/${f}"
    if [[ "$SKIP_CHECKSUM" -eq 0 ]]; then
      local expected
      expected="$(json_nested_get files "${f}" "$FABRIC_INSTALL_DIR/manifest.json")"
      if [[ -n "$expected" ]]; then
        verify_file_checksum "$FABRIC_INSTALL_DIR/${f}" "$expected"
      else
        warn "manifest 未提供 ${f} 校验和，跳过"
      fi
    fi
  done
}

ensure_env() {
  local lib_dir="$FABRIC_INSTALL_DIR"
  if [[ ! -f "$lib_dir/install-lib.sh" ]]; then
    error "缺少 install-lib.sh，请重新下载安装包"
    exit 1
  fi
  # shellcheck source=install-lib.sh
  source "$lib_dir/install-lib.sh"

  local had_env=0
  [[ -f .env ]] && had_env=1

  if [[ -f env.example && ! -f .env ]]; then
    cp env.example .env
  fi
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -a && source .env && set +a
  fi

  install_lib_load_env_defaults

  local upgrade_mode=0
  if [[ "${FABRIC_UPGRADE:-0}" == "1" ]] || install_lib_should_skip_configure "$had_env"; then
    upgrade_mode=1
  fi

  if [[ "$upgrade_mode" -eq 1 ]]; then
    info "升级模式：保留现有 .env，更新部署清单与镜像（--reconfigure 可重新配置）"
    install_lib_apply_stack_defaults
  elif install_lib_is_interactive; then
    install_lib_interactive_configure "$had_env"
  else
    install_lib_print_noninteractive_hint
  fi

  if [[ "$upgrade_mode" -ne 1 ]]; then
    install_lib_finalize_secrets
  fi
  install_lib_apply_stack_defaults

  if [[ "${FABRIC_DB_PROFILE}" == "external" && -z "${POSTGRES_DSN}" ]]; then
    error "使用外部数据库时请设置 POSTGRES_DSN 或 --postgres-dsn"
    exit 1
  fi

  local manifest_version
  manifest_version="$(json_get version "$lib_dir/manifest.json")"
  [[ -n "$manifest_version" ]] && FABRIC_VERSION="$manifest_version"
  FABRIC_IMAGE_API="${IMAGE_API}"
  FABRIC_IMAGE_WEB="${IMAGE_WEB}"
  FABRIC_IMAGE_TABLE="${IMAGE_TABLE}"

  local skip_finalize=0
  [[ "$upgrade_mode" -eq 1 ]] && skip_finalize=1
  install_lib_write_env_file .env "$skip_finalize"

  install_lib_generate_compose docker-compose.yml
  install_lib_compose_services_to_pull

  info "环境配置已就绪 (v${FABRIC_VERSION})"
  info "将拉取镜像: ${COMPOSE_PULL_SERVICES[*]}"
}

wait_for_api() {
  local port="${HTTP_PORT:-8088}"
  info "等待服务就绪..."
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  warn "健康检查超时，请查看: ${COMPOSE[*]} logs api gateway"
  return 1
}

main() {
  parse_args "$@"

  require_cmd docker
  require_cmd curl
  detect_compose

  if ! docker info >/dev/null 2>&1; then
    error "Docker 未运行"
    exit 1
  fi

  bootstrap_install_lib
  install_lib_attach_tty_for_interactive

  mkdir -p "$FABRIC_INSTALL_DIR"
  local had_install=0
  [[ -f "${FABRIC_INSTALL_DIR}/.env" ]] && had_install=1

  if [[ "$had_install" -eq 1 && "${FABRIC_RECONFIGURE:-0}" != "1" ]]; then
    FABRIC_UPGRADE=1
  fi

  if install_lib_can_prompt; then
    local dir_label="安装目录"
    [[ "${FABRIC_UPGRADE:-0}" == "1" ]] && dir_label="升级目录"
    local dir_input
    dir_input="$(install_lib_prompt FABRIC_INSTALL_DIR "$dir_label" "${FABRIC_INSTALL_DIR}")"
    [[ -n "$dir_input" ]] && FABRIC_INSTALL_DIR="$dir_input"
  fi

  cd "$FABRIC_INSTALL_DIR"

  fetch_release
  ensure_env
  local upgrade_mode="${FABRIC_UPGRADE:-0}"
  [[ -f .env ]] && [[ "${FABRIC_RECONFIGURE:-0}" != "1" ]] && upgrade_mode=1

  # shellcheck disable=SC1091
  set -a && source .env && set +a

  info "拉取预构建镜像（不含源码）..."
  "${COMPOSE[@]}" -f docker-compose.yml pull "${COMPOSE_PULL_SERVICES[@]}"

  info "启动服务..."
  local up_args=(-d)
  # 升级时必须重建容器，否则 pull 新镜像后仍跑旧容器（静态资源 404）
  if [[ "$upgrade_mode" == "1" ]]; then
    up_args+=(--force-recreate --pull always)
  fi
  "${COMPOSE[@]}" -f docker-compose.yml up "${up_args[@]}" "${COMPOSE_PULL_SERVICES[@]}"

  wait_for_api || true

  if ! install_lib_verify_frontend; then
    warn "前端校验未通过，尝试强制重建 web/table/gateway..."
    "${COMPOSE[@]}" -f docker-compose.yml up -d --force-recreate todo-web todo-table gateway
    sleep 3
    install_lib_verify_frontend || warn "仍有问题：请检查 .env 中 FABRIC_IMAGE_WEB / FABRIC_IMAGE_TABLE 是否对应 fabric-web / fabric-table 镜像"
  fi

  local host
  host="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  [[ -z "$host" ]] && host="127.0.0.1"

  install_lib_print_success "$host" "${COMPOSE[*]} -f docker-compose.yml" "$upgrade_mode"
  echo "  安装目录: ${FABRIC_INSTALL_DIR} (v${FABRIC_VERSION})"
  echo "  再次升级: curl -fsSL ${FABRIC_INSTALL_BASE%/}/install.sh | bash -s -- --dir ${FABRIC_INSTALL_DIR} -y"
  echo "  重新配置: curl -fsSL ${FABRIC_INSTALL_BASE%/}/install.sh | bash -s -- --dir ${FABRIC_INSTALL_DIR} --reconfigure"
  echo "  停止: cd ${FABRIC_INSTALL_DIR} && ${COMPOSE[*]} -f docker-compose.yml down"
}

main "$@"
