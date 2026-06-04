import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const TOKEN = __ENV.TOKEN || "";
const PROJECT_ID = __ENV.PROJECT_ID || "";
const SHARED_KEY = __ENV.SHARED_KEY || "";
const SHARED_PASSWORD = __ENV.SHARED_PASSWORD || "";
const ROW_ID = __ENV.ROW_ID || "";
const COLUMN_ID = __ENV.COLUMN_ID || "";

const headers = TOKEN
  ? { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }
  : { "Content-Type": "application/json" };

export const options = {
  scenarios: {
    gridRead: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 100, duration: "1m" },
        { target: 200, duration: "2m" },
        { target: 0, duration: "30s" },
      ],
      exec: "readScenario",
    },
    gridWrite: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 30,
      maxVUs: 200,
      stages: [
        { target: 50, duration: "1m" },
        { target: 120, duration: "2m" },
        { target: 0, duration: "30s" },
      ],
      exec: "writeScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.005"],
    http_req_duration: ["p(95)<120", "p(99)<250"],
  },
};

export function readScenario() {
  if (!PROJECT_ID) {
    return;
  }

  const p1 = http.get(`${BASE_URL}/api/grid/projects/${PROJECT_ID}/`, { headers });
  check(p1, { "project_detail_200": (r) => r.status === 200 });

  const p2 = http.get(
    `${BASE_URL}/api/grid/rows/get_rows?project_id=${PROJECT_ID}&hidden=false`,
    { headers }
  );
  check(p2, { "rows_200": (r) => r.status === 200 });

  if (SHARED_KEY) {
    const p3 = http.get(
      `${BASE_URL}/api/grid/shared/project_access?shared_key=${SHARED_KEY}&shared_password=${SHARED_PASSWORD}`
    );
    check(p3, { "shared_access_ok": (r) => r.status === 200 || r.status === 401 || r.status === 403 });
  }

  sleep(0.2);
}

export function writeScenario() {
  if (!PROJECT_ID || !ROW_ID || !COLUMN_ID) {
    return;
  }

  const payload = JSON.stringify({
    project: PROJECT_ID,
    row: ROW_ID,
    column: COLUMN_ID,
    content: `k6-${__VU}-${__ITER}-${Date.now()}`,
  });

  const resp = http.patch(`${BASE_URL}/api/grid/cells/update`, payload, { headers });
  check(resp, { "cell_update_2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(0.1);
}
