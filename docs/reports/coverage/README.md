# Coverage Reports

This directory centralises code coverage evidence for TASK-080 and related quality gates.

## Latest Summary
- [2025-09-19 Summary](./20250919-summary.md)

## Usage
- Generate coverage locally with `npm run test:coverage` (see `vitest.config.ts`).
- Export the resulting `coverage/coverage-summary.json` and `coverage/lcov-report/` artefacts.
- Create a dated summary file named `<YYYYMMDD>-summary.md` that captures the latest metrics and deltas.
- Update `docs/tasks/novelai-auto-generator-tasks.md` to link the newest summary.

## Summary Template
```md
# Coverage Summary 2025-01-27

## Metrics
| Metric      | Current | Threshold | Delta |
| ----------- | ------- | --------- | ----- |
| Statements  | 81%     | 80%       | +2%   |
| Branches    | 80%     | 80%       | +1%   |
| Functions   | 82%     | 80%       | +3%   |
| Lines       | 83%     | 80%       | +3%   |

## Module Coverage
| Module          | Lines | Branches | Notes |
| --------------- | ----- | -------- | ----- |
| background      | 82%   | 79%      | Add tests for download retry errors |
| content         | 84%   | 83%      | Fully covered |
| utils           | 86%   | 82%      | |

## Follow-up Actions
- [ ] Align CI artefact upload (`coverage/lcov-report/index.html`).
- [ ] Review new uncovered lines > 10.
```

## Housekeeping
- Keep the latest summary linked from this README once reports accumulate.
- Remove or archive historical files only after copying their key deltas into a changelog.
- Do not commit the raw `coverage/` artefacts—only the distilled markdown summaries.
