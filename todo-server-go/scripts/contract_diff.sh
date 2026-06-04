#!/usr/bin/env bash
set -euo pipefail

# Compare status codes and JSON "shape" between Python and Go endpoints.
# Default target is localhost only for safety.

PY_BASE_URL="${PY_BASE_URL:-http://127.0.0.1:8000}"
GO_BASE_URL="${GO_BASE_URL:-http://127.0.0.1:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"
ALLOW_NON_LOCAL="${ALLOW_NON_LOCAL:-0}"
STRICT="${STRICT:-1}"

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

json_shape() {
  jq -c '
    def shape:
      if type == "object" then
        (to_entries | sort_by(.key) | map({key: .key, value: (.value | shape)}))
      elif type == "array" then
        if length == 0 then [] else [.[0] | shape] end
      else
        type
      end;
    shape
  ' "$1"
}

call_endpoint() {
  # Args: base_url method path body auth_required status_file body_file
  local base_url="$1"
  local method="$2"
  local path="$3"
  local body="$4"
  local auth_required="$5"
  local status_file="$6"
  local body_file="$7"

  local -a headers
  headers=(-H "Accept: application/json")
  if [[ -n "$body" ]]; then
    headers+=(-H "Content-Type: application/json")
  fi
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
  if [[ -n "$body" ]]; then
    http_code="$(curl -sS -m "$TIMEOUT_SECONDS" -X "$method" "${headers[@]}" --data "$body" \
      -o "$body_file" -w "%{http_code}" "$url" || true)"
  else
    http_code="$(curl -sS -m "$TIMEOUT_SECONDS" -X "$method" "${headers[@]}" \
      -o "$body_file" -w "%{http_code}" "$url" || true)"
  fi

  if [[ ! "$http_code" =~ ^[0-9]{3}$ ]]; then
    echo "CURL_ERROR" >"$status_file"
    return 0
  fi
  echo "$http_code" >"$status_file"
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd diff
  require_cmd mktemp

  if [[ "$ALLOW_NON_LOCAL" != "1" ]]; then
    is_local_url "$PY_BASE_URL" || {
      echo "error: PY_BASE_URL must be localhost unless ALLOW_NON_LOCAL=1" >&2
      exit 2
    }
    is_local_url "$GO_BASE_URL" || {
      echo "error: GO_BASE_URL must be localhost unless ALLOW_NON_LOCAL=1" >&2
      exit 2
    }
  fi

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap "rm -rf \"$tmp_dir\"" EXIT

  local -a endpoints=(
    "fabrics_list_public|GET|/api/fabrics/list_public||0"
    "fabrics_get_options|GET|/api/fabrics/get_options||0"
    "grid_get_rows|GET|/api/grid/rows/get_rows?project_id=1||1"
    "base_auth_me|GET|/api/base/auth/me||1"
  )

  local mismatches=0
  echo "Contract diff start"
  echo "  python=${PY_BASE_URL}"
  echo "  go=${GO_BASE_URL}"
  echo

  local entry name method path body auth_required
  for entry in "${endpoints[@]}"; do
    IFS='|' read -r name method path body auth_required <<<"$entry"
    echo "== ${name} (${method} ${path}) =="

    local py_status_file="${tmp_dir}/${name}.py.status"
    local go_status_file="${tmp_dir}/${name}.go.status"
    local py_body_file="${tmp_dir}/${name}.py.body"
    local go_body_file="${tmp_dir}/${name}.go.body"

    call_endpoint "$PY_BASE_URL" "$method" "$path" "$body" "$auth_required" "$py_status_file" "$py_body_file"
    call_endpoint "$GO_BASE_URL" "$method" "$path" "$body" "$auth_required" "$go_status_file" "$go_body_file"

    local py_status go_status
    py_status="$(<"$py_status_file")"
    go_status="$(<"$go_status_file")"
    echo "status python=${py_status} go=${go_status}"

    if [[ "$py_status" == "SKIP_AUTH_REQUIRED" || "$go_status" == "SKIP_AUTH_REQUIRED" ]]; then
      echo "result SKIP (missing AUTH_TOKEN for auth endpoint)"
      echo
      continue
    fi

    if [[ "$py_status" != "$go_status" ]]; then
      echo "result FAIL (status mismatch)"
      mismatches=$((mismatches + 1))
    fi

    local py_is_json=0
    local go_is_json=0
    jq -e . "$py_body_file" >/dev/null 2>&1 && py_is_json=1
    jq -e . "$go_body_file" >/dev/null 2>&1 && go_is_json=1

    if [[ "$py_is_json" -eq 1 && "$go_is_json" -eq 1 ]]; then
      local py_shape_file="${tmp_dir}/${name}.py.shape"
      local go_shape_file="${tmp_dir}/${name}.go.shape"
      json_shape "$py_body_file" >"$py_shape_file"
      json_shape "$go_body_file" >"$go_shape_file"
      if ! diff -u "$py_shape_file" "$go_shape_file" >/dev/null 2>&1; then
        echo "result FAIL (json shape mismatch)"
        mismatches=$((mismatches + 1))
      else
        echo "shape OK"
      fi

      local py_has_envelope go_has_envelope
      py_has_envelope="$(jq -r 'if (type=="object" and has("code") and has("message") and has("data")) then "1" else "0" end' "$py_body_file" 2>/dev/null || echo "0")"
      go_has_envelope="$(jq -r 'if (type=="object" and has("code") and has("message") and has("data")) then "1" else "0" end' "$go_body_file" 2>/dev/null || echo "0")"
      echo "envelope python=${py_has_envelope} go=${go_has_envelope}"
      if [[ "$py_has_envelope" != "$go_has_envelope" ]]; then
        echo "result FAIL (envelope presence mismatch)"
        mismatches=$((mismatches + 1))
      fi
    else
      echo "result WARN (non-json response at least on one side)"
    fi
    echo
  done

  echo "Contract diff done: mismatches=${mismatches}"
  if [[ "$STRICT" == "1" && "$mismatches" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
