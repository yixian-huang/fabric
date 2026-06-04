#!/usr/bin/env bash
# 安装脚本共享库：交互式前置配置 + .env 写入
# 被 install.sh / deploy/install.sh source

_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=install-lib-compose.sh
source "$_LIB_DIR/install-lib-compose.sh"

install_lib_prompt() {
  local var="$1"
  local label="$2"
  local default="$3"
  local secret="${4:-0}"
  local input
  if [[ "$secret" -eq 1 ]]; then
    read -r -s -p "${label} [${default}]: " input
    echo ""
  else
    read -r -p "${label} [${default}]: " input
  fi
  if [[ -z "$input" ]]; then
    printf '%s' "$default"
  else
    printf '%s' "$input"
  fi
}

install_lib_is_interactive() {
  [[ -t 0 && -t 1 ]] && [[ "${FABRIC_NONINTERACTIVE:-0}" != "1" ]] && [[ "${FABRIC_YES:-0}" != "1" ]]
}

install_lib_is_valid_port() {
  local p="$1"
  [[ "$p" =~ ^[0-9]+$ ]] || return 1
  (( p >= 1 && p <= 65535 ))
}

install_lib_port_in_use() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -q ":${p} "
    return $?
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":${p}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  return 1
}

install_lib_random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

install_lib_random_admin_password() {
  install_lib_random_secret | cut -c1-16
}

# 从 .env、CLI、环境变量合并配置到当前 shell 变量
install_lib_load_env_defaults() {
  HTTP_PORT="${HTTP_PORT:-8088}"
  POSTGRES_DB="${POSTGRES_DB:-fabric}"
  POSTGRES_USER="${POSTGRES_USER:-fabric}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-postgres}"
  MINIO_ROOT_USER="${MINIO_ROOT_USER:-fabric}"
  MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-change-me-minio}"
  MINIO_BUCKET="${MINIO_BUCKET:-fabric}"
  JWT_SECRET="${JWT_SECRET:-change-me-jwt-secret}"
  BOOTSTRAP_ADMIN_USER="${BOOTSTRAP_ADMIN_USER:-admin}"
  BOOTSTRAP_ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-change-me-admin}"
  FABRIC_DB_PROFILE="${FABRIC_DB_PROFILE:-embedded}"
  FABRIC_STORAGE_PROFILE="${FABRIC_STORAGE_PROFILE:-local}"
  STORAGE_MODE="${STORAGE_MODE:-local}"
  DATABASE_MODE="${DATABASE_MODE:-embedded}"
  POSTGRES_DSN="${POSTGRES_DSN:-}"
}

install_lib_apply_stack_defaults() {
  case "${FABRIC_DB_PROFILE}" in
    embedded|setup|external) ;;
    *) FABRIC_DB_PROFILE=embedded ;;
  esac
  case "${FABRIC_STORAGE_PROFILE}" in
    local|minio|external-s3|setup) ;;
    *) FABRIC_STORAGE_PROFILE=local ;;
  esac
  if [[ "${FABRIC_STORAGE_PROFILE}" == "minio" ]]; then
    STORAGE_MODE=embedded-minio
  elif [[ "${FABRIC_STORAGE_PROFILE}" == "external-s3" ]]; then
    STORAGE_MODE=external-s3
  else
    STORAGE_MODE=local
  fi
  if [[ "${FABRIC_DB_PROFILE}" == "external" ]]; then
    DATABASE_MODE=external
  else
    DATABASE_MODE=embedded
  fi
}

install_lib_interactive_stack_profiles() {
  local db_input storage_input
  echo ""
  echo "  数据库（当前后端仅支持 PostgreSQL，不支持 SQLite）"
  echo "    1) embedded   内置 PostgreSQL 容器（推荐新装）"
  echo "    2) external   已有 PostgreSQL，安装时填写连接串"
  echo "    3) setup       先用内置库启动，稍后在 /setup 页面改外部库"
  db_input="$(install_lib_prompt FABRIC_DB "请选择 [1/2/3]" "1")"
  case "$db_input" in
    2|external)
      FABRIC_DB_PROFILE=external
      POSTGRES_DSN="$(install_lib_prompt POSTGRES_DSN "POSTGRES_DSN" "postgres://fabric:password@host:5432/fabric?sslmode=disable")"
      ;;
    3|setup)
      FABRIC_DB_PROFILE=setup
      ;;
    *)
      FABRIC_DB_PROFILE=embedded
      ;;
  esac

  echo ""
  echo "  文件/对象存储"
  echo "    1) local         磁盘目录（推荐，镜像最少）"
  echo "    2) minio         内置 MinIO"
  echo "    3) external-s3   外部 S3 / RustFS（安装后 /setup 填 endpoint）"
  echo "    4) setup         先用本地磁盘，稍后在 /setup 配置"
  storage_input="$(install_lib_prompt FABRIC_STORAGE "请选择 [1/2/3/4]" "1")"
  case "$storage_input" in
    2|minio) FABRIC_STORAGE_PROFILE=minio ;;
    3|external-s3|rustfs|s3) FABRIC_STORAGE_PROFILE=external-s3 ;;
    4|setup) FABRIC_STORAGE_PROFILE=setup ;;
    *) FABRIC_STORAGE_PROFILE=local ;;
  esac
  install_lib_apply_stack_defaults
}

install_lib_interactive_configure() {
  local existing="${1:-0}"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Fabric 安装配置（可直接回车使用默认值）"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [[ "$existing" -eq 1 ]]; then
    warn_msg "检测到已有 .env"
    local reuse
    reuse="$(install_lib_prompt REUSE "是否保留现有配置并继续? (y/N)" "N")"
    case "$(printf '%s' "$reuse" | tr '[:upper:]' '[:lower:]')" in
      y|yes) return 0 ;;
    esac
    echo ""
  fi

  local port_input admin_user_input admin_pass_input storage_input
  while true; do
    port_input="$(install_lib_prompt HTTP_PORT "对外 HTTP 端口" "${HTTP_PORT}")"
    if install_lib_is_valid_port "$port_input"; then
      if install_lib_port_in_use "$port_input"; then
        warn_msg "端口 ${port_input} 已被占用，请换一个"
        continue
      fi
      HTTP_PORT="$port_input"
      break
    fi
    warn_msg "请输入 1-65535 的有效端口"
  done

  admin_user_input="$(install_lib_prompt BOOTSTRAP_ADMIN_USER "默认管理员用户名" "${BOOTSTRAP_ADMIN_USER}")"
  BOOTSTRAP_ADMIN_USER="$admin_user_input"

  echo "  管理员初始密码（留空则自动生成 16 位随机密码）"
  admin_pass_input="$(install_lib_prompt BOOTSTRAP_ADMIN_PASSWORD "管理员初始密码" "")"
  if [[ -n "$admin_pass_input" ]]; then
    if [[ ${#admin_pass_input} -lt 8 ]]; then
      warn_msg "密码少于 8 位，将改为自动生成"
      BOOTSTRAP_ADMIN_PASSWORD="change-me-admin"
    else
      BOOTSTRAP_ADMIN_PASSWORD="$admin_pass_input"
    fi
  else
    BOOTSTRAP_ADMIN_PASSWORD="change-me-admin"
  fi

  install_lib_interactive_stack_profiles

  echo ""
  info_msg "配置摘要:"
  echo "  访问端口:     ${HTTP_PORT}"
  echo "  管理员:       ${BOOTSTRAP_ADMIN_USER}"
  echo "  数据库:       ${FABRIC_DB_PROFILE} (${DATABASE_MODE})"
  echo "  存储:         ${FABRIC_STORAGE_PROFILE} (${STORAGE_MODE})"
  echo ""

  local confirm confirm_lower
  confirm="$(install_lib_prompt CONFIRM "确认并开始安装? (Y/n)" "Y")"
  confirm_lower="$(printf '%s' "$confirm" | tr '[:upper:]' '[:lower:]')"
  case "$confirm_lower" in
    n|no)
      error_msg "已取消安装"
      exit 0
      ;;
  esac
}

install_lib_finalize_secrets() {
  install_lib_apply_stack_defaults
  if [[ "${FABRIC_DB_PROFILE}" == "embedded" || "${FABRIC_DB_PROFILE}" == "setup" ]]; then
    if [[ "${POSTGRES_PASSWORD}" == "change-me-postgres" || -z "${POSTGRES_PASSWORD}" ]]; then
      POSTGRES_PASSWORD="$(install_lib_random_secret)"
    fi
  fi
  if [[ "${FABRIC_STORAGE_PROFILE}" == "minio" ]]; then
    if [[ "${MINIO_ROOT_PASSWORD}" == "change-me-minio" || -z "${MINIO_ROOT_PASSWORD}" ]]; then
      MINIO_ROOT_PASSWORD="$(install_lib_random_secret)"
    fi
  fi
  if [[ "${JWT_SECRET}" == "change-me-jwt-secret" || -z "${JWT_SECRET}" ]]; then
    JWT_SECRET="$(install_lib_random_secret)"
  fi
  if [[ "${BOOTSTRAP_ADMIN_PASSWORD}" == "change-me-admin" || -z "${BOOTSTRAP_ADMIN_PASSWORD}" ]]; then
    BOOTSTRAP_ADMIN_PASSWORD="$(install_lib_random_admin_password)"
  fi
}

install_lib_write_env_file() {
  local target="${1:-.env}"
  install_lib_finalize_secrets
  cat > "$target" <<EOF
# Generated by Fabric install script — $(date -u +"%Y-%m-%dT%H:%M:%SZ")
HTTP_PORT=${HTTP_PORT}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_BUCKET=${MINIO_BUCKET}
JWT_SECRET=${JWT_SECRET}
BOOTSTRAP_ADMIN_USER=${BOOTSTRAP_ADMIN_USER}
BOOTSTRAP_ADMIN_PASSWORD=${BOOTSTRAP_ADMIN_PASSWORD}
FABRIC_DB_PROFILE=${FABRIC_DB_PROFILE}
FABRIC_STORAGE_PROFILE=${FABRIC_STORAGE_PROFILE}
DATABASE_MODE=${DATABASE_MODE}
STORAGE_MODE=${STORAGE_MODE}
POSTGRES_DSN=${POSTGRES_DSN}
EOF
}

install_lib_print_noninteractive_hint() {
  install_lib_apply_stack_defaults
  warn_msg "非交互模式：默认 内置 PostgreSQL + 本地磁盘存储（不拉 MinIO/mc）。"
  echo "  交互式安装: curl -fsSL .../install.sh -o install.sh && bash install.sh"
  echo "  参数示例:"
  echo "    --db embedded|external|setup --storage local|minio|external-s3|setup"
  echo ""
}

install_lib_print_success() {
  local host="${1:-127.0.0.1}"
  local port="${HTTP_PORT:-8088}"
  local compose_hint="${2:-docker compose}"

  echo ""
  info_msg "安装完成"
  echo "  首次配置向导:  http://${host}:${port}/setup"
  echo "  管理端:        http://${host}:${port}/"
  echo "  表格端:        http://${host}:${port}/grid/"
  echo "  健康检查:      http://${host}:${port}/healthz"
  echo ""
  echo "  默认管理员:    ${BOOTSTRAP_ADMIN_USER} / ${BOOTSTRAP_ADMIN_PASSWORD}"
  echo "  数据库/存储:   ${FABRIC_DB_PROFILE} / ${FABRIC_STORAGE_PROFILE}（/setup 可再改）"
  echo ""
  echo "  修改端口:      编辑 .env 中 HTTP_PORT 后执行 ${compose_hint} up -d"
  echo "  停止服务:      ${compose_hint} down"
}

# 兼容不同脚本中的 info/warn/error 命名
info_msg()  { if declare -F info >/dev/null; then info "$@"; else echo "[fabric] $*"; fi; }
warn_msg()  { if declare -F warn >/dev/null; then warn "$@"; else echo "[fabric] $*" >&2; fi; }
error_msg() { if declare -F error >/dev/null; then error "$@"; else echo "[fabric] $*" >&2; fi; }
