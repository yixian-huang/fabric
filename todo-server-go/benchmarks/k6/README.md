# k6 Baseline

## Run

```bash
k6 run benchmarks/k6/grid_baseline.js \
  -e BASE_URL=http://localhost:8000 \
  -e TOKEN=<jwt> \
  -e PROJECT_ID=<uuid> \
  -e ROW_ID=<uuid> \
  -e COLUMN_ID=<uuid> \
  -e SHARED_KEY=<key> \
  -e SHARED_PASSWORD=<pwd>
```

Use this script against both Python and Go services to compare baseline and improvement.
