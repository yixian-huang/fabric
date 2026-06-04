# Migration Cutover Runbook

Scope: `base`, `fabrics`, `grid` migration from Python service to Go service.

This runbook defines phase gates:

1. Shadow Read
2. Partial Write
3. Full Cutover

Use with:

- `scripts/contract_diff.sh`
- `scripts/shadow_run.sh`
- `docs/observability.md`
- `docs/grid-slo.md`

## 0) Preconditions

- Go service deployed and healthy in target environment.
- Shared dependencies (PostgreSQL/Redis/object storage) reachable.
- Metrics/logging/tracing dashboard ready.
- On-call owner and rollback owner assigned.
- Feature flags available:
  - `MIGRATION_SHADOW_READ`
  - `MIGRATION_PARTIAL_WRITE_PERCENT`
  - `MIGRATION_GO_PRIMARY`

## 1) Phase A: Shadow Read

Goal: verify response compatibility with production-like reads, no user-visible impact.

Checklist:

- [ ] Enable `MIGRATION_SHADOW_READ=true`
- [ ] Keep Python as serving primary
- [ ] Run `scripts/shadow_run.sh` against key read endpoints
- [ ] Run `scripts/contract_diff.sh` for status + JSON shape checks
- [ ] Confirm no increase in Python p95/p99 due to shadow overhead
- [ ] Confirm diff metrics trend to zero

Gate to proceed (minimum):

- [ ] Status mismatch = 0 for 24h on key endpoint set
- [ ] JSON shape mismatch = 0 for 24h (or all deviations documented and approved)
- [ ] No critical alerts in observability checks

Rollback for Phase A:

- [ ] Disable `MIGRATION_SHADOW_READ`
- [ ] Keep Python-only serving path

## 2) Phase B: Partial Write

Goal: send controlled subset of writes to Go while preserving user safety.

Checklist:

- [ ] Keep read shadow active
- [ ] Set `MIGRATION_PARTIAL_WRITE_PERCENT=1` (start at 1%)
- [ ] Restrict to low-risk write endpoints first (example: selected grid write routes)
- [ ] Validate DB integrity constraints and duplicate checks
- [ ] Monitor error rate, latency, and write amplification
- [ ] Increase traffic gradually (1% -> 5% -> 10% -> 25% -> 50%)

Gate at each ramp step:

- [ ] 30-minute stable window without critical alerts
- [ ] 5xx and timeout rates not worse than baseline by >0.2%
- [ ] No data inconsistency signals from verification jobs

Hold or rollback triggers:

- [ ] Any sustained 5xx spike >1% for 5 min
- [ ] Contract status mismatch reappears on impacted endpoints
- [ ] Data correctness incident (lost update/duplicate/constraint drift)

Rollback action:

- [ ] Set `MIGRATION_PARTIAL_WRITE_PERCENT=0`
- [ ] Keep shadow read for diagnosis
- [ ] Open incident and attach dashboard + logs + trace IDs

## 3) Phase C: Full Cutover

Goal: Go becomes primary for all target routes.

Checklist:

- [ ] Set `MIGRATION_GO_PRIMARY=true`
- [ ] Keep Python as hot standby path for rollback window
- [ ] Run smoke suite for base/fabrics/grid key endpoints
- [ ] Validate SLO targets from `docs/grid-slo.md`
- [ ] Verify DB/caching resource headroom
- [ ] Announce cutover completion in operations channel

Post-cutover watch (minimum 24h):

- [ ] Elevated monitoring interval (10 minutes)
- [ ] Review all critical dashboards and alerts
- [ ] Run contract diff periodically for regression detection

Rollback action (during watch window):

- [ ] Set `MIGRATION_GO_PRIMARY=false`
- [ ] Route traffic back to Python primary
- [ ] Preserve evidence: metrics snapshot, logs, traces, failing payload samples

## 4) Evidence template per phase

Record the following before phase approval:

- Time window and traffic sample size
- Endpoint set verified
- Contract diff summary (status/shape/hash)
- SLO summary (p95/p99/error)
- Incident/alert summary
- Approver name and timestamp

## 5) Execution order quick checklist

- [ ] Phase A complete and signed off
- [ ] Phase B complete and signed off
- [ ] Phase C complete and signed off
- [ ] 24h watch window complete
- [ ] Migration closeout note published
