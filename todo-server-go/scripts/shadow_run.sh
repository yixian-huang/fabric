#!/usr/bin/env bash
set -euo pipefail

# Read-only shadow traffic runner: sends GET requests to primary and shadow,
# compares status/body hash, and writes a report.

PRIMARY_BASE_URL="${PRIMARY_BASE_URL:-http://127.0.0.1:8000}"
SHADOW_BASE_URL="${SHADOW_BASE_URL:-http://127.0.0.1:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
ALLOW_NON_LOCAL="${ALLOW_NON_LOCAL:-0}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"
ITERATIONS="${ITERATIONS:-1}"
SLEEP_SECONDS="${SLEEP_SECONDS:-0.2}"
REPORT_FILE="${REPORT_FILE:-./shadow_run_report.txt}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: missing dependency '$1'" >&2
    exit 2
  }
}

is_local_url() {
  case "$1" in
    http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

request_get() {
  # Args: base_url path auth_required status_file body_file
  local base_url="$1"
  local path="$2"
  local auth_required="$3"
  local status_file="$4"
  local body_file="$5"

  local -a headers
  headers=(-H "Accept: application/json")
  if [[ "$auth_required" == "1" ]]; then
    if [[ -z "$AUTH_TOKEN" ]]; then
      echo "SKIP_AUTH_REQUIRED" >"$status_file"
      printf '{}' >"$body_file"
      return 0
    fi
    headers+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  fi

  local url="${base_url}${path}"
  local http_code
  http_code="$(curl -sS -m "$TIMEOUT_SECONDS" -X GET "${headers[@]}" \
    -o "$body_file" -w "%{http_code}" "$url" || true)"

  if [[ ! "$http_code" =~ ^[0-9]{3}$ ]]; then
    echo "CURL_ERROR" >"$status_file"
    return 0
  fi
  echo "$http_code" >"$status_file"
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd shasum
  require_cmd mktemp

  if [[ "$ALLOW_NON_LOCAL" != "1" ]]; then
    is_local_url "$PRIMARY_BASE_URL" || {
      echo "error: PRIMARY_BASE_URL must be localhost unless ALLOW_NON_LOCAL=1" >&2
      exit 2
    }
    is_local_url "$SHADOW_BASE_URL" || {
      echo "error: SHADOW_BASE_URL must be localhost unless ALLOW_NON_LOCAL=1" >&2
      exit 2
    }
  fi

  [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || {
    echo "error: ITERATIONS must be an integer >= 1" >&2
    exit 2
  }
  if [[ "$ITERATIONS" -lt 1 ]]; then
    echo "error: ITERATIONS must be >= 1" >&2
    exit 2
  fi

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap "rm -rf \"$tmp_dir\"" EXIT

  local -a endpoints=(
    "fabrics_list_public|/api/fabrics/list_public|0"
    "fabrics_get_options|/api/fabrics/get_options|0"
    "grid_rows_get_rows|/api/grid/rows/get_rows?project_id=1|1"
    "grid_projects_todo|/api/grid/projects/todo/|1"
  )

  : >"$REPORT_FILE"
  {
    echo "Shadow run report"
    echo "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "primary=${PRIMARY_BASE_URL}"
    echo "shadow=${SHADOW_BASE_URL}"
    echo "iterations=${ITERATIONS}"
    echo
  } >>"$REPORT_FILE"

  local mismatches=0
  local i entry name path auth_required
  for ((i = 1; i <= ITERATIONS; i++)); do
    {
      echo "## iteration ${i}"
    } >>"$REPORT_FILE"
    for entry in "${endpoints[@]}"; do
      IFS='|' read -r name path auth_required <<<"$entry"

      local p_status_file="${tmp_dir}/${name}.${i}.p.status"
      local s_status_file="${tmp_dir}/${name}.${i}.s.status"
      local p_body_file="${tmp_dir}/${name}.${i}.p.body"
      local s_body_file="${tmp_dir}/${name}.${i}.s.body"

      request_get "$PRIMARY_BASE_URL" "$path" "$auth_required" "$p_status_file" "$p_body_file"
      request_get "$SHADOW_BASE_URL" "$path" "$auth_required" "$s_status_file" "$s_body_file"

      local p_status s_status
      p_status="$(<"$p_status_file")"
      s_status="$(<"$s_status_file")"

      if [[ "$p_status" == "SKIP_AUTH_REQUIRED" || "$s_status" == "SKIP_AUTH_REQUIRED" ]]; then
        {
          echo "- ${name}: SKIP (missing AUTH_TOKEN)"
        } >>"$REPORT_FILE"
        continue
      fi

      local p_hash s_hash
      p_hash="$(sha256_file "$p_body_file")"
      s_hash="$(sha256_file "$s_body_file")"

      local shape_match="NA"
      if jq -e . "$p_body_file" >/dev/null 2>&1 && jq -e . "$s_body_file" >/dev/null 2>&1; then
        local p_shape s_shape
        p_shape="$(jq -c 'def shape: if type=="object" then (to_entries|sort_by(.key)|map({k:.key,v:(.value|shape)})) elif type=="array" then (if length==0 then [] else [.[0]|shape] end) else type end; shape' "$p_body_file")"
        s_shape="$(jq -c 'def shape: if type=="object" then (to_entries|sort_by(.key)|map({k:.key,v:(.value|shape)})) elif type=="array" then (if length==0 then [] else [.[0]|shape] end) else type end; shape' "$s_body_file")"
        [[ "$p_shape" == "$s_shape" ]] && shape_match="YES" || shape_match="NO"
      fi

      local result="OK"
      if [[ "$p_status" != "$s_status" || "$p_hash" != "$s_hash" ]]; then
        result="DIFF"
        mismatches=$((mismatches + 1))
      fi

      {
        echo "- ${name}: result=${result} status=${p_status}/${s_status} hash=${p_hash}/${s_hash} shape=${shape_match}"
      } >>"$REPORT_FILE"

      sleep "$SLEEP_SECONDS"
    done
    echo >>"$REPORT_FILE"
  done

  {
    echo "mismatches=${mismatches}"
  } >>"$REPORT_FILE"

  echo "shadow run finished: report=${REPORT_FILE} mismatches=${mismatches}"
}

main "$@"
