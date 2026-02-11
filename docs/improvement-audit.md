# Gnosis improvement audit (detailed)

This audit focuses on maintainability, reliability, and product quality opportunities discovered from a pass over the current codebase.

## 1) Highest-priority opportunities

### A. Introduce real authentication for edit access
**Current state**
- Edit access is currently guarded by a hardcoded unlock code (`1984`) in client state. This is easy to bypass and offers no meaningful protection if the app is shared or synced across devices.

**Evidence**
- `unlockWithCode` validates a fixed string in the Zustand store.

**Recommendation**
- Replace hardcoded code-gate with one of:
  1. Local passphrase hash check (minimum baseline for an offline app), or
  2. Proper account auth if remote sync is introduced.
- At minimum, move the value to environment configuration and avoid storing literal secrets in source.

### B. Add a CI quality gate (typecheck + tests)
**Current state**
- Scripts exist for targeted tests, but there is no default `test` script and no explicit `typecheck` script. This makes automated validation harder and increases regression risk.

**Recommendation**
- Keep a single top-level `npm test` that runs all unit tests.
- Add `npm run typecheck` and run both commands in CI on each PR.

### C. Keep schema contract docs synchronized with implementation
**Current state**
- The project emphasizes CSV schema correctness. Implementation includes placement columns (`bookcase_id`, `shelf`, `position`) in the canonical schema.
- Documentation now needs to stay aligned whenever schema evolves.

**Recommendation**
- Treat schema docs as part of the contract and require update in same PR whenever `CSV_SCHEMA` changes.
- Optionally generate docs directly from `CSV_SCHEMA` to prevent drift.

## 2) Data correctness and operational reliability

### D. Seed/import observability and failure surfacing
**Current state**
- CSV seed failures are swallowed into `console.warn`, and user feedback is limited.

**Recommendation**
- Add explicit user-facing error notifications for seed/import failure paths.
- Persist last seed/import outcome in app state to aid troubleshooting.

### E. Placement sanitization logic duplication risk
**Current state**
- Placement normalization and conflict checks are robust but spread across multiple helper paths in store flows (`loadFromDb`, `seedFromCsv`, import/update flows).

**Recommendation**
- Consolidate placement normalization into one reusable domain service with tests.
- Ensure every write path uses the same normalization pipeline.

## 3) Search and performance

### F. Search index cache invalidation could be stricter
**Current state**
- Search cache signature is based on count + max `updated_at`. If two edits happen without increasing max timestamp or with timestamp anomalies, stale cache risk rises.

**Recommendation**
- Use a stronger signature (e.g., deterministic hash over `id + updated_at` pairs).
- Add lightweight telemetry (build time, cache-hit rate) to validate effectiveness.

### G. Worker fallback handling can be more resilient
**Current state**
- Worker errors reject build promise and can degrade UX during index build.

**Recommendation**
- On worker failure, fallback to main-thread index creation automatically before surfacing failure.

## 4) Product and UX quality

### H. Barcode scanning UX edge cases
**Current state**
- Scanner supports auto-add and manual ISBN entry, but permission denial and repeated scan states can be confusing depending on device/browser behavior.

**Recommendation**
- Add explicit retry/open-settings guidance in permission-denied state.
- Add a cooldown + visual “locked” indicator during auto-add to reduce accidental double inserts.

### I. Bulk update safety controls
**Current state**
- Bulk updates are powerful and apply immediately.

**Recommendation**
- Add preview/confirm step showing affected record count and changed fields.
- Provide optional undo buffer for last bulk operation.

## 5) Engineering process

### J. Expand test coverage around critical workflows
**Current state**
- Tests exist for search, duplicates, ISBN lookup, and schema; valuable start.

**Recommendation**
- Add integration tests for:
  - CSV import/export round-trip integrity,
  - placement conflict resolution,
  - metadata bulk update semantics,
  - review queue persistence behavior.

### K. Define contribution standards
**Current state**
- README has strong product guidance, but contributor workflow standards can be more explicit.

**Recommendation**
- Add a short `CONTRIBUTING.md` with branch policy, test expectations, and schema-change checklist.

---

## Suggested phased plan

1. **Week 1 (safety baseline):** CI scripts + required checks + doc/schema sync guard.
2. **Week 2 (correctness):** unify placement normalization + add import/seed error UX.
3. **Week 3 (performance):** strengthen index signature + worker fallback path.
4. **Week 4 (UX hardening):** scanner permission flows + bulk-edit confirmation/undo.

