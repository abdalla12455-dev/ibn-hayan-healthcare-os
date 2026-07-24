# PROJECT_CONTINUITY.md — Ibn Hayan Healthcare OS

> **This document captures the canonical state of the Ibn Hayan project for cross-session continuity. Any AI agent resuming work on this project must read this file first, then `AGENTS.md`, then `docs/AI_AGENT_SAFETY_SKILL.md`.**

## Repository

- **Remote:** https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os.git
- **Default branch:** `main`
- **Monorepo manager:** pnpm (workspace)
- **Key packages:** `apps/api`, `apps/web`, `packages/contracts`, `packages/domain`, `packages/observability`

## Canonical Commit History

The following table records every commit that has been reviewed, verified, and pushed to `origin/main`. This is the authoritative record — if local `main` diverges from what is listed here without explicit authorization, treat it as an anomaly.

| SHA (full) | Date (UTC) | Subject | Notes |
|---|---|---|---|
| `ff4df26748d92355c0316fc0ceb32d81458d8815` | 2026-07-21 | (pre-session baseline) | origin/main before this session's push |
| `11a377eb39cdf449d5e86b2312b7cd1e93279e58` | 2026-07-22 02:47 | `ccfd5dbc-56da-495f-ada2-15fbc00c8c9a` | ADR-015 scoped context feature (32 files, +4868/-82). UUID subject is intentional — environment-generated commit marker. |
| `6d046b217e2effa0f7a115f5f365d22d79d3511b` | 2026-07-22 03:39 | `31d5bd0f-8e53-44e3-b9e1-5d6c9697484d` | ADR-015 refinements (7 files, +581/-111). UUID subject, same as above. |
| `a065b413489f132e5f5c1631a90c8de485b0bcdc` | 2026-07-22 04:16 | Complete ADR-015 scoped context verification | Verification tests (10 files, +4205/-91) |
| `f78ad2731bc681b52d2cde3f261ff0fa3f13417b` | 2026-07-22 05:09 | Add genuine ADR-015 migration upgrade test | Migration upgrade test (2 files, +609/-44). |
| `e046e0dac9334ec8a5b919140ca9eefe53df64c0` | 2026-07-24 07:39 | docs: install permanent AI agent safety skill | Adds AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md. **Current tip of `origin/main`.** |

### Current State (as of integration preparation session 2026-07-24)

- **Local `main`:** `e046e0dac9334ec8a5b919140ca9eefe53df64c0`
- **`origin/main`:** `e046e0dac9334ec8a5b919140ca9eefe53df64c0`
- **Ahead/behind main:** `0 0` (in sync)
- **`adr-015-validation` tip:** `c05fc323c086603942d6c9ed264367cf450745e9`
- **`origin/adr-015-validation` tip:** `c05fc323c086603942d6c9ed264367cf450745e9`
- **Validation ahead/behind origin:** `0 0` (in sync)
- **Working tree (primary worktree `/home/z/my-project`):** clean
- **Safety skill installed:** at `e046e0d` (AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md)

## Integration Branch: `integration/adr-015-validated`

This branch was created on 2026-07-24 to prepare the validated ADR-015 work for final integration into `main`. It exists only locally and has NOT been pushed.

- **Purpose:** Conflict-free merge rehearsal of `origin/adr-015-validation` onto current `main`, plus a continuity-documentation commit. Ready for operator to push to `origin/main` after review.
- **Branch start point (parent 1):** `e046e0dac9334ec8a5b919140ca9eefe53df64c0` (current `main` tip)
- **Merged branch (parent 2):** `c05fc323c086603942d6c9ed264367cf450745e9` (`origin/adr-015-validation` tip, fully validated against PostgreSQL 17)
- **Merge commit:** `5825ba4417d2708af126325dede65df8cfa1b77f`
- **Merge subject:** `Merge validated ADR-015 organisation and facility context implementation`
- **Merge strategy:** `--no-ff --no-commit` rehearsal, then explicit commit. No conflicts encountered. Three-way merge cleanly preserved all three safety docs from `main` while bringing in the workflow + test corrections from `adr-015-validation`.
- **Continuity commit (tip of integration branch):** recorded below in the Continuity Update section.
- **Recovery tag:** `adr-015-validated-pre-main-v1` (annotated, local-only, points to final integration-branch tip).
- **Origin sync:** local-only — has NOT been pushed.

### Files in the merge commit (5 files, +465/-40)

**Created (1):**
- `.github/workflows/adr015-postgresql17-validation.yml` (+126, new) — Docker-based PostgreSQL 17 validation workflow triggered on push to `adr-015-validation`.

**Modified (4 — all PostgreSQL 17 test corrections, no production code touched):**
- `apps/api/test/audit/audit-atomicity.audit-atomicity-spec.ts` (+47/-3) — Category A test correction: scope outbox rollback assertion to the failed operation using baseline count + JSONB action-code filter, instead of asserting an empty outbox that contains legitimate setup rows.
- `apps/api/test/context/context.e2e.context-spec.ts` (+8/-14) — Fix ADR-015 context login fixture email.
- `apps/api/test/database/context.db-spec.ts` (+38/-5) — Harden context database tests against PostgreSQL 17 canonical catalogue output (constraint name canonicalisation, self-contained tests).
- `apps/api/test/database/rbac.db-spec.ts` (+143/-15 then +154/-22 in two commits; net +264/-40 across both) — Align RBAC database fixtures with ADR-015 `tenant_id` and scope indexes; harden partial-index predicate assertions against PostgreSQL 17 canonical output using semantic `pg_index`/`pg_class`/`pg_attribute` catalogue verification instead of regex matching.

**Deleted (0).** No files deleted. AGENTS.md, PROJECT_CONTINUITY.md, and docs/AI_AGENT_SAFETY_SKILL.md remain intact from `main` — they were added to `main` in commit `e046e0d` after `adr-015-validation` branched off, so the three-way merge correctly preserved them.

### Important architectural decisions preserved by the merge

- **ADR-014 transactional outbox:** unchanged. The audit-atomicity correction strengthens (not weakens) the rollback guarantee by asserting that the failed operation's outbox row count is unchanged AND that no outbox row with action code `organisation_context.selected` persists — both via JSONB path filter and via JavaScript fallback for portability across Prisma versions.
- **ADR-015 tenant isolation:** unchanged. No production source files (`apps/api/src`, `apps/web/src`, `packages/*/src`) were modified on the validation branch.
- **ADR-015 scoped context:** all production implementation from commits `11a377e`, `6d046b2`, `a065b41`, `f78ad27` remains intact on `main` and is carried forward unchanged by the merge.
- **Permission system:** no changes to RBAC production code. Only the RBAC database test fixtures were corrected to align with the ADR-015 `tenant_id` and scope indexes that already exist in production.
- **Audit pipeline:** no changes to audit production code. Only audit-atomicity test assertions were scoped to failed operations.

## ADR-015 PostgreSQL 17 Validation Status

The GitHub Actions workflow `.github/workflows/adr015-postgresql17-validation.yml` ran successfully against commit `c05fc323c086603942d6c9ed264367cf450745e9` on `adr-015-validation`. The operator verified that the run completed green.

**Note on verification depth:** GitHub CLI (`gh`) is not available in this environment, so the run could not be queried directly via API. The green status is taken from operator-verified evidence. The local repository state (both local and remote `adr-015-validation` at `c05fc323`) is consistent with this evidence.

**Important caveat:** The merge commit `5825ba4` itself was NOT run against PostgreSQL 17 in CI — only the validation tip `c05fc323` was. The merge introduced no production code, schema, or migration changes (only workflow + test files), and the merged test files are byte-identical to those on `c05fc323` (verified by `git diff` during Phase 7 of the integration session). Therefore the green CI result on `c05fc323` is a valid predictor for the merge commit's test-suite behaviour, but the merge commit itself did not execute the suites.

### Suite-level results (from operator-verified green run on `c05fc323`)

| Suite | Result | Notes |
|---|---|---|
| Context (`apps/api/test/context/context.e2e.context-spec.ts`) | PASS | Email-fixture correction at `494eece` resolved PostgreSQL 17 failures. |
| Database (`apps/api/test/database/*.db-spec.ts`) | PASS | RBAC fixture alignment (`e830451`) + PostgreSQL 17 canonical-output hardening (`2f19e18`) resolved partial-index predicate and constraint-name assertions. |
| Audit atomicity (`apps/api/test/audit/audit-atomicity.audit-atomicity-spec.ts`) | PASS — 9/9 tests | Category A test correction at `c05fc323` resolved the single remaining failure (`expect(outboxRows).toBe(0)` received 3) by scoping the assertion to the failed operation. |
| Audit integration (`apps/api/test/audit/audit-integration.audit-integration-spec.ts`) | PASS | No corrections needed — already green. |
| Audit database (`apps/api/test/audit/audit-*.db-spec.ts`) | PASS | No corrections needed — already green. |
| Audit concurrency (`apps/api/test/audit/audit-concurrency*.spec.ts`) | PASS | No corrections needed — already green. |
| Audit verification (`apps/api/test/audit/audit-verification*.spec.ts`) | PASS | No corrections needed — already green. |

**Total tests passing on PostgreSQL 17 (commit `c05fc323`):** 229 across 7 suites.

## `adr-015-validation` Branch

- **Purpose:** GitHub Actions workflow for validating ADR-015 against PostgreSQL 17 in Docker, plus iterative test corrections discovered by the workflow.
- **Tip:** `c05fc323c086603942d6c9ed264367cf450745e9`
- **origin sync:** in sync (pushed)
- **Workflow file:** `.github/workflows/adr015-postgresql17-validation.yml`
- **Status:** All 7 PostgreSQL 17 test suites green (229 tests). Ready for integration into `main`.

**ADR-015 validation workflow commit history (v1 through v11):**

| SHA (full) | Version | Fix |
|---|---|---|
| `19880758655230a40532fdc5d66430cdfa0c0279` | v1 | Corepack-based pnpm |
| `6c01bda31063c7e5f6eeedff7adb477820e13bc0` | v2 | npm-installed pnpm, node:22 |
| `6af7e180ec8074856047636628f9964360c49a23` | v3 | node:24, workspace ownership |
| `64a27df0adadb933b67ff1bc0a86125277c18233` | v4 | `bash -c` instead of `bash -lc`, PG_BINDIR hardening |
| `aa4eff100e1edf122ee81b17c539cf3917861550` | v5 | `pnpm --dir apps/api exec prisma` for workspace resolution |
| `d2aab9f5af0cf1d06b93fd95245c0e7ac7ed2248` | v6 | `pnpm run build:shared` before typecheck |
| `44257645e45041d17b8987d7211896ffe184ed11` | v7 | Add comment for manual retrigger in workflow |
| `c98d9b365961ba7e508e898ea57ff36b025b6a56` | v8 | Empty retrigger commit (workflow did not auto-fire on previous push) |
| `679c7e14360e53176f6c61afb167fc9c160fc35d` | v9 | Build observability before API typecheck |
| `494eecefa256d40b2d01f3f777888b9eecdfaf8d` | v10 | Fix ADR-015 context login fixture email |
| `e83045118b2c5e31ec2822f92d5d575242e12766` | v11a | Align RBAC database fixtures with ADR-015 tenant_id and scope indexes |
| `2f19e185f69064486296ed9c769c0543780c4af7` | v11b | Harden ADR-015 database tests against PostgreSQL canonical output (context + RBAC) |
| `c05fc323c086603942d6c9ed264367cf450745e9` | v11c | Scope audit atomicity outbox assertions to failed operations |

**Deploy key lifecycle on `adr-015-validation`:** Temporary GitHub deploy keys v9, v10, v11 were each generated outside the repository, used for a single fast-forward push of `adr-015-validation`, verified post-push, and then deleted from the local filesystem. Each public key was registered as a repository deploy key on github.com and must be removed by the operator after the corresponding CI run was inspected. v11 key material was deleted locally after the audit-atomicity push; the v11 deploy-key entry on github.com should be removed by the operator once the integration push to `main` is complete and the resulting `main` CI run is green.

## Quarantine Branches

### `quarantine/auto-commit-8d5e167`

- **Purpose:** Preserves an accidental automatic commit that captured 94 previously-untracked files onto `main`
- **Quarantined SHA:** `8d5e167490824d1489a56efbda9574d882356176`
- **Subject:** `05cb14bc-51b7-4ad6-8f09-12c214fbe300` (UUID — environment-generated)
- **origin sync:** local-only (never pushed)
- **Disposition:** Pending operator decision — cherry-pick useful files, preserve indefinitely, or eventually delete
- **Recovery action taken:** `main` was reset from `8d5e167` back to `f78ad27` (the last verified commit at the time) after creating this quarantine branch

**Important:** This quarantine branch contains 94 files that were NOT intended to be committed. Do not cherry-pick from it without individually reviewing each file for secrets, temporary artifacts, and relevance.

### `quarantine/accidental-main-amend-271006f`

- **Purpose:** Preserves an accidental `git commit --amend` that rewrote `main`'s tip commit, discovered before push.
- **Quarantined SHA:** `271006f59eac656cd03bd313a1d5aa5d30de8623`
- **origin sync:** local-only (never pushed)
- **Disposition:** Pending operator decision — preserve indefinitely or eventually delete
- **Recovery action taken:** `main` was reset back to its pre-amend tip after creating this quarantine branch

Both quarantine branches remain local-only. Neither has ever been pushed to `origin`.

## Continuity Update

This section records the integration-preparation work performed on 2026-07-24.

- **Integration branch:** `integration/adr-015-validated` (local-only)
- **Integration branch start point (main base):** `e046e0dac9334ec8a5b919140ca9eefe53df64c0`
- **Validated branch SHA merged in:** `c05fc323c086603942d6c9ed264367cf450745e9`
- **Merge commit SHA:** `5825ba4417d2708af126325dede65df8cfa1b77f`
- **Merge parents (in order):** `e046e0dac9334ec8a5b919140ca9eefe53df64c0`, `c05fc323c086603942d6c9ed264367cf450745e9`
- **Continuity commit SHA:** recorded in this commit's own metadata (the commit that added this section to PROJECT_CONTINUITY.md, subject `docs: record validated ADR-015 integration`).
- **Recovery tag:** `adr-015-validated-pre-main-v1` (annotated, local-only) — points to the final integration-branch tip (the continuity commit).
- **v12 deploy key:** generated at `/home/z/.ssh/ibn_hayan_main_integration_deploy_key_v12` (Ed25519, no passphrase, comment `ibn-hayan-main-integration-v12`, 600/644 permissions). Private key never printed. Public key registered as a repository deploy key on github.com pending the operator-triggered `main` push.

### Files created by the integration session

- `.github/workflows/adr015-postgresql17-validation.yml` (via merge — originally added on `adr-015-validation` at `1988075`)
- (No new files outside the merge.)

### Files modified by the integration session

- `apps/api/test/audit/audit-atomicity.audit-atomicity-spec.ts` (via merge — final form at `c05fc323`)
- `apps/api/test/context/context.e2e.context-spec.ts` (via merge — final form at `494eece`)
- `apps/api/test/database/context.db-spec.ts` (via merge — final form at `2f19e18`)
- `apps/api/test/database/rbac.db-spec.ts` (via merge — final form at `2f19e18`)
- `PROJECT_CONTINUITY.md` (this update commit)

### Files deleted by the integration session

- None.

### Known remaining risks

1. **Merge commit not yet CI-validated on PostgreSQL 17.** The merge commit `5825ba4` was NOT itself run against PostgreSQL 17. Only the validation tip `c05fc323` was. Risk is low because the merge introduced no production code, schema, or migration changes (only workflow + test files, byte-identical to `c05fc323`), but the operator should monitor the next CI run triggered by the eventual `main` push.
2. **GitHub deploy keys v9/v10/v11 may still be registered on github.com.** Local key material was deleted after each push, but the registered public keys on github.com must each be removed by the operator. Until removed, a leaked public-key fingerprint alone is insufficient (the private key is gone), but defence-in-depth argues for removal.
3. **v12 deploy key is currently registered on github.com and the private key exists locally.** Until the operator pushes `main` and inspects the resulting CI run, this key is the active push credential. After the `main` push is verified, the v12 private key should be `shred`-deleted locally and the public key removed from github.com.
4. **Quarantine branches contain 94+1 files of mixed quality.** `quarantine/auto-commit-8d5e167` (94 files) and `quarantine/accidental-main-amend-271006f` (1 commit's worth of changes) have not been cherry-picked or audited in detail. Operator should decide disposition.
5. **PROJECT_CONTINUITY.md on `main` is stale.** This update lives on `integration/adr-015-validated`, not on `main`. When the operator pushes the integration branch to `main`, this update will land on `main` as part of the merge. Until then, agents reading `main`'s PROJECT_CONTINUITY.md will see the pre-integration state (which still references `d2aab9f` as the validation tip — incorrect as of 2026-07-24).
6. **`worklog.md` is intentionally NOT updated by this session** per task constraints. It contains session-level work logs from prior agents and may need its own update pass by the operator.

### Immediate next step

The operator should review the integration branch (`integration/adr-015-validated`), confirm the merge commit `5825ba4` and continuity commit meet expectations, then push the integration branch to `main` as a fast-forward (or as a `--no-ff` merge commit if a different merge shape is desired on `main`'s history). The push must use the v12 deploy key, must target only `refs/heads/main`, must be a fast-forward from `e046e0d` to the integration branch tip, and must NOT use `--force` or `--force-with-lease`. After push, monitor the resulting GitHub Actions run on `main` (which will run the project's standard CI, not the ADR-015 workflow — that workflow only triggers on `adr-015-validation`).

### Recovery instructions

If the integration branch needs to be discarded:
- `git worktree remove /home/z/adr015-main-integration` (already done in this session — worktree is gone, branch and tag remain reachable from the primary worktree at `/home/z/my-project`)
- `git branch -D integration/adr-015-validated` (deletes the integration branch — recovery tag still points to the same SHA)
- `git tag -d adr-015-validated-pre-main-v1` (deletes the recovery tag — only do this if you are sure you no longer need the integration work)

If the integration branch needs to be re-examined:
- `git checkout integration/adr-015-validated` (in a fresh worktree, e.g. `git worktree add /tmp/adr015-review integration/adr-015-validated`)
- `git show adr-015-validated-pre-main-v1` (inspect the recovery tag)

If the eventual `main` push needs to be rolled back:
- `git reset --hard e046e0dac9334ec8a5b919140ca9eefe53df64c0` on `main` (with explicit operator authorisation) — returns `main` to its pre-integration state. The integration branch and recovery tag remain available for re-attempt.

## Pending Actions

The following items require operator attention:

1. **Push `integration/adr-015-validated` to `origin/main`:** Use the v12 deploy key. Fast-forward only. After push, monitor the resulting CI run on `main`.
2. **Remove GitHub deploy keys v9/v10/v11/v12 from github.com:** Each was registered for a single push and is no longer needed after the corresponding CI run is green.
3. **Delete v12 private key locally:** `shred -u /home/z/.ssh/ibn_hayan_main_integration_deploy_key_v12` after the `main` push is verified.
4. **Quarantine branch disposition:** Decide what to do with `quarantine/auto-commit-8d5e167` (94 files) and `quarantine/accidental-main-amend-271006f` (1 commit) — may contain useful work or may be entirely disposable.
5. **`worklog.md` update:** Consider a separate session to bring `worklog.md` in line with this continuity update.

## ADR-015 Context

**ADR-015: Scoped Organisation and Facility Context Foundation**

This is the primary feature under development. It adds multi-tenant scoping to the authorization system:

- **Schema changes:** `tenant_role_assignments` table gains `tenant_id`, `scope_level`, `scope_organisation_id`, `scope_facility_id`
- **Migration:** Backfills scoped context from `tenant_memberships`
- **Domain:** New `ScopeLevel` enum, scoped `RoleAssignment` aggregate, facility-aware authorization
- **API:** `SessionContextService` resolves the caller's active scope; `SessionContextController` exposes scope-switching endpoints
- **Web:** Dashboard reads context and allows scope selection
- **Contracts:** Zod schemas for context negotiation between web and API
- **Observability:** Audit action codes extended for scope-change events

**Validation strategy:** A Docker-based GitHub Actions workflow runs the full test suite against PostgreSQL 17 (the production target), since the development environment only has PostgreSQL 15/16 available locally.

## Recovery Checkpoints

If the repository enters an unknown or corrupted state, use these checkpoints:

| Checkpoint | SHA | Recovery |
|---|---|---|
| Pre-safety-skill main | `f78ad2731bc681b52d2cde3f261ff0fa3f13417b` | `git reset --hard f78ad27` (with authorization) |
| Safety-skill main | `e046e0dac9334ec8a5b919140ca9eefe53df64c0` | `git reset --hard e046e0d` (with authorization) — current `main` tip before integration push |
| Pre-ADR-015-push main | `ff4df26748d92355c0316fc0ceb32d81458d8815` | `git reset --hard ff4df26` (with authorization) |
| ADR-015 validation final tip | `c05fc323c086603942d6c9ed264367cf450745e9` | `git checkout adr-015-validation` |
| Integration merge commit | `5825ba4417d2708af126325dede65df8cfa1b77f` | `git checkout integration/adr-015-validated` |
| Integration recovery tag | `adr-015-validated-pre-main-v1` | `git checkout adr-015-validated-pre-main-v1` (annotated tag) |
| Quarantine (accidental commit) | `8d5e167490824d1489a56efbda9574d882356176` | `git checkout quarantine/auto-commit-8d5e167` |
| Quarantine (accidental amend) | `271006f59eac656cd03bd313a1d5aa5d30de8623` | `git checkout quarantine/accidental-main-amend-271006f` |
| Safety skill tag | `project-safety-skill-v1` | `git checkout project-safety-skill-v1` |

## Update Protocol

This document must be updated whenever:

1. A new commit is pushed to `origin/main` — add it to the Canonical Commit History table
2. A new branch is created or a branch is deleted — update Active Branches
3. A quarantine or backup branch is created — document it and its disposition
4. The project state changes materially (new ADR, new feature area, stack change)
5. A recovery checkpoint is established

When updating, always:
- Append to the history; never rewrite prior entries
- Include the full 40-character SHA
- Note the disposition of any temporary resources (keys, shims, branches)
