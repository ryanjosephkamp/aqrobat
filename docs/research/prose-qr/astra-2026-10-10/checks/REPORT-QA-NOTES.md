# Report-only QA correction

The original `report-qa.mjs` waited for `decode()` on all images while some
were deferred by `loading=lazy` inside collapsed details. That evaluation had
no explicit timeout and stalled. The task identified its exact browser parent
PID45111 (child of its Node PID45043) and closed only that browser. The pending
evaluation then rejected; the script's `finally` closed its server and wrote
`report-qa.json` with the failure. No unrelated process or profile was closed.
No viewport completed and no QA screenshot was produced in that attempt.

`report-qa-v2.mjs` is a fresh retained correction: it explicitly requests eager
loading for this asset-completeness check, gives image decoding15 seconds, and
uses a90-second browser watchdog. It writes a new receipt and new screenshot
names. These are handback QA operations, not native source proposals, QR reader
calls or scientific retries. Both source versions and the failed receipt remain.
