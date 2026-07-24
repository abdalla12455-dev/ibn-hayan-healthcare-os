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
| `e046e0dac9334ec8a5b919140ca9eefe53df64c0` | 2026-07-24 07:39 | docs: install permanent AI agent safety skill | Adds AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md. Permanent safety skill; no longer the `main` tip. |
| `5825ba4417d2708af126325dede65df8cfa1b77f` | 2026-07-24 11:55 | Merge validated ADR-015 organisation and facility context implementation | ADR-015 integration merge commit (parents: `e046e0d` and `c05fc323`). Merged the validated ADR-015 workflow and test corrections. No new production code was introduced by this merge. |
| `c7929c0360874b596ae1a62a80511cc78598da3e` | 2026-07-24 11:57 | docs: record validated ADR-015 integration | ADR-015 continuity commit (parent: `5825ba4`). Recorded validated integration state in PROJECT_CONTINUITY.md. |
| `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` | 2026-07-24 12:50 | ci: add standard validation workflow for main | Main CI implementation (parent: `c7929c0`). Added `.github/workflows/main-ci.yml` and updated PROJECT_CONTINUITY.md. No production code, test, schema, migration, or dependency file changed. |
| `e610635956a4a406305aca2b0b6a12a84b7f32a6` | 2026-07-24 16:57 | Merge pull request #1 from abdalla12455-dev/ci/main-standard-workflow-v1 | Pull Request #1 merge commit (parents: `c7929c0` and `0acb9da`). GitHub merge-commit strategy. PR Main CI and main-push Main CI both passed (operator-verified). **Current tip of `origin/main`.** |

### Current State (as of post-CI-merge continuity refresh 2026-07-24)

- **Local `main`:** `e610635956a4a406305aca2b0b6a12a84b7f32a6`
- **`origin/main`:** `e610635956a4a406305aca2b0b6a12a84b7f32a6`
- **Ahead/behind main:** `0 0` (in sync)
- **`adr-015-validation` tip (local + remote):** `c05fc323c086603942d6c9ed264367cf450745e9`
- **Validation ahead/behind origin:** `0 0` (in sync)
- **`ci/main-standard-workflow-v1` tip (local + remote):** `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` — pushed, merged into `main` via Pull Request #1 (merge commit `e610635`)
- **`integration/adr-015-validated` tip (local-only):** `c7929c0360874b596ae1a62a80511cc78598da3e` — local-only, never pushed
- **Recovery tag `adr-015-validated-pre-main-v1` (local + remote):** target `c7929c0360874b596ae1a62a80511cc78598da3e` — intact
- **Working tree (primary worktree `/home/z/my-project`):** clean
- **Safety skill installed:** added at `e046e0dac9334ec8a5b919140ca9eefe53df64c0` (AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md) and remains intact at the current `main` tip `e610635`. Note: `e046e0d` is no longer the `main` tip — it is the commit where the safety skill was first introduced.

## Integration Branch: `integration/adr-015-validated`

This branch was created on 2026-07-24 to prepare the validated ADR-015 work for final integration into `main`. It exists only locally and has NOT been pushed (and never will be — it was a rehearsal vehicle whose content has since landed on `main` via the merge commit `5825ba4` and continuity commit `c7929c0`; the branch itself is retained local-only as a recovery reference).

- **Purpose:** Conflict-free merge rehearsal of `origin/adr-015-validation` onto the then-current `main`, plus a continuity-documentation commit. The rehearsal was reviewed by the operator, then pushed to `main` as a fast-forward on 2026-07-24.
- **Branch start point (parent 1):** `e046e0dac9334ec8a5b919140ca9eefe53df64c0` (the `main` tip at the time the integration branch was created — no longer the `main` tip)
- **Merged branch (parent 2):** `c05fc323c086603942d6c9ed264367cf450745e9` (`origin/adr-015-validation` tip, fully validated against PostgreSQL 17)
- **Merge commit:** `5825ba4417d2708af126325dede65df8cfa1b77f`
- **Merge subject:** `Merge validated ADR-015 organisation and facility context implementation`
- **Merge strategy:** `--no-ff --no-commit` rehearsal, then explicit commit. No conflicts encountered. Three-way merge cleanly preserved all three safety docs from `main` while bringing in the workflow + test corrections from `adr-015-validation`.
- **Continuity commit (tip of integration branch):** `c7929c0360874b596ae1a62a80511cc78598da3e` (subject `docs: record validated ADR-015 integration`). This commit became the `main` tip after the integration push, and is the parent of the CI branch commit `0acb9da`.
- **Recovery tag:** `adr-015-validated-pre-main-v1` (annotated, local + remote, target `c7929c0360874b596ae1a62a80511cc78598da3e`).
- **Origin sync:** local-only — the branch itself has NOT been pushed and never will be. Its content is on `main`.

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

**Resolved risks (recorded for audit history):**

1. ~~**Merge commit not yet CI-validated on PostgreSQL 17.**~~ **RESOLVED (2026-07-24).** The merge commit `5825ba4` was not directly run against PostgreSQL 17, but its descendant `e610635956a4a406305aca2b0b6a12a84b7f32a6` was — the `main-ci` workflow's `postgresql17-validation` job ran green on `e610635` (operator-verified). The tree of `e610635` differs from `5825ba4` only in the addition of `.github/workflows/main-ci.yml` and the `PROJECT_CONTINUITY.md` update, neither of which is exercised by the PostgreSQL 17 test suites. The green run on `e610635` is therefore a valid predictor for `5825ba4`'s PostgreSQL 17 behaviour.
2. ~~**Local main being behind remote main.**~~ **RESOLVED (2026-07-24).** Local `main` was fast-forwarded from `c7929c0` to `e610635` in the synchronization task. Local and remote `main` are now both at `e610635` (divergence `0 0`).
3. ~~**Lack of standard CI on `main`.**~~ **RESOLVED (2026-07-24).** The `main-ci` workflow is now live on `main` (added via PR #1 merge at `e610635`). It fires on every push to `main` and every pull request targeting `main`.
4. ~~**Pending PR CI validation.**~~ **RESOLVED (2026-07-24).** The PR #1 Main CI run passed (operator-verified).
5. ~~**Pending `main`-push CI validation.**~~ **RESOLVED (2026-07-24).** The `main`-push Main CI run passed (operator-verified).
6. ~~**v12 deploy key active locally.**~~ **RESOLVED.** The v12 local private key was `shred -u` deleted in the prior integration-push task. No v12 private-key material remains locally.
7. ~~**PROJECT_CONTINUITY.md on `main` is stale (pre-integration state).**~~ **RESOLVED.** The integration landed on `main` at `c7929c0`, and the CI branch's expanded `PROJECT_CONTINUITY.md` landed on `main` at `e610635` via PR #1. This very commit (on `docs/post-ci-merge-continuity-update`) further refreshes the document to reflect the post-PR-merge, post-green-CI state.

**Unresolved risks (still pending operator action):**

1. **GitHub-side stale deploy keys may remain.** The v9, v10, v11, v12, and v13 GitHub deploy-key entries on github.com may still be registered (this environment has no `gh` CLI or API token to verify or remove them). The local private-key material for all of these is gone, so a leaked public-key fingerprint alone is insufficient to authenticate, but defence-in-depth argues for prompt operator removal of all stale entries.
2. **Quarantine branches need final disposition.** `quarantine/auto-commit-8d5e167` (94 files of mixed quality) and `quarantine/accidental-main-amend-271006f` (1 commit's worth of changes) remain local-only and have not been cherry-picked or audited in detail. Operator should decide disposition (cherry-pick useful files, preserve indefinitely, or eventually delete).
3. **`worklog.md` remains stale.** `worklog.md` was intentionally not modified by the integration, CI-branch-push, PR-merge, synchronization, or this continuity-refresh task. It does not yet reflect the ADR-015 integration, CI branch push, PR #1 merge, Main CI green, local main synchronization, or this continuity refresh. The operator should schedule a `worklog.md` update pass.
4. **PostgreSQL test-count documentation discrepancy needs authoritative log confirmation.** This document records 229 PostgreSQL 17 tests (per the operator-verified green run on `c05fc323`). A previous session's report referenced 232. No functional failure resulted from this discrepancy. The exact totals should be confirmed against the GitHub Actions run logs for the `main-ci` workflow on `e610635` and this document updated if the logs report a different number.

### Immediate next step (integration session — HISTORICAL, completed)

> **This subsection records the immediate next step as of the original integration-preparation session (2026-07-24). All steps below have been completed. It is preserved for audit history.**

The operator reviewed the integration branch (`integration/adr-015-validated`), confirmed the merge commit `5825ba4` and continuity commit met expectations, and pushed the integration branch to `main` as a fast-forward from `e046e0d` to the integration branch tip `c7929c0` (using the v12 deploy key, targeting only `refs/heads/main`, no `--force` or `--force-with-lease`). The resulting `main` was at `c7929c0` and was subsequently advanced to `e610635` via PR #1 merge. The current immediate next steps are recorded in the "Standard Main CI Workflow → Immediate next step (post-CI-merge)" subsection above.

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

**Completed actions (recorded for audit history):**

1. ~~**Push `integration/adr-015-validated` to `origin/main`:**~~ **DONE (2026-07-24).** The integration branch was pushed to `main` as a fast-forward from `e046e0d` to `c7929c0` using the v12 deploy key. `main` subsequently advanced to `e610635` via PR #1 merge.
2. ~~**Delete v12 private key locally:**~~ **DONE.** The v12 private key was `shred -u` deleted locally after the `main` push was verified.
3. ~~**ADR-015 integration into `main`:**~~ **DONE.** Landed at `c7929c0` (merge commit `5825ba4` + continuity commit `c7929c0`).
4. ~~**Main CI branch push (`ci/main-standard-workflow-v1` to `origin`):**~~ **DONE.** Pushed at `0acb9da` using the v13 deploy key.
5. ~~**Pull Request #1 merge:**~~ **DONE.** PR #1 merged at `e610635` (GitHub merge-commit strategy).
6. ~~**PR Main CI run:**~~ **DONE (green, operator-verified 2026-07-24).**
7. ~~**`main`-push Main CI run:**~~ **DONE (green, operator-verified 2026-07-24).**
8. ~~**Local main synchronization:**~~ **DONE.** Local `main` fast-forwarded from `c7929c0` to `e610635` (divergence now `0 0`).
9. ~~**Local v12 and v13 credential deletion:**~~ **DONE.** Both v12 and v13 local private/public key files are deleted. No v9-v13 key material remains locally.

**Still pending operator action:**

1. **Remove stale GitHub deploy keys from github.com.** Audit the repository's deploy-key list on github.com and remove any v9, v10, v11, v12, and v13 entries that are still present. All corresponding local private keys are gone. GitHub-side removal must be performed and confirmed by the operator (this environment has no `gh` CLI or API token).
2. **Decide quarantine branch disposition.** `quarantine/auto-commit-8d5e167` (94 files) and `quarantine/accidental-main-amend-271006f` (1 commit) remain local-only — may contain useful work or may be entirely disposable.
3. **Update `worklog.md`.** Bring `worklog.md` in line with the current repository state (ADR-015 integration, CI branch push, PR #1 merge, Main CI green, local main synchronization, this continuity refresh).
4. **Verify authoritative GitHub test totals.** Inspect the `main-ci` workflow run logs on `e610635` directly and confirm the exact test counts. If different from the 229 PostgreSQL 17 tests recorded in this document, update the relevant tables in a follow-up documentation commit.
5. **Decide whether the merged CI branch should be retained or deleted.** `ci/main-standard-workflow-v1` (local + remote, at `0acb9da`) is now merged into `main` via PR #1. Operator may keep it as historical reference or delete it (local + remote).

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

## Standard Main CI Workflow (branch `ci/main-standard-workflow-v1`)

This branch was created on 2026-07-24 to prepare an official standard CI workflow for the canonical `main` branch. It was pushed to `origin/ci/main-standard-workflow-v1` at SHA `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6`, merged into `main` via Pull Request #1 (merge commit `e610635956a4a406305aca2b0b6a12a84b7f32a6`), and is now live on `main`. Both the PR-triggered and the `main`-push-triggered `main-ci` workflow runs passed (operator-verified 2026-07-24).

- **Purpose:** Provide continuous validation on every push to `main` and every pull request targeting `main`. The existing `.github/workflows/adr015-postgresql17-validation.yml` remains unchanged and scoped to `adr-015-validation`; the new workflow is additive.
- **Branch start point:** `c7929c0360874b596ae1a62a80511cc78598da3e` (the `main` tip at the time the CI branch was created; no longer the `main` tip after PR #1 merge)
- **New workflow path:** `.github/workflows/main-ci.yml`
- **Triggers:** `push` to `main`, `pull_request` targeting `main`, `workflow_dispatch`
- **Permissions:** `contents: read` (least privilege)
- **Concurrency:** `group: main-ci-${{ github.ref }}`, `cancel-in-progress: true` (cancels obsolete runs on the same ref)

### Gate inventory — Job 1: `static-and-build`

Runs on `ubuntu-latest` directly (no Docker, no PostgreSQL needed). Timeout: 30 minutes.

1. Checkout (actions/checkout@v4)
2. Setup Node.js 24 (actions/setup-node@v4)
3. Install pnpm 11.14.0 (npm install --global pnpm@11.14.0)
4. `pnpm install --frozen-lockfile`
5. `pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma`
6. `pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma`
7. `pnpm --dir apps/api exec prisma generate --schema prisma-audit/schema.prisma`
8. `pnpm run build:shared` (builds @ibn-hayan/contracts and @ibn-hayan/domain)
9. `pnpm --filter @ibn-hayan/observability... build`
10. `pnpm run typecheck`
11. `pnpm run lint`
12. `pnpm run test` (unit tests across all workspace packages)
13. `pnpm --filter @ibn-hayan/api audit:test:configuration` (pure unit suite — see placement decision below)
14. `pnpm run build`

### Gate inventory — Job 2: `postgresql17-validation`

Runs inside a composite `node:24-bookworm` + `postgres:17-bookworm` Docker image (identical pattern to the ADR-015 workflow, so PG 17 results on `main` are directly comparable to results on `adr-015-validation`). Timeout: 60 minutes.

1. Checkout
2. Build composite Docker image (node:24 binaries layered onto postgres:17-bookworm, pnpm 11.14.0, `PG_BINDIR=/usr/lib/postgresql/17/bin`, `PATH` includes PG_BINDIR)
3. Verify execution environment (explicit PostgreSQL 17 major-version check: `postgres --version | grep "PostgreSQL) 17."`)
4. Run complete monorepo static and build gates inside container (prisma validate/generate, build:shared, observability build, typecheck, lint, test, build — same as Job 1, to ensure container self-consistency)
5. Run PostgreSQL 17 test suites (inside container, `cd apps/api`):
   - `pnpm test:context`
   - `pnpm test:database`
   - `pnpm audit:test:atomicity`
   - `pnpm audit:test:integration`
   - `pnpm audit:test:database`
   - `pnpm audit:test:concurrency`
   - `pnpm audit:test:verify`

### PostgreSQL 17 suite inventory (10 test files, 229 tests per operator-verified `c05fc323` run)

| Suite | Config | Test files | Tests | PG-dependent |
|---|---|---|---|---|
| `test:context` | `vitest.context.config.ts` | 1 | (part of 229) | Yes |
| `test:database` | `vitest.database.config.ts` | 4 | (part of 229) | Yes |
| `audit:test:atomicity` | `vitest.audit-atomicity.config.ts` | 1 | (part of 229) | Yes |
| `audit:test:integration` | `vitest.audit-integration.config.ts` | 1 | (part of 229) | Yes |
| `audit:test:database` | `vitest.audit-database.config.ts` | 1 | (part of 229) | Yes |
| `audit:test:concurrency` | `vitest.audit-concurrency.config.ts` | 1 | (part of 229) | Yes |
| `audit:test:verify` | `vitest.audit-verify.config.ts` | 1 | (part of 229) | Yes |
| **Total PG suites** | | **10** | **229** | |

### `audit:test:configuration` placement decision

**Decision:** Placed in Job 1 (`static-and-build`), NOT in Job 2 (`postgresql17-validation`).

**Reason:** The `vitest.audit-configuration.config.ts` docstring explicitly states: "These tests verify that `AuditConfigurationService` and the `validateAuditKey` / `validateAuditKeyPair` helpers enforce the production fail-closed posture required by the ninth canonical batch specification. **They run without a database (pure unit tests)**, so the default Vitest configuration is sufficient."

**Source verification:** The test file `apps/api/test/audit/audit-configuration.spec.ts` has no `setupDatabaseTests` import (unlike all PG-dependent suites, e.g. `audit-atomicity` imports `setupDatabaseTests` from `../database/_pg-bootstrap.js`), no `PG_BINDIR` reference, no `PrismaClient` instantiation. It only manipulates environment variables (`AUDIT_DATABASE_URL`, `AUDIT_INTEGRITY_HMAC_KEY`, etc.) as strings and asserts `AuditConfigurationService` behaviour. It is therefore database-independent.

**Consequence:** Placing it in the PG job would needlessly couple a fast (9ms, 28-test) unit suite to a 60-minute Docker+PostgreSQL job. Placing it in the static job gives it a 30-second turnaround on every push/PR.

**Test count:** 28 tests in 1 file. Verified locally: `pnpm --filter @ibn-hayan/api audit:test:configuration` → 28 passed in 9ms.

### Files created and modified

**Created (1):**
- `.github/workflows/main-ci.yml` (new standard CI workflow for `main`)

**Modified (1):**
- `PROJECT_CONTINUITY.md` (this section)

**Deleted (0).**

**Unchanged (verified):**
- `.github/workflows/adr015-postgresql17-validation.yml` — preserved exactly as-is
- No production source files (`apps/*/src`, `packages/*/src`) changed
- No Prisma schema or migration changed
- No dependency manifest or lockfile changed
- `AGENTS.md` unchanged (no new durable safety rule required — the workflow follows existing invariants)
- `docs/AI_AGENT_SAFETY_SKILL.md` unchanged
- `worklog.md` unchanged (per task constraint)

### Local validation results (run inside the isolated worktree)

All gates were run locally to confirm the workflow's commands are correct and the codebase passes:

| Gate | Result | Details |
|---|---|---|
| `git diff --check` | PASS | No whitespace errors |
| YAML syntax | PASS | Parsed by PyYAML |
| GitHub Actions event syntax | PASS | push:main, pull_request:main, workflow_dispatch |
| Workflow permissions | PASS | `contents: read` (least privilege) |
| Concurrency rules | PASS | `main-ci-${{ github.ref }}`, cancel-in-progress |
| Timeout values | PASS | 30min (static), 60min (PG) |
| Node version | PASS | 24 (matches `engines` in root package.json) |
| pnpm version | PASS | 11.14.0 (matches `packageManager` in root package.json) |
| Prisma command paths | PASS | All use `pnpm --dir apps/api exec prisma ... --schema ...` |
| PostgreSQL PATH handling | PASS | `PG_BINDIR=/usr/lib/postgresql/17/bin`, PATH includes PG_BINDIR |
| No production secrets | PASS | No hardcoded secrets, no `secrets.` context usage |
| No deployment command | PASS | No deploy/kubectl/helm/ssh/scp/docker push |
| No destructive DB command | PASS | No migrate reset/dev, no db push, no DROP/TRUNCATE/DELETE |
| Prisma validate | PASS | "The schema at prisma/schema.prisma is valid" |
| Prisma generate (transactional) | PASS | Generated Prisma Client 7.8.0 to ./generated/prisma |
| Prisma generate (audit-store) | PASS | Generated Prisma Client 7.8.0 to ./generated/prisma-audit |
| `pnpm run build:shared` | PASS | contracts + domain built |
| `pnpm --filter @ibn-hayan/observability... build` | PASS | observability built |
| `pnpm run typecheck` | PASS | All packages (api, web, contracts, domain, observability, testing, configuration) |
| `pnpm run lint` | PASS | All packages |
| `pnpm run test` (unit) | PASS | **20 test files, 443 tests passed** (api: 1 file/5 tests, web: 7 files/138 tests, contracts: 4 files/123 tests, domain: 3 files/94 tests, observability: 5 files/83 tests) |
| `pnpm --filter @ibn-hayan/api audit:test:configuration` | PASS | **1 test file, 28 tests passed** (9ms) |
| `pnpm run build` | PASS | All packages built (api via SWC, web via Next.js static generation) |

**PostgreSQL 17 suites:** NOT run locally (no PostgreSQL 17 in this environment). The workflow's PG job reuses the exact Docker image and commands proven on `c05fc323` in the ADR-015 workflow. The workflow has now executed on GitHub Actions (see "GitHub runtime validation" subsection below), and both jobs passed per operator-verified evidence.

### GitHub runtime validation (COMPLETE)

The `main-ci` workflow has executed on GitHub Actions and is green. Two runs were observed:

1. **Pull Request run** (triggered by `pull_request: branches: [main]` when PR #1 was opened): both `static-and-build` and `postgresql17-validation` jobs PASSED (operator-verified 2026-07-24).
2. **`main` push run** (triggered by `push: branches: [main]` when PR #1 was merged, advancing `main` to `e610635`): both `static-and-build` and `postgresql17-validation` jobs PASSED (operator-verified 2026-07-24).

The workflow's Docker image build, container execution, PG cluster bootstrap, and all 7 PostgreSQL 17 test suites ran green on GitHub Actions. The workflow is now live on `main` and will fire on every future push to `main` and every pull request targeting `main`.

**Test-count documentation discrepancy:** This document's "PostgreSQL 17 suite inventory" table and "Test discovery totals" table record 229 PostgreSQL 17 tests (per the operator-verified green run on `c05fc323` from the ADR-015 validation session). A previous session's report referenced 232 tests. The locally recorded historical totals therefore differ. The GitHub Actions run logs for the `main-ci` workflow on `e610635` are the authoritative source. No functional failure resulted from this documentation discrepancy. The exact totals in this document should be updated only after the GitHub Actions logs are inspected directly. The 229 figure remains the best available predictor and is consistent with the ADR-015 validation run on `c05fc323`.

### Test discovery totals (locally recorded; pending GitHub Actions log confirmation)

> **Note:** The totals below were recorded from local validation runs during the CI branch preparation session. The GitHub Actions run logs for the `main-ci` workflow on `e610635` are the authoritative source. If the GitHub Actions logs report different totals, this table should be updated in a follow-up documentation commit. See the "Test-count documentation discrepancy" note above.

| Category | Test files | Tests | Where run |
|---|---|---|---|
| Unit tests (`pnpm run test`) | 20 | 443 | Job 1 (static-and-build) |
| `audit:test:configuration` | 1 | 28 | Job 1 (static-and-build) |
| PostgreSQL 17 suites | 10 | 229 | Job 2 (postgresql17-validation) |
| **Total** | **31** | **700** | |

### Cross-reference: existing branches, tags, and quarantine (as of post-CI-merge continuity refresh)

- **`main` (local + remote):** `e610635956a4a406305aca2b0b6a12a84b7f32a6` — updated by PR #1 merge
- **`ci/main-standard-workflow-v1` (local + remote):** `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` — pushed, merged into `main` via PR #1
- **`adr-015-validation` (local + remote):** `c05fc323c086603942d6c9ed264367cf450745e9` — unchanged
- **`integration/adr-015-validated` (local-only):** `c7929c0360874b596ae1a62a80511cc78598da3e` — unchanged
- **Recovery tag `adr-015-validated-pre-main-v1` (local + remote):** target `c7929c0360874b596ae1a62a80511cc78598da3e` — unchanged
- **`quarantine/auto-commit-8d5e167` (local-only):** `8d5e167490824d1489a56efbda9574d882356176` — unchanged
- **`quarantine/accidental-main-amend-271006f` (local-only):** `271006f59eac656cd03bd313a1d5aa5d30de8623` — unchanged

### v13 deploy key

A v13 Ed25519 deploy key was generated for the push of `ci/main-standard-workflow-v1` to `origin`:
- **Private key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13` (permissions 600, outside the repository) — **DELETED**. The private key was `shred -u` deleted locally immediately after the CI branch push was verified (per AGENTS.md invariant 5). No v13 private-key material remains on the local filesystem.
- **Public key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13.pub` (permissions 644) — **DELETED**. Removed with `rm -f` after the push was verified.
- **Comment:** `ibn-hayan-main-ci-v13`
- **Status:** Local private and public key files are gone. The v13 public key entry was registered as a repository deploy key on github.com (with write access) for the CI branch push. The v13 GitHub deploy-key entry should now be removed by the operator because the Pull Request Main CI run and the `main`-push Main CI run are both green (operator-verified 2026-07-24). GitHub-side removal has NOT been independently verified from this environment (no `gh` CLI, no API token) — the operator must perform and confirm the removal.
- **Lifecycle:** Per AGENTS.md invariant 5, the local private key was deleted immediately after the push was verified. The github.com-side public key entry is the final cleanup step, now safe to perform since both CI runs are green.

### Older deploy keys (v9, v10, v11, v12) — github.com-side audit pending

Per AGENTS.md invariant 5, each of these temporary GitHub deploy keys was used for a single fast-forward push, and the local private-key material was `shred -u` deleted after each push was verified. However, the corresponding public-key entries on github.com may still be registered. The operator should audit the repository's deploy-key list on github.com and remove any v9, v10, v11, v12, and v13 entries that are still present. GitHub-side removal has NOT been independently verified from this environment. Until these entries are removed, defence-in-depth argues for prompt operator action (the private keys are gone, so a leaked public-key fingerprint alone is insufficient to authenticate, but stale deploy-key entries are an unnecessary attack surface).

### Immediate next step (post-CI-merge)

The CI branch preparation, push, PR #1 merge, and both Main CI runs are all complete. The remaining operator actions are:

1. **Remove the v13 GitHub deploy-key entry from github.com.** Both Main CI runs (PR-triggered and `main`-push-triggered) are green, so the v13 entry is no longer needed. GitHub-side removal must be performed and confirmed by the operator (this environment has no `gh` CLI or API token to perform it directly).
2. **Audit and remove any remaining v9, v10, v11, v12 GitHub deploy-key entries from github.com.** Each was registered for a single push and is no longer needed after the corresponding CI run is green.
3. **Verify the authoritative GitHub Actions test totals.** Inspect the `main-ci` workflow run logs on `e610635` directly and confirm the exact test counts. If the GitHub Actions logs report a different PostgreSQL 17 test total than the 229 recorded in this document, update the "PostgreSQL 17 suite inventory" and "Test discovery totals" tables in a follow-up documentation commit.
4. **Decide quarantine branch disposition.** `quarantine/auto-commit-8d5e167` (94 files) and `quarantine/accidental-main-amend-271006f` (1 commit) remain local-only and pending operator decision (cherry-pick, preserve, or delete).
5. **Update `worklog.md`.** Bring `worklog.md` in line with the current repository state (ADR-015 integration, CI branch push, PR #1 merge, Main CI green, local main synchronization, this continuity refresh). `worklog.md` was intentionally not modified by this task.
6. **Decide whether the merged CI branch should be retained or deleted.** `ci/main-standard-workflow-v1` (local + remote, at `0acb9da`) is now merged into `main` via PR #1. The operator may keep it as a historical reference or delete it (both local and remote) now that it is merged. Operator preference.

### Recovery information

If the CI branch needs to be re-examined (it is now merged into `main` via PR #1, but the branch itself remains on both local and remote):
- `git worktree add /tmp/main-ci-review ci/main-standard-workflow-v1` (the local branch `ci/main-standard-workflow-v1` at `0acb9da` is still reachable)
- `cat /tmp/main-ci-review/.github/workflows/main-ci.yml`
- Alternatively, inspect the merged workflow directly on `main`: `git show e610635956a4a406305aca2b0b6a12a84b7f32a6:.github/workflows/main-ci.yml`

If the merged CI branch needs to be deleted (operator decision — the branch is now merged and is no longer strictly needed):
- `git worktree remove /tmp/main-ci-review` (only if a review worktree was created above)
- `git branch -D ci/main-standard-workflow-v1` (deletes the local branch)
- The remote branch `origin/ci/main-standard-workflow-v1` can be removed via the GitHub UI or `git push origin --delete ci/main-standard-workflow-v1` (with explicit operator authorisation).

**Historical note (v13 key cleanup — already completed):** The v13 private key (`/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13`) was `shred -u` deleted locally, and the v13 public key file (`/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13.pub`) was `rm -f` deleted locally, immediately after the CI branch push was verified in the prior push task. These commands are no longer actionable — they are recorded here for audit completeness only. The v13 GitHub deploy-key entry on github.com is the only remaining v13 artifact and is pending operator removal (see "Immediate next step" above).

## Recovery Checkpoints

If the repository enters an unknown or corrupted state, use these checkpoints.

> **Destructive recovery commands** (e.g. `git reset --hard`) require explicit operator authorisation that names the exact SHA and the exact command. They are never routine. The commands below are recorded for recovery scenarios only — they are not authorisation to run automatically.

| Checkpoint | SHA | Recovery |
|---|---|---|
| Pre-safety-skill main | `f78ad2731bc681b52d2cde3f261ff0fa3f13417b` | `git reset --hard f78ad27` (with explicit operator authorisation) |
| Safety-skill main | `e046e0dac9334ec8a5b919140ca9eefe53df64c0` | `git reset --hard e046e0d` (with explicit operator authorisation) — `main` tip before ADR-015 integration push (no longer the current tip) |
| Pre-ADR-015-push main | `ff4df26748d92355c0316fc0ceb32d81458d8815` | `git reset --hard ff4df26` (with explicit operator authorisation) |
| ADR-015 validation final tip | `c05fc323c086603942d6c9ed264367cf450745e9` | `git checkout adr-015-validation` |
| ADR-015 integration merge commit | `5825ba4417d2708af126325dede65df8cfa1b77f` | `git checkout 5825ba4` (inspect) or `git checkout integration/adr-015-validated` (branch tip at `c7929c0`) |
| ADR-015 continuity commit | `c7929c0360874b596ae1a62a80511cc78598da3e` | `git checkout c7929c0` (inspect) — `main` tip after ADR-015 integration, before CI branch merge |
| Integration recovery tag | `adr-015-validated-pre-main-v1` | `git checkout adr-015-validated-pre-main-v1` (annotated tag, target `c7929c0`) |
| Post-CI-merge main | `e610635956a4a406305aca2b0b6a12a84b7f32a6` | `git reset --hard e610635` (with explicit operator authorisation) — **current verified `main` tip after PR #1 and green Main CI** |
| Quarantine (accidental commit) | `8d5e167490824d1489a56efbda9574d882356176` | `git checkout quarantine/auto-commit-8d5e167` |
| Quarantine (accidental amend) | `271006f59eac656cd03bd313a1d5aa5d30de8623` | `git checkout quarantine/accidental-main-amend-271006f` |
| Safety skill tag | `project-safety-skill-v1` | `git checkout project-safety-skill-v1` |
| Standard main CI branch | `ci/main-standard-workflow-v1` (local + remote) | `git worktree add /tmp/main-ci-review ci/main-standard-workflow-v1` — branch at `0acb9da`, now merged into `main` via PR #1 |
| Standard main CI commit | `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` | `git checkout 0acb9da` (inspect the CI commit in isolation) |

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
