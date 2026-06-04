# Grid Performance SLO

## Objectives

- Primary objective: improve concurrent write and large-list read performance for `grid`.
- Environment: PostgreSQL + Redis + Go service (`chi`, `pgx/sqlc`).

## Target SLO

- `PATCH /api/grid/cells/update`
  - P95 <= 80ms
  - P99 <= 150ms
  - Error rate < 0.2%
- `GET /api/grid/projects/{project_id}/`
  - P95 <= 120ms
  - P99 <= 250ms
  - Error rate < 0.2%
- `GET /api/grid/rows/get_rows?project_id=...`
  - P95 <= 100ms
  - P99 <= 200ms
  - Error rate < 0.2%
- `GET /api/grid/shared/project_access?...`
  - P95 <= 120ms
  - P99 <= 250ms
  - Error rate < 0.5%

## Capacity Targets

- Sustained throughput:
  - 500 RPS read mixed traffic
  - 200 RPS write-heavy cell updates
- DB safety:
  - PostgreSQL CPU <= 70%
  - Slow query ratio (`>200ms`) <= 1%

## Consistency Targets

- No duplicate `(project_id, row_id, column_id)` cell records.
- No lost update in concurrent cell write tests.
- Row/column index uniqueness preserved under concurrency.
