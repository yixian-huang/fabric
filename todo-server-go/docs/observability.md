# Observability for Migration Verification

This document defines the minimum observability artifacts to verify Python -> Go migration for `base`, `fabrics`, and `grid`.

## 1) Metrics (minimum)

Use Prometheus naming and labels consistently across services.

- `http_requests_total`
  - labels: `service`, `module`, `route`, `method`, `status_code`
  - check: request volume parity and non-2xx spikes
- `http_request_duration_seconds` (histogram)
  - labels: `service`, `module`, `route`, `method`
  - check: p50/p95/p99, especially for grid endpoints in `docs/grid-slo.md`
- `http_response_size_bytes` (histogram)
  - labels: `service`, `module`, `route`
  - check: unexpected payload growth between Python and Go
- `db_query_duration_seconds` (histogram)
  - labels: `service`, `query_name`, `table`, `operation`
  - check: slow query ratio (`>200ms`) and query hotspot changes
- `db_pool_in_use_connections`
  - labels: `service`, `pool`
  - check: connection pressure before and after cutover
- `cache_operations_total`
  - labels: `service`, `cache`, `operation`, `result`
  - check: cache hit/miss drift that may impact latency
- `migration_shadow_diff_total`
  - labels: `endpoint`, `diff_type` (`status`, `shape`, `hash`)
  - check: must trend to zero before write cutover

## 2) Structured Logging (minimum fields)

Every request log line should include:

- `timestamp` (UTC ISO8601)
- `level` (`INFO|WARN|ERROR`)
- `service` (`python-api` or `go-api`)
- `module` (`base|fabrics|grid`)
- `route` (template route, not raw URL)
- `method`
- `status_code`
- `duration_ms`
- `request_id` (required; shared across upstream/downstream)
- `user_id` (if authenticated, otherwise null)
- `shadow_mode` (`off|read_shadow|partial_write|full_cutover`)
- `error_code` and `error_message` (for failures)

For contract verification logs, include:

- `contract_check` (`true|false`)
- `upstream_status`, `shadow_status`
- `upstream_shape_hash`, `shadow_shape_hash`
- `diff_detected` (`true|false`)

## 3) Tracing (OpenTelemetry style)

Trace spans should capture cross-service and DB/cache segments.

Required span attributes:

- `service.name`
- `http.route`, `http.method`, `http.status_code`
- `enduser.id` (if authenticated)
- `db.system=postgresql`, `db.operation`, `db.sql.table`
- `cache.system=redis`, `cache.operation`
- `migration.shadow` (`true|false`)
- `migration.phase` (`shadow|partial_write|full_cutover`)

Sampling recommendation:

- Baseline: 5% head-based
- Forced sample: 100% for 5xx and contract diff events

## 4) Dashboard checks before each phase gate

Use side-by-side panels for Python and Go.

### Global checks

- Request rate by endpoint differs by less than 5%
- 5xx ratio less than 0.5%, 4xx trend stable
- No persistent error burst over 5 minutes

### Contract checks

- `migration_shadow_diff_total` near zero on selected endpoint set
- Status mismatch count equals zero for at least 24h
- Shape/hash mismatch count equals zero for at least 24h (or explained known deltas)

### Grid SLO checks

- `PATCH /api/grid/cells/update` meets p95/p99/error targets
- `GET /api/grid/rows/get_rows` meets p95/p99/error targets
- DB slow query ratio less than or equal to 1%

### Resource checks

- CPU and memory stable compared with baseline load profile
- DB pool saturation less than 80% for sustained windows
- Redis error ratio less than 0.1%

## 5) Alert rules (suggested)

- Critical: 5xx ratio above 1% for 5 minutes on any key endpoint
- Critical: contract status mismatch above 0 for 10 minutes
- Warning: p95 regression over 20% versus baseline for 15 minutes
- Warning: DB slow query ratio above 1% for 10 minutes

## 6) Verification cadence

- During shadow: review dashboard every 30 minutes
- During partial write: review every 10 minutes
- During full cutover day: live monitor with on-call ownership and rollback readiness
