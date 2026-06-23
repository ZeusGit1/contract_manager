# Remediations applied — fix/testing-feedback-batch-2

| File                    | Issue                            | Severity | Source     | Fix                                                    | Status  |
| ----------------------- | -------------------------------- | -------- | ---------- | ------------------------------------------------------ | ------- |
| `web/src/lib/exportCsv.ts` | New pure function shipped without test | Low | Always-tier | Added `web/src/lib/exportCsv.test.ts` with 6 cases covering empty input, escaping (comma, quote), open-lane filtering, and null-date emission | Applied |

No mechanical fixes for code-review or security findings — there were none.
