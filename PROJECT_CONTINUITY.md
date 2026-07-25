# PROJECT_CONTINUITY.md — Ibn Hayan Healthcare OS

> **This document captures the canonical state of the Ibn Hayan project for cross-session continuity. Any AI agent resuming work on this project must read this file first, then `AGENTS.md`, then `docs/AI_AGENT_SAFETY_SKILL.md`.**

## Repository

- **Remote:** https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os.git
- **Default branch:** `main`
- **Monorepo manager:** pnpm (workspace)
- **Key packages:** `apps/api`, `apps/web`, `packages/contracts`, `packages/domain`, `packages/observability`

## Authority and Live State (durable rule)

This section is the durable authority rule for how agents must interpret this document. It is invariant across documentation refreshes — it does NOT become stale when `main` advances.

**Three distinct kinds of information live in this document, and they must never be conflated:**

1. **Last verified repository baseline when a section was authored.** This is a timestamped snapshot of what `main` and other refs pointed at when an agent wrote that section. It is always labelled with the date and explicitly described as a baseline-at-time-of-authoring, NEVER as "the current tip". A baseline is a frozen historical observation, not a live claim.
2. **Completed project events and their verified SHAs.** These are immutable historical facts: PR #1 merged at `e610635`, PR #2 merged at `b34c974`, the ADR-015 integration landed at `c7929c0`, etc. Once recorded, they never change. They are the canonical record of what has happened on `main`.
3. **Live current Git state.** The actual current SHA of `main`, `origin/main`, divergence, working-tree status, and remote branch list are NEVER reliably knowable from a document — `main` may have advanced since the document was last refreshed. Agents MUST retrieve live state by running Git commands, never by trusting a hardcoded "current tip" statement in this document.

**Authority hierarchy:**

- `AGENTS.md` and `PROJECT_CONTINUITY.md` provide **durable context** (invariants, historical events, recovery checkpoints, deployment-key lifecycle, quarantine state, architectural decisions). They are authoritative for what has happened and what the operating rules are.
- **Git commands are authoritative for the live current branch, SHA, divergence, remote state, and working-tree status.** No statement in this document overrides what `git fetch && git rev-parse origin/main` returns.
- **Every agent must run `git fetch origin` and verify the current local and remote `main` SHAs before editing any tracked file.** Hardcoded SHA claims in this document are a baseline-at-time-of-authoring only; they are not authorisation to skip the fetch.
- **A documentation merge may advance `main` after the document is authored.** This is the continuity recursion problem: any continuity-only PR that records the "current tip" will itself advance `main` via its own merge commit, making its own "current tip" claim stale the moment it lands. The fix is to NEVER write "current tip of `origin/main` is `<SHA>`" as a live claim — instead write "last verified `main` baseline when this section was authored: `<SHA>` (date)" and require readers to fetch for the live value.

**When an agent finds a stale "current tip" claim in this document,** the correct response is NOT to immediately open another continuity-only PR to update it (that just restarts the recursion). The correct response is to (a) use Git for the live value, (b) update the claim as part of the next substantive documentation refresh that has a non-recursion reason to exist, and (c) ensure the new wording uses the "last verified baseline when authored" formulation rather than a live "current tip" claim.

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
| `e610635956a4a406305aca2b0b6a12a84b7f32a6` | 2026-07-24 16:57 | Merge pull request #1 from abdalla12455-dev/ci/main-standard-workflow-v1 | Pull Request #1 merge commit (parents: `c7929c0` and `0acb9da`). GitHub merge-commit strategy. PR Main CI and main-push Main CI both passed (operator-verified). Last verified `main` baseline when the post-CI-merge continuity refresh (commit `ed27ce6`) was authored on 2026-07-24. |
| `ed27ce60f9d5548f088c8657871ebb24cb38f587` | 2026-07-24 14:29 | docs: refresh continuity after PR #1 merge and green main CI | Post-CI-merge continuity refresh (parent: `e610635`). Documentation-only: refreshed `PROJECT_CONTINUITY.md` to record PR #1 merge, green PR/main Main CI runs, v13 deploy-key lifecycle, and recovery-checkpoint additions. No production code, workflow, schema, migration, dependency, or test file changed. Authored on the `docs/post-ci-merge-continuity-update` branch; pushed to `origin` using the v15 deploy key; merged into `main` via PR #2. |
| `b34c974cd123869bca825fefa5f885a90a879eea` | 2026-07-25 10:51 | Merge pull request #2 from abdalla12455-dev/docs/post-ci-merge-continuity-update | Pull Request #2 merge commit (parents: `e610635` and `ed27ce6`). GitHub merge-commit strategy. PR Main CI and main-push Main CI both passed (operator-verified 2026-07-25, both `static-and-build` and `postgresql17-validation` jobs green). PROJECT_CONTINUITY.md-only merge — the merge result tree is byte-identical to the documentation branch tip `ed27ce6`. Last verified `main` baseline when this housekeeping refresh was authored on 2026-07-25. |

### Current State (as of post-PR #2 housekeeping refresh 2026-07-25)

> **Authority note:** The SHAs below are the **last verified baseline when this section was authored** (2026-07-25). They are NOT a live claim about the current `main` tip. Any subsequent merge into `main` will advance `main` past `b34c974` and make the "Local `main`" and "`origin/main`" lines below stale. Before acting on any of this information, run `git fetch origin && git rev-parse main origin/main` and trust Git, not this section.

- **Local `main` (last verified 2026-07-25):** `b34c974cd123869bca825fefa5f885a90a879eea`
- **`origin/main` (last verified 2026-07-25):** `b34c974cd123869bca825fefa5f885a90a879eea`
- **Ahead/behind main (last verified):** `0 0` (in sync)
- **`adr-015-validation` tip (local + remote):** `c05fc323c086603942d6c9ed264367cf450745e9` — unchanged since 2026-07-24
- **Validation ahead/behind origin:** `0 0` (in sync)
- **`ci/main-standard-workflow-v1` tip (local + remote):** `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` — pushed, merged into `main` via PR #1 (merge commit `e610635`). Branch retained on local + remote as historical reference; operator may delete at discretion.
- **`docs/post-ci-merge-continuity-update` tip (local + remote):** `ed27ce60f9d5548f088c8657871ebb24cb38f587` — pushed using v15 deploy key, merged into `main` via PR #2 (merge commit `b34c974`). Branch retained on local + remote as historical reference; operator may delete at discretion.
- **`docs/final-post-pr2-housekeeping` tip (local-only):** This is the branch the present refresh is being authored on (2026-07-25). Local-only until pushed.
- **`integration/adr-015-validated` tip (local-only):** `c7929c0360874b596ae1a62a80511cc78598da3e` — local-only, never pushed
- **Recovery tag `adr-015-validated-pre-main-v1` (local + remote):** target `c7929c0360874b596ae1a62a80511cc78598da3e` — intact
- **Working tree (primary worktree `/home/z/my-project`):** clean
- **Safety skill installed:** added at `e046e0dac9334ec8a5b919140ca9eefe53df64c0` (AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md) and remains intact at the current `main` baseline `b34c974`. Note: `e046e0d` is no longer the `main` tip — it is the commit where the safety skill was first introduced.

### Post-PR #2 synchronization record (2026-07-25)

Local `main` was fast-forwarded from `e610635956a4a406305aca2b0b6a12a84b7f32a6` to `b34c974cd123869bca825fefa5f885a90a879eea` using `git merge --ff-only origin/main` after PR #2 was merged and the post-merge `main`-push Main CI run was verified green by the operator. The fast-forward advanced local `main` by 2 commits (the documentation commit `ed27ce6` content and the PR #2 merge commit `b34c974` itself), updating only `PROJECT_CONTINUITY.md` (+115/-63). No other tracked file changed. No push occurred during the synchronization. No force, rebase, reset, restore, or clean operation was performed.

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

### Cross-reference: existing branches, tags, and quarantine (as of post-PR #2 housekeeping refresh 2026-07-25)

> **Authority note:** The SHAs below are the last verified baseline when this section was authored (2026-07-25). Run `git fetch origin && git ls-remote --heads --tags origin` for the live state.

- **`main` (local + remote):** `b34c974cd123869bca825fefa5f885a90a879eea` — updated by PR #2 merge (prior: `e610635` via PR #1)
- **`ci/main-standard-workflow-v1` (local + remote):** `0acb9dadc4ce9a0fbfae5a4bb841b34166e35fb6` — pushed, merged into `main` via PR #1. Branch retained as historical reference; operator may delete.
- **`docs/post-ci-merge-continuity-update` (local + remote):** `ed27ce60f9d5548f088c8657871ebb24cb38f587` — pushed using v15 deploy key, merged into `main` via PR #2. Branch retained as historical reference; operator may delete.
- **`docs/final-post-pr2-housekeeping` (local-only):** The branch this housekeeping refresh is being authored on (2026-07-25). Local-only until pushed.
- **`adr-015-validation` (local + remote):** `c05fc323c086603942d6c9ed264367cf450745e9` — unchanged
- **`integration/adr-015-validated` (local-only):** `c7929c0360874b596ae1a62a80511cc78598da3e` — unchanged
- **Recovery tag `adr-015-validated-pre-main-v1` (local + remote):** target `c7929c0360874b596ae1a62a80511cc78598da3e` — unchanged
- **`quarantine/auto-commit-8d5e167` (local-only):** `8d5e167490824d1489a56efbda9574d882356176` — unchanged
- **`quarantine/accidental-main-amend-271006f` (local-only):** `271006f59eac656cd03bd313a1d5aa5d30de8623` — unchanged

### v13 deploy key (HISTORICAL)

A v13 Ed25519 deploy key was generated for the push of `ci/main-standard-workflow-v1` to `origin`:
- **Private key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13` (permissions 600, outside the repository) — **DELETED**. The private key was `shred -u` deleted locally immediately after the CI branch push was verified (per AGENTS.md invariant 5). No v13 private-key material remains on the local filesystem.
- **Public key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_main_ci_deploy_key_v13.pub` (permissions 644) — **DELETED**. Removed with `rm -f` after the push was verified.
- **Comment:** `ibn-hayan-main-ci-v13`
- **Status:** Local private and public key files are gone. The v13 public key entry was registered as a repository deploy key on github.com (with write access) for the CI branch push. The v13 GitHub deploy-key entry should now be removed by the operator because the Pull Request Main CI run and the `main`-push Main CI run are both green (operator-verified 2026-07-24). GitHub-side removal has NOT been independently verified from this environment (no `gh` CLI, no API token) — the operator must perform and confirm the removal.
- **Lifecycle:** Per AGENTS.md invariant 5, the local private key was deleted immediately after the push was verified. The github.com-side public key entry is the final cleanup step, now safe to perform since both CI runs are green.

### v15 deploy key (HISTORICAL)

A v15 Ed25519 deploy key was generated for the push of `docs/post-ci-merge-continuity-update` to `origin`:
- **Private key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_continuity_deploy_key_v15` (permissions 600, outside the repository) — **DELETED**. The private key was `shred -u` deleted locally immediately after the docs branch push was verified (per AGENTS.md invariant 5). No v15 private-key material remains on the local filesystem.
- **Public key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_continuity_deploy_key_v15.pub` (permissions 644) — **DELETED**. Removed with `rm -f` after the push was verified.
- **Comment:** `ibn-hayan-continuity-v15`
- **Public-key fingerprint (for operator audit only — fingerprint is public, never the private key):** `SHA256:U5D0Yk8NOOEGe8EJzSb3VhDSO50blY4LT+2WZG1lODI`
- **Status:** Local private and public key files are gone. The v15 public key entry was registered as a repository deploy key on github.com (with write access) for the docs branch push. The v15 GitHub deploy-key entry should now be removed by the operator because both the PR #2 Main CI run and the post-merge `main`-push Main CI run are green (operator-verified 2026-07-25). GitHub-side removal has NOT been independently verified from this environment (no `gh` CLI, no API token) — the operator must perform and confirm the removal.
- **Lifecycle:** Per AGENTS.md invariant 5, the local private key was deleted immediately after the push was verified. The github.com-side public key entry is the final cleanup step, now safe to perform since both PR #2 CI runs are green.

### v14 deploy key (HISTORICAL — abandoned before push)

A v14 Ed25519 deploy key was generated during the post-CI-merge continuity preparation task for the planned push of `docs/post-ci-merge-continuity-update` to `origin`:
- **Private key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_continuity_deploy_key_v14` (permissions 600, outside the repository) — **LATER FOUND ABSENT**. The v14 private key was generated and verified locally during the post-CI-merge continuity preparation task. When the subsequent push task began (in a later session), the v14 private key file, the v14 public key file, and the entire `/home/z/.ssh` directory were found absent. The precise deletion or disappearance mechanism was not independently verified.
- **Public key (HISTORICAL):** `/home/z/.ssh/ibn_hayan_continuity_deploy_key_v14.pub` (permissions 644) — **LATER FOUND ABSENT**. Same loss mechanism as the private key (not independently verified).
- **Comment:** `ibn-hayan-continuity-v14`
- **Public-key fingerprint (for operator audit only — fingerprint is public, never the private key):** `SHA256:0J+KjysgwteXnDKmeJ9rZFGUVzhU51yczQund27JhGE`
- **Status:** v14 was generated and verified locally, but was NEVER used for a push. Because the local private key was gone when the push task began, Z.AI stopped without mutation, and v15 was generated as the replacement key for the docs branch push. Whether the v14 public key was ever registered as a GitHub deploy key on github.com has NOT been independently verified from this environment (no `gh` CLI, no API token). The operator should audit the repository's deploy-key list on github.com and remove any v14 entry if one was registered.
- **Lifecycle:** v14 was generated per AGENTS.md invariant 5 (Ed25519, no passphrase, outside the repository, 600/644 permissions), was verified locally, was NEVER used for any push, and was later found missing when next inspected. No secure local deletion of v14 (e.g. `shred -u`) was independently verified — the v14 key files were simply absent when next inspected.
- **Note on the earlier inaccurate "v14 never generated" claim:** An earlier draft of this document (in the prior housekeeping commit `c8609c6cb0363180409f2657a091ffe8962c45dc`, subject `docs: record PR #2 completion and final CI housekeeping`) stated that "a v14 key was proposed in an earlier task but was never generated locally" and that "no v14 private or public key material ever existed on the local filesystem." That claim is INACCURATE. v14 was generated and verified locally; only its later local absence (mechanism unverified) led to v15 being generated as the replacement. This correction commit (`docs: correct v14 deploy-key history`) supersedes that earlier inaccurate note.

### Older deploy keys (v9, v10, v11, v12, v13, v14, v15) — github.com-side audit pending

Per AGENTS.md invariant 5, each of these temporary GitHub deploy keys (with the exception of v14, which was generated but never used) was used for a single fast-forward push, and the local private-key material was `shred -u` deleted after each push was verified. The v14 local private key was generated and verified but never used; its later local absence was discovered in a subsequent session (mechanism not independently verified). However, the corresponding public-key entries on github.com may still be registered for any of v9, v10, v11, v12, v13, v14, and v15. The operator should audit the repository's deploy-key list on github.com and remove any of these entries that are still present (including any v14 entry that may have been registered during the post-CI-merge continuity preparation task, although v14 registration has not been independently verified from this environment). GitHub-side removal has NOT been independently verified from this environment — this environment has no `gh` CLI or API token to verify or perform removal. The operator must perform and confirm removal. Until these entries are removed, defence-in-depth argues for prompt operator action (the private keys are gone, so a leaked public-key fingerprint alone is insufficient to authenticate, but stale deploy-key entries are an unnecessary attack surface).

### Immediate next step (post-PR #2 housekeeping, 2026-07-25)

The CI branch preparation, push, PR #1 merge, PR #2 docs-branch push, PR #2 merge, both pairs of Main CI runs, both local main synchronizations, and this final housekeeping refresh are all complete. The remaining operator actions are:

1. **Audit and remove stale GitHub deploy-key entries from github.com.** All of v9, v10, v11, v12, v13, and v15 were registered for single pushes and are no longer needed (each corresponding CI run is green). The v15 entry in particular is now safe to remove since both PR #2 CI runs are green. GitHub-side removal must be performed and confirmed by the operator (this environment has no `gh` CLI or API token to perform it directly). While there, audit for any v14 entry — v14 was generated and locally verified during the post-CI-merge continuity preparation task but was never used for a push (its local files were later found absent, mechanism not independently verified); whether the v14 public key was registered on github.com has not been independently verified from this environment, so the operator should audit and remove any v14 entry if one exists.
2. **Verify the authoritative GitHub Actions test totals.** Inspect the `main-ci` workflow run logs on `b34c974` directly and confirm the exact PostgreSQL 17 test count. If the GitHub Actions logs report a different total than the 229 recorded in this document (a previous session referenced 232), update the "PostgreSQL 17 suite inventory" and "Test discovery totals" tables in a follow-up documentation commit. This document does NOT invent the authoritative count — see the "Test-count documentation discrepancy" note above.
3. **Decide quarantine branch disposition.** `quarantine/auto-commit-8d5e167` (94 files) and `quarantine/accidental-main-amend-271006f` (1 commit) remain local-only and pending operator decision (cherry-pick, preserve, or delete). Both are unchanged from their original quarantine state.
4. **Decide whether the merged CI and documentation branches should be retained or deleted.** `ci/main-standard-workflow-v1` (local + remote, at `0acb9da`, merged via PR #1) and `docs/post-ci-merge-continuity-update` (local + remote, at `ed27ce6`, merged via PR #2) are both now merged into `main`. The operator may keep them as historical references or delete them (both local and remote). Operator preference.
5. **Decide whether to push `docs/final-post-pr2-housekeeping` and open PR #3.** This branch (the present housekeeping refresh) is local-only. If the operator wants the refreshed PROJECT_CONTINUITY.md and worklog.md on `main`, a fresh v16 deploy key should be generated, the branch pushed, PR #3 opened, the PR #3 Main CI run verified green, and PR #3 merged. (Note: per the durable authority rule above, this PR #3 will itself advance `main` past `b34c974`, which is expected and acceptable — the document's "last verified baseline" wording will remain accurate because it never claimed `b34c974` was the live tip.)
6. **Update `worklog.md` going forward.** `worklog.md` is being updated in this same housekeeping commit to record the full ADR-015 → PR #2 sequence. Future operational tasks should append new entries rather than rewriting historical ones.

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
| Post-CI-merge main (PR #1) | `e610635956a4a406305aca2b0b6a12a84b7f32a6` | `git reset --hard e610635` (with explicit operator authorisation) — `main` tip after PR #1 and green Main CI (no longer the current tip after PR #2) |
| Post-PR #2-merge main | `b34c974cd123869bca825fefa5f885a90a879eea` | `git reset --hard b34c974` (with explicit operator authorisation) — last verified `main` baseline when this housekeeping refresh was authored on 2026-07-25. **Not a live claim** — run `git rev-parse origin/main` for the current tip. |
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

## Clinic Admin Shell v1 Implementation (2026-07-25)

This section records the implementation of the Clinic Admin application shell v1 — the first real Clinic Admin frontend implementation task. It is appended per the Update Protocol; no prior entries are rewritten.

### Repository and branch

- **Repository:** `/home/z/my-project` (primary worktree, on `main`)
- **Implementation branch:** `feat/clinic-admin-shell-v1` (local-only as of this writing)
- **Isolated worktree:** `/home/z/clinic-admin-shell-v1` (on `feat/clinic-admin-shell-v1`)
- **Branch start point (parent):** `d9c10d7d65f7a113c830aa0e88ecbeee5b2c749b` (the `main` tip at the time the branch was created — verified baseline before the branch was cut)
- **Authority note:** The start point SHA above is the **last verified `main` baseline when the branch was created** (2026-07-25). It is NOT a live claim about the current `main` tip. Before merging this branch, run `git fetch origin && git rev-parse main origin/main` and trust Git, not this section.

### Completed shell work

The Clinic Admin application shell v1 is implemented at the canonical route `/clinic-admin` for the R09 Clinic Administrator role. The implementation ratifies and follows the canonical decisions recorded in `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17 (newly added in this task).

**Authentication and context protection.** The shell requires a valid authenticated session, an active tenant context, an active organisation context, and an active facility context. The active scope is read from the canonical session-context module (ADR-015) via the existing `getContext` client; the shell never accepts tenant, organisation, or facility scope from untrusted URL parameters. When the required context is missing, the shell redirects safely to `/dashboard` so the user can establish the missing context. The shell never exposes cross-tenant or cross-facility information.

**Application layout.** A fixed compact header, a fixed sidebar on the start edge (right in Arabic RTL, left in English LTR), and a vertically scrollable main-content region. Edge protection of 20–24px is applied on every content region. The header contains the breadcrumb, the active context chips, the language control, the notification bell, the sign-out action, and the user display name. The sidebar contains exactly eleven ratified navigation items in the binding order recorded in DESIGN_BIBLE.md §17.2.

**Notification bell.** Implemented in the header as a bell control with an empty/unavailable state. The bell does NOT hardcode an unread count, does NOT invent notification records, and does NOT create a temporary notification API. The panel is keyboard-operable; Escape and click-outside close it. The structure is reusable by the future Notification vertical slice.

**Responsive behaviour.** Desktop shows the full sidebar; tablet collapses it to a compact icon rail; mobile converts it to a drawer triggered by a button in the fixed header. The breakpoint is resolved via `useSyncExternalStore` (no cascading `setState` inside `useEffect`). Direction switching uses CSS logical properties throughout — no per-direction CSS.

**Page state.** The `/clinic-admin` page renders an honest Overview foundation. The page does NOT implement fake business dashboard cards, fake appointments, fake financial figures, fake doctors, fake inventory alerts, fake waiting-room data, fake attendance, or fake notifications. Where the approved business regions are not yet implemented, the page uses clearly structured neutral empty states without invented data.

**Dashboard transition.** The `/dashboard` route remains the workspace-context selector. When an R09 principal has selected a valid tenant, organisation, and facility, the dashboard surfaces a clear "Enter Clinic Admin" affordance that pushes the user to `/clinic-admin`. The affordance is R09-gated; principals without `R09_ADMINISTRATOR` in their active membership's roles do not see the affordance. The dashboard's existing context-selection functionality and tests are preserved unchanged.

### Files created

- `apps/web/src/app/clinic-admin/layout.tsx` — thin pass-through layout for the `/clinic-admin` route segment.
- `apps/web/src/app/clinic-admin/page.tsx` — Clinic Admin Overview page (renders the shell + honest foundation).
- `apps/web/src/app/clinic-admin/page.test.tsx` — 29 tests covering the 22 mandatory shell v1 test categories plus canonical-data and accessibility assertions.
- `apps/web/src/components/clinic-admin/clinic-admin-copy.ts` — bilingual copy + canonical eleven-item sidebar data (single source of truth).
- `apps/web/src/components/clinic-admin/clinic-admin-shell.tsx` — shell with auth/context protection, layout composition, responsive breakpoint.
- `apps/web/src/components/clinic-admin/clinic-admin-sidebar.tsx` — fixed eleven-item sidebar with active/planned states.
- `apps/web/src/components/clinic-admin/clinic-admin-header.tsx` — fixed header with breadcrumb, context chips, language control, notification bell, sign-out.
- `apps/web/src/components/clinic-admin/notification-bell.tsx` — notification bell control with empty state, Escape/click-outside close, keyboard-operable panel.

### Files modified

- `apps/web/src/app/dashboard/page.tsx` — added four `clinicAdminEntry*` copy fields (Arabic + English) and the R09-gated `ClinicAdminEntryCard` component rendered when the principal holds `R09_ADMINISTRATOR` and has full context.
- `apps/web/src/app/dashboard/page.test.tsx` — added 4 new tests for the R09 entry affordance (renders when R09 + full context; navigates on click; hidden when not R09; hidden when facility missing).
- `apps/web/src/app/globals.css` — appended the Clinic Admin shell v1 CSS section (shell layout, header, sidebar, notification bell, overview page, loading state, dashboard entry affordance). All existing styles preserved unchanged.
- `download/docs/05_UI_UX/DESIGN_BIBLE.md` — added §17 "Clinic Admin Application Shell — Canonical Decisions v1" (108 new lines) ratifying: route ownership, the eleven-item sidebar, notification bell placement, application layout, responsive behaviour, typography and design tokens, page state, and implementation status. The Table of Contents is updated; §17 "Related Documents" is renumbered to §18. No prior approved sections are rewritten.

### Files deleted

- None.

### Validation results

| Gate | Result | Notes |
|---|---|---|
| `pnpm run build:shared` | PASS | contracts + domain built |
| `pnpm --filter @ibn-hayan/observability... build` | PASS | observability built |
| `pnpm run typecheck` | PASS | All packages (api, web, contracts, domain, observability, testing, configuration) |
| `pnpm run lint` | PASS | All packages |
| `pnpm run test` (unit) | PASS | api 5 tests, web 171 tests = 176 total. 29 new Clinic Admin shell tests + 4 new dashboard entry affordance tests; 0 regressions. |
| `pnpm run build` | PASS | All packages built (api via SWC, web via Next.js static generation). `/clinic-admin` route compiled as static. |
| `git diff --check` | PASS | No whitespace errors |

PostgreSQL 17 suites were NOT run locally (no PostgreSQL 17 in this environment). The Clinic Admin shell v1 is a frontend-only change; no Prisma schema, migration, backend service, repository, or test was modified. The PostgreSQL 17 suite inventory is unchanged by this task.

### Important decisions

1. **R09 presentation labels.** The canonical Arabic label `مدير المنشأة` and English label `Clinic Administrator` are used throughout the Clinic Admin shell v1 (sidebar brand, header context, dashboard entry affordance eyebrow). The domain catalogue's `displayNameAr` (`مدير`) and `displayNameEn` (`Administrator`) are not altered; the Clinic Admin shell v1 uses the canonical presentation labels ratified in DESIGN_BIBLE.md §17.1. The role code `R09_ADMINISTRATOR` and its authorization semantics are unchanged.

2. **Eleven-item sidebar with planned state.** Only `overview` is routable in shell v1. The remaining ten modules are rendered as honest disabled "planned" items with `aria-disabled="true"` and a `plannedLabel` chip. No fake business routes are created to make the navigation look complete.

3. **Notification bell in header, not sidebar.** Per DESIGN_BIBLE.md §17.3, the notification control lives in the fixed application header. The bell shows an honest empty/unavailable state until the Notification vertical slice is implemented. The shell does NOT invent notification records, does NOT hardcode an unread count, and does NOT create a temporary notification API.

4. **Responsive breakpoint via `useSyncExternalStore`.** The breakpoint is resolved with `useSyncExternalStore` (window resize event) to avoid the cascading-`setState`-inside-`useEffect` antipattern flagged by the React hooks ESLint rule. The server snapshot returns `'desktop'` so SSR and the first client paint agree.

5. **R09-gated entry affordance on `/dashboard`.** The dashboard surfaces the "Enter Clinic Admin" affordance only when the active membership's roles include `R09_ADMINISTRATOR` AND the principal has selected a valid tenant, organisation, and facility. The affordance is a convenience, not a security boundary — the shell at `/clinic-admin` enforces its own authentication and context protection regardless of how the user arrived.

6. **No backend changes.** Per the task constraint, no database models, schemas, migrations, seed data, backend APIs, business services, repositories, appointment logic, patient logic, billing logic, inventory logic, notification APIs, or audit contracts were modified. The shell v1 is a frontend-only implementation.

7. **No font dependency changes.** The shell uses the existing project-owned font stack in `globals.css` (`--font-arabic` and `--font-sans` tokens). No new font dependencies were added to `package.json` or `pnpm-lock.yaml`. A future typography vertical slice may add IBM Plex Sans Arabic and Inter as self-hosted webfonts per ADR-003; that decision is deferred to the typography slice.

### Known limitations

1. **Business regions are not implemented.** The approved Clinic Admin Overview regions (Financial Snapshot, Today's Appointments, Operational Alerts, Inventory Alerts, Doctors on Duty, Waiting Room Operations, Staff Attendance Summary, Quick Actions) are not implemented. The `/clinic-admin` page renders an honest Overview foundation with neutral empty copy; no fake business data is shown.

2. **Notification backend is not implemented.** The notification bell shows an empty/unavailable state. No notification API, no unread-count source, and no notification records exist.

3. **Sidebar `overview` is the only routable item.** The other ten items are rendered as planned/disabled. Future vertical slices will progressively enable them.

4. **No automated RTL/LTR visual regression test.** The unit tests verify direction attributes (`dir="rtl"` / `dir="ltr"`) and bilingual label correctness, but no automated visual regression test was added for the rendered layout in each direction. Manual inspection of the rendered shell in both directions is required (per Phase 7 of the task specification).

5. **No mobile/tablet integration test.** The responsive breakpoint is resolved at runtime via `useSyncExternalStore`; the unit tests verify the structural rendering and the compact prop. A full mobile/tablet integration test (e.g., via Playwright) is deferred to a future test-infrastructure slice.

6. **Branch is local-only.** The branch `feat/clinic-admin-shell-v1` has NOT been pushed to `origin` because no authenticated temporary deploy key is currently available (per AGENTS.md invariant 5). A fresh v17 (or later) deploy key will be required for the controlled push task.

### Immediate next vertical slice

**Notification backend integration.** Implement the notification module's backend (NestJS module, Prisma model for notifications, tenant-scoped + facility-scoped + permission-aware query endpoints, audit events) and wire the existing `NotificationBell` component to fetch real unread counts and notification records. This slice is the smallest end-to-end vertical that populates a currently-empty shell region with real data and validates the shell's data-fetching pattern for subsequent slices.

The slice must:
- Add a new `Notification` Prisma model with `tenantId`, `organisationId`, `facilityId`, `recipientUserId`, `unreadAt`, `createdAt`, `payload` fields.
- Add a new `notifications` NestJS module with a `GET /api/v1/notifications` endpoint (returns the principal's unread notifications for the active facility, scoped per ADR-015) and a `POST /api/v1/notifications/:id/read` endpoint.
- Add a `notifications.client.ts` web client analogous to the existing `context.client.ts`.
- Update `NotificationBell` to call the new client and render real notifications (replacing the empty state when notifications exist).
- Add PostgreSQL 17 tests for the new module (per the existing pattern in `apps/api/test/`).
- Add web tests for the connected bell.

Subsequent vertical slices (in dependency order): Overview KPIs (financial snapshot + today's appointments); Doctors on Duty; Waiting Room; Staff Attendance Summary; Inventory Alerts; Services & Procedures; Billing & Payments; Reports & Analytics; Settings. Each slice follows the same pattern: backend module → API contract → web client → shell region connection → tests → documentation.

### Recovery information

- **Implementation branch:** `feat/clinic-admin-shell-v1` (local-only)
- **Implementation worktree:** `/home/z/clinic-admin-shell-v1`
- **Branch parent:** `d9c10d7d65f7a113c830aa0e88ecbeee5b2c749b` (the `main` baseline when the branch was cut)
- **To inspect the shell without checking out the branch:** `git worktree add /tmp/clinic-admin-review feat/clinic-admin-shell-v1` (the local branch is reachable from the primary worktree)
- **To discard the branch and start over:** `git worktree remove /home/z/clinic-admin-shell-v1` then `git branch -D feat/clinic-admin-shell-v1` (only with explicit operator authorisation; the work is local-only and has not been pushed, so this would lose the implementation)
- **To re-run validation in the worktree:** `cd /home/z/clinic-admin-shell-v1 && pnpm install --frozen-lockfile && pnpm run build:shared && pnpm --filter @ibn-hayan/observability... build && pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`


## Clinic Admin Shell v1 — Acceptance Correction (2026-07-25)

This section is appended per the Update Protocol; no prior entries are rewritten. It records the narrowly scoped acceptance correction applied on top of the Clinic Admin Shell v1 implementation recorded above. It supersedes two specific factual statements in the prior section; the prior section's text is preserved unchanged for history.

### Superseded statements

1. **R09 domain catalogue label.** The prior section's "Important decisions" item 1 stated: *"The domain catalogue's `displayNameAr` (`مدير`) and `displayNameEn` (`Administrator`) are not altered; the Clinic Admin shell v1 uses the canonical presentation labels ratified in DESIGN_BIBLE.md §17.1."* This statement is **superseded**. The acceptance correction updates the domain catalogue's `displayNameAr` for `R09_ADMINISTRATOR` from the bare word `مدير` to the canonical Arabic presentation label `مدير المنشأة`, aligning the catalogue with DESIGN_BIBLE.md §17.1 and with the bilingual presentation mappings already used by the Clinic Admin shell. The role code `R09_ADMINISTRATOR`, the `displayNameEn` (`Administrator`), the category (`operational`), the authorization semantics, the permission assignments, the tenant/organisation/facility scope, and the role ordering are all preserved. No second alias or competing label is introduced. The bare Arabic word `مدير` is preserved in unrelated uses (e.g., `مدير الموارد البشرية` for R11 HR Manager, `مدير النظام` for R13 System Administrator); only the R09 catalogue entry was changed.

2. **Immediate next vertical slice.** The prior section's "Immediate next vertical slice" subsection named **Notification backend integration** as the immediate next slice. This is **superseded**. The user-approved immediate next vertical slice is **Today's Appointments**, implemented end-to-end using real tenant-scoped and facility-scoped data through database, business logic, API, permissions, frontend table, tests, RTL/LTR states, and manual validation. The Notification backend remains a **later** vertical slice; the notification bell in the fixed header continues to show an honest empty/unavailable state with no fake records and no fake unread count. Today's Appointments is NOT implemented during this correction task; it is recorded here only as the corrected immediate next slice.

### Correction scope

The correction is narrowly scoped. It does NOT rebuild the shell, does NOT create a competing implementation, does NOT introduce a duplicate route/sidebar/header/notification component, does NOT modify database schemas or migrations, does NOT implement any business module (Patient, Appointment, Billing, Inventory, Staff, Waiting Room, or Notification), does NOT introduce fake business data, does NOT introduce fake notifications, does NOT push anything, does NOT generate a deploy key, does NOT deploy, does NOT modify production data, does NOT force-push, rebase, reset, restore, clean, amend the existing Clinic Admin Shell commit, or delete any branch/tag/worktree/file group.

### Repository and branch

- **Repository:** `/home/z/my-project` (primary worktree, on `main`)
- **Implementation branch:** `feat/clinic-admin-shell-v1` (still local-only and unpushed after the correction)
- **Isolated worktree:** `/home/z/clinic-admin-shell-v1` (on `feat/clinic-admin-shell-v1`)
- **Pre-correction implementation SHA:** `7a636a92896f9f3ca1dec48306e7627479704237` (the original Clinic Admin Shell v1 commit; parented at `d9c10d7d65f7a113c830aa0e88ecbeee5b2c749b`)
- **Correction commit parent:** `7a636a92896f9f3ca1dec48306e7627479704237` (the correction is a new commit on top of the original; the original is NOT amended)
- **Authority note:** The pre-correction SHA above is the **last verified implementation-branch tip when the correction was authored** (2026-07-25). It is NOT a live claim about the current branch tip. Before merging, run `git rev-parse feat/clinic-admin-shell-v1` and trust Git, not this section. The correction commit SHA is recorded in `worklog.md`.

### Files created

- `apps/web/src/app/fonts.ts` — deterministic, licence-compliant font-loading module using Next.js's built-in `next/font/google`. Exposes Inter via `--font-inter` and IBM Plex Sans Arabic via `--font-ibm-plex-sans-arabic`. The fonts are fetched at build time and bundled into the application's own origin; there is no runtime request to `fonts.googleapis.com` or `fonts.gstatic.com` (per ADR-003). No new runtime dependency added; the lockfile was not modified.

### Files modified

- `packages/domain/src/authorization/role-catalogue.ts` — corrected the `displayNameAr` for `R09_ADMINISTRATOR` from `مدير` to `مدير المنشأة` (one-line change; all other R09 catalogue fields and every other role entry preserved).
- `packages/domain/src/authorization/authorization.spec.ts` — added three new tests: (a) "the catalogue includes R09 Administrator with the canonical Clinic Admin Arabic label" asserting `displayNameAr === 'مدير المنشأة'`; (b) "getRoleDisplayName returns the canonical Arabic label for R09 by default" asserting `getRoleDisplayName('R09_ADMINISTRATOR') === 'مدير المنشأة'`; (c) "getRoleDisplayName returns the English label for R09 when requested" asserting `getRoleDisplayName('R09_ADMINISTRATOR', 'en') === 'Administrator'`. The existing R13 and R14 catalogue tests are preserved unchanged.
- `apps/web/src/app/layout.tsx` — applied the `inter.variable` and `ibmPlexSansArabic.variable` CSS-variable class names to the root `<html>` element so every route (landing, login, dashboard, clinic-admin) receives the approved typography. The root layout's existing structure, the `LanguageProvider` wrapper, the `lang="ar"` and `dir="rtl"` defaults, and the existing body className are preserved.
- `apps/web/src/app/globals.css` — updated the `--font-sans` and `--font-arabic` design tokens to consume the new `--font-inter` and `--font-ibm-plex-sans-arabic` CSS variables as their first font family, with the existing fallback stacks preserved. Removed an incorrect RTL-specific override on the mobile sidebar drawer (`[dir='rtl'] .ih-clinic-admin-sidebar { inset-inline-start: auto; inset-inline-end: 0; }`) that pushed the drawer to the wrong edge in RTL; the single `inset-inline-start: 0` declaration now anchors the drawer correctly in both directions via CSS logical-property mirroring. All other Clinic Admin shell CSS rules are preserved unchanged.
- `download/docs/05_UI_UX/DESIGN_BIBLE.md` — §17.6 updated to record that IBM Plex Sans Arabic and Inter are now actually loaded via `next/font/google` (previously the section said the implementation "inspects the repository before adding font dependencies"). §17.8 appended with an "Acceptance correction (2026-07-25)" note recording the R09 role-label correction and the typography implementation, explicitly noting that no canonical decision in §17.1 through §17.7 was altered. The next-vertical-slice ordering is left as the authoritative source in `PROJECT_CONTINUITY.md` and `worklog.md`.

### Files deleted

- None.

### Validation results

| Gate | Result | Notes |
|---|---|---|
| `pnpm run build:shared` | PASS | contracts + domain built |
| `pnpm --filter @ibn-hayan/observability... build` | PASS | observability built |
| `pnpm run typecheck` | PASS | All packages (api, web, contracts, domain, observability, testing, configuration) |
| `pnpm run lint` | PASS | All packages |
| `pnpm run test` (unit) | PASS | contracts 123 + domain 97 + observability 83 + api 5 + web 171 = 479 total. 3 new R09 catalogue tests pass (59 authorization tests, was 56). 0 regressions. |
| `pnpm run build` | PASS | All packages built (api via SWC, web via Next.js static generation). `/clinic-admin` route compiled as static. Next.js fetched and bundled 23 woff2 font files (~496 KB) into `apps/web/.next/static/media/`. |
| `git diff --check` | PASS | No whitespace errors |

**Font-network verification (build-time).** Inspection of the build output confirms:

- 23 woff2 files bundled into `apps/web/.next/static/media/` (~496 KB total).
- All four prerendered HTML files (`index.html`, `login.html`, `dashboard.html`, `clinic-admin.html`) contain `<html lang="ar" dir="rtl" class="...inter_...__variable ibm_plex_sans_arabic_...__variable">` — the font CSS variables are applied to the root `<html>` element.
- All four prerendered HTML files contain five `<link rel="preload" ... type="font/woff2">` tags pointing to `/_next/static/media/*.woff2` (same origin).
- No `fonts.googleapis.com` or `fonts.gstatic.com` references in the actual served CSS (`apps/web/.next/static/chunks/*.css`). The only `fonts.gstatic.com` references in the build output are inside source-map files (`*.css.map`), which are debugging artifacts and do not trigger runtime fetches.

**Browser-validation result.** Build-time HTML inspection verified the font preloads, the `dir="rtl"` attribute on `<html>`, the font CSS-variable class names on `<html>`, and the absence of runtime Google Fonts CDN references. Runtime browser validation was **not executed** for the authenticated shell view because (a) the headless Chrome instance available in this environment runs in a separate Kubernetes network namespace and could not reach the Next.js dev/start server on `localhost:3000`, and (b) no backend (API + PostgreSQL 17) and no valid development authentication credentials were available in this environment to establish a real R09 session. Operator visual review remains required for: Arabic RTL desktop, English LTR desktop, tablet width, mobile width, sidebar drawer, notification bell open/close, Escape close, click-outside close, focus states, keyboard navigation, safe viewport-edge spacing, horizontal overflow, content offset under header/sidebar, browser-console errors, failed network requests, and authentication/context request behaviour. The exact operator review steps are recorded in `worklog.md`.

### Important decisions

1. **R09 Arabic-label correction in the catalogue itself.** Rather than overriding the bare `مدير` only at the shell presentation layer (the prior approach), the correction updates the domain catalogue's `displayNameAr` directly so the API contract returns `مدير المنشأة` to every consumer. This closes the prior inconsistency between the catalogue and the frontend tests (which already expected `مدير المنشأة`). The English `displayNameEn` remains `Administrator` because the §17.1 canonical English presentation label `Clinic Administrator` is a shell-presentation concern; the catalogue's English value remains the cross-surface role label, and the Clinic Admin shell overrides it at the presentation layer (as before).

2. **Font loading via `next/font/google`.** The approved Arabic (IBM Plex Sans Arabic) and English (Inter) typefaces are loaded with Next.js's built-in `next/font/google` module — the canonical Next.js font mechanism. No new runtime dependency was added (`next/font` is part of Next.js itself); the lockfile was not modified. The fonts are fetched at build time and bundled into the application's own origin, satisfying ADR-003's offline-first and supply-chain safety constraints (no runtime Google Fonts CDN request). IBM Plex Sans Arabic is loaded with weights 400, 500, 600, 700 (it is not exposed as a variable axis on Google Fonts); Inter is loaded as a variable font. Both use `display: swap` to avoid invisible-text flash and preserve accessibility contrast via the existing fallback stacks.

3. **Root-layout font application.** The font CSS variables are applied to the root `<html>` element rather than a per-route layout, so every route (landing, login, dashboard, clinic-admin) automatically receives the approved typography without a per-route change. The existing project-owned token names `--font-sans` and `--font-arabic` are preserved; only their values changed (to consume the new `--font-inter` and `--font-ibm-plex-sans-arabic` variables as the first font family, with the existing fallback stacks preserved). Every component that already used `var(--font-sans)` or `var(--font-arabic)` automatically receives the approved fonts.

4. **RTL mobile-drawer bug fix.** The prior CSS had an explicit `[dir='rtl'] .ih-clinic-admin-sidebar { inset-inline-start: auto; inset-inline-end: 0; }` override that pushed the mobile drawer to the wrong edge in RTL (it resolved to `left: 0` in RTL, placing the drawer on the left instead of the design-intent right). The override was removed; the single `inset-inline-start: 0` declaration now anchors the drawer correctly in both directions via CSS logical-property mirroring (left in LTR per §13.2, right in RTL per §12.2). A documentation comment was added explaining why no `[dir='rtl']` override is needed.

5. **No backend, schema, or business-data changes.** Per the correction task constraints, no database models, schemas, migrations, seed data, backend APIs, business services, repositories, appointment logic, patient logic, billing logic, inventory logic, notification APIs, or audit contracts were modified. The correction is a frontend + domain-catalogue + documentation change only.

6. **No dependency or lockfile changes.** `next/font/google` is part of Next.js itself; no new font-management package, no `@fontsource/*`, no `fontsource`, and no custom loader was added. `package.json` and `pnpm-lock.yaml` are unchanged.

### Known limitations

1. **Operator visual review remains required.** Build-time HTML inspection verified the font preloads and the root-element attributes, but runtime browser validation (Arabic RTL desktop, English LTR desktop, tablet, mobile, sidebar drawer, notification bell open/close, Escape close, click-outside close, focus states, keyboard nav, console errors, network requests) was not executed in this environment. See `worklog.md` for the exact operator review steps.
2. **The §17.8 next-vertical-slice statement in DESIGN_BIBLE.md was not rewritten.** Per Phase 9 of the correction task, DESIGN_BIBLE.md updates were restricted to font or role-label implementation status. The §17.8 sentence "The first vertical slice after the shell is the notification control's real backend integration" remains as a historical statement of the prior plan; the corrected next-vertical-slice ordering lives in this section (above) and in `worklog.md`. The §17.8 acceptance-correction note explicitly cross-references the authoritative source.
3. **Branch is still local-only.** The branch `feat/clinic-admin-shell-v1` (now with the correction commit on top of the original) has NOT been pushed to `origin`. A fresh deploy-key push task remains required to back up the branch to GitHub.
4. **No PostgreSQL 17 suites were run.** The correction is a frontend + domain-catalogue change; no Prisma schema, migration, backend service, repository, or API test was modified. The PostgreSQL 17 suite inventory is unchanged.

### Recovery information (updated)

- **Implementation branch:** `feat/clinic-admin-shell-v1` (local-only, unpushed)
- **Implementation worktree:** `/home/z/clinic-admin-shell-v1`
- **Pre-correction commit:** `7a636a92896f9f3ca1dec48306e7627479704237` (subject: `feat: establish clinic admin shell and navigation v1`; parent: `d9c10d7d65f7a113c830aa0e88ecbeee5b2c749b`)
- **Correction commit parent:** `7a636a92896f9f3ca1dec48306e7627479704237` (the correction is a new commit on top; the original is NOT amended)
- **Correction commit subject:** `fix: align clinic admin shell v1 with canonical decisions`
- **Correction commit SHA:** recorded in `worklog.md` (the durable Git-authority rule forbids describing a SHA as permanently current)
- **To inspect the corrected shell without checking out the branch:** `git worktree add /tmp/clinic-admin-review feat/clinic-admin-shell-v1` (the local branch is reachable from the primary worktree)
- **To re-run validation in the worktree:** `cd /home/z/clinic-admin-shell-v1 && pnpm install --frozen-lockfile && pnpm run build:shared && pnpm --filter @ibn-hayan/observability... build && pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`

---

## Demo Role Preview Mode v1 (2026-07-25)

### Repository and branch

- **Repository:** `https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os.git`
- **Implementation branch:** `feat/demo-role-preview-v1` (local-only, unpushed as of this section's authoring)
- **Implementation worktree:** `/home/z/demo-role-preview-v1`
- **Branch parent:** `72cce12af075e3f19962c3e247b4fd0e3aa67e3f` (the merged PR #4 commit on `main`)
- **Implementation commit subject:** `feat: add secure demo role preview mode v1`
- **Implementation commit SHA:** recorded in `worklog.md` (per the durable Git-authority rule, this section does NOT describe the SHA as permanently current — run `git rev-parse feat/demo-role-preview-v1` for the live tip)

### Architecture

Demo Role Preview Mode is a **development-only** feature that allows the operator to preview the system as every canonical role R01 through R14 without manually entering credentials. The feature uses real existing authentication, sessions, memberships, role assignments, tenant/organisation/facility context, and authorization semantics; it is **not** a visual-only role-name switch. It remains **completely unavailable in production**.

The implementation introduces a new backend module (`apps/api/src/modules/dev/role-preview/`) and a new frontend route (`/role-preview`). The Clinic Admin header optionally renders a role switcher when preview mode is enabled and the current session belongs to the isolated preview workspace.

### Environment gate

One authoritative backend-controlled environment variable:

- `IBN_HAYAN_ROLE_PREVIEW_ENABLED` (default `false`)
- The gate is `RolePreviewFeatureConfig.isRolePreviewEnabled()` in `apps/api/src/modules/dev/role-preview/role-preview-feature.config.ts`.
- Rules:
  - default is **disabled**;
  - enabled **only** when the value is the exact string `true`;
  - enabled **only** when `NODE_ENV !== 'production'`;
  - the **backend is authoritative** — a public frontend environment variable is never sufficient to enable the feature;
  - when disabled, preview APIs return 404, `/role-preview` renders the safe unavailable result, the role-switcher control is absent, the preview seed refuses to run, and normal login, dashboard, session, and Clinic Admin behaviour remain unchanged;
  - when `NODE_ENV === 'production'`, preview mode fails closed **even if the flag is accidentally `true`**.

`.env.example` documents only the boolean feature flag with a safe default of `false`.

### Production-disable guarantee

Production fails closed **unconditionally**. The gate reads `process.env.NODE_ENV` directly (not via `ConfigService`) so that no caching layer can mask the production state. Every role-preview route consults the gate before delegating to the service. The 404 status for the availability and current-role endpoints does NOT advertise the route's existence in production; the select and end endpoints throw `rolePreviewDisabled()` (also 404) when the gate returns `false`. Ten unit tests in `role-preview-feature.config.spec.ts` verify the gate's behaviour across all flag/NODE_ENV combinations.

### Isolated preview identity strategy

A single development-only preview workspace contains:

- one preview tenant (`slug=preview-role-tenant`, `displayName=Preview Role Tenant`);
- one preview organisation (`code=PREVIEW_ORG`, `displayName=Preview Organisation`) under the preview tenant;
- one preview facility (`code=PREVIEW_FACILITY`, `displayName=Preview Facility`) under the preview organisation;
- one preview user identity for **every** canonical role R01 through R14;
- one active `TenantMembership` for every preview identity under the preview tenant;
- one `TenantRoleAssignment` for every preview identity at the canonical scope level for its role.

The preview identity catalogue is defined in `apps/api/src/modules/dev/role-preview/preview-identity-catalogue.ts`. It is **derived from** `PLATFORM_ROLE_CATALOGUE` (the canonical role catalogue); no role is invented, removed, renamed, or relabelled. Sixteen unit tests in `preview-identity-catalogue.spec.ts` verify the catalogue's completeness, uniqueness, and scope assignment.

### Canonical role coverage

The implementation supports exactly the fourteen canonical roles found in the repository's role catalogue (`packages/domain/src/authorization/role-catalogue.ts`): R01 Physician, R02 Nurse, R03 Pharmacist, R04 Technician, R05 Allied Health Professional, R06 Receptionist, R07 Scheduler, R08 Biller, R09 Administrator, R10 Compliance Officer, R11 HR Manager, R12 Executive, R13 System Administrator, R14 Integration Account.

### Role scope-assignment result

Derived from ADR-015 §1.5 and the role-permission matrix:

- **R01 through R12** (human tenant roles): role assignment at **facility scope** under the preview tenant → preview organisation → preview facility. This is the narrowest canonical scope and grants the preview identity the ability to select the preview tenant → preview organisation → preview facility context.
- **R13 System Administrator**: role assignment at **tenant scope** (no scope-target). Per ADR-015 §1.5, R13 at tenant scope grants tenant-wide organisation and facility selection.
- **R14 Integration Account**: role assignment at **tenant scope** (no scope-target). Per ADR-015 and the role-permission matrix, R14 is denied all interactive context permissions; the preview identity is created so the operator can confirm the role's honest "Interface not implemented yet" status.

### Seed idempotency result

The seed script (`apps/api/src/scripts/role-preview-seed-dev.ts`, registered as `pnpm --filter @ibn-hayan/api role-preview:seed`) is idempotent: existing rows are reused, missing rows are created, and existing credentials are updated to keep the password hash deterministic across seed runs. The seed refuses production, refuses an unverified database target (the `DATABASE_URL` must contain the substring `role_preview` or `preview_role`), refuses without the explicit `ALLOW_ROLE_PREVIEW_SEED=true` flag, refuses without `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true`, applies migrations before any seed work, and creates **no** patient/appointment/invoice/payment/inventory/attendance/waiting-room/notification records.

### Preview database-safety result

The seed's defence-in-depth database-safety check refuses to run against any database whose URL does not contain the substring `role_preview` or `preview_role`. This prevents accidental seeding of a production database whose URL happens to be set in the environment. The preview database is expected to be a separate PostgreSQL 17 database (mirroring the audit database's isolation strategy); in development it may run on the same PostgreSQL cluster as the transactional store.

### Backend module result

The NestJS module `RolePreviewModule` (`apps/api/src/modules/dev/role-preview/role-preview.module.ts`) is registered in the root `AppModule` regardless of `NODE_ENV`. The feature-config gate is the authoritative entry point. The module imports `AuthModule`, `DatabaseModule`, and `AuditModule`; it reuses `AuthService`, `SessionTokenService`, `CsrfService`, and `AuditHelperService` via Nest DI. It does NOT duplicate authentication, CSRF, Origin, or audit logic.

### Preview API routes

Four routes under `/api/v1/dev/role-preview`:

- `GET /api/v1/dev/role-preview` — query availability and list canonical preview role cards. Returns 404 when the feature is disabled.
- `GET /api/v1/dev/role-preview/current` — return the current preview role metadata. Returns 404 when disabled, 401 when no session.
- `POST /api/v1/dev/role-preview/select` — select a canonical role code, create a fresh preview session for the corresponding preview identity, establish the preview tenant/organisation/facility context, revoke the previous session atomically, and set the new HttpOnly cookie. Requires Origin + CSRF.
- `POST /api/v1/dev/role-preview/end` — end the current preview session. Requires Origin + CSRF.

### Authentication-path result

The preview backend reuses the existing `AuthService.getSessionFromCookie` for session validation. The select endpoint revokes the previous session atomically (in the same Prisma transaction as the new session creation and the audit outbox insertion). The new session is created using the existing `SessionTokenService.generate()` and `SessionTokenService.hash()` helpers, exactly mirroring the auth service's `login` flow. The raw token lives only in the HttpOnly cookie; it is NEVER returned in a JSON response.

### Session-creation result

A new `auth_sessions` row is created for the preview identity's user with the new token hash, the absolute TTL, and the active tenant/organisation/facility context set directly on the row (using the same `activeTenantMembershipId`, `activeOrganisationId`, `activeFacilityId` columns used by the session-context module). The composite foreign keys enforce that the membership belongs to the user, the organisation belongs to the tenant, and the facility belongs to the organisation.

### Role-switch result

Switching role calls the secure backend `select` endpoint with only the canonical role code. The server:
1. verifies the feature flag (defence-in-depth);
2. resolves the preview identity from the role code via `findPreviewIdentity`;
3. resolves the preview workspace (tenant, organisation, facility) by slug/code lookup;
4. verifies the preview identity's user exists and has an active membership in the preview tenant;
5. atomically creates the new session, sets the context, revokes the previous session, and emits the `role_preview.session.created` audit event in the same Prisma transaction;
6. invalidates the previous session's CSRF token (best-effort, in-memory);
7. returns the safe response (selected role, preview workspace display names, interface path) and the raw token (for the controller to set in the HttpOnly cookie).

The previous session is **always** revoked — whether it was a preview session or a normal operator session. This is the structural enforcement of "safely revoke or replace the previous preview session during role switching".

### Tenant-context / Organisation-context / Facility-context results

The new session's `activeTenantMembershipId`, `activeOrganisationId`, and `activeFacilityId` are set directly on the row in the same Prisma transaction that creates the session. The values are derived server-side from the preview workspace's deterministic identifiers; the caller cannot supply them. The composite foreign keys enforce tenant/organisation/facility consistency at the database level.

### R09 routing result

When R09 is selected, the response carries `interfacePath: '/clinic-admin'`. The frontend's `/role-preview` page calls `router.push('/clinic-admin')`, which mounts the existing Clinic Admin shell. The shell's session and context checks pass because the new session has a valid active tenant/organisation/facility context. The operator sees the canonical Clinic Admin Overview page rendered exactly as a normal R09 operator would see it.

### Unimplemented-role behaviour

When a role other than R09 is selected, the response carries `interfacePath: null`. The frontend's `/role-preview` page shows a safe role-status view that displays the current role, the preview tenant/organisation/facility display names, and an honest statement that the role-specific product interface is not implemented. The page does NOT invent operational widgets or fake business data. The operator can use the role switcher (rendered in the page header) to switch to a different role.

### `/role-preview` route result

The `/role-preview` route is a development-only Next.js App Router page at `apps/web/src/app/role-preview/page.tsx`. The page:
- queries the backend availability endpoint on mount;
- renders a safe unavailable result when the backend returns 404 or `enabled: false`;
- displays one role card for every canonical role R01 through R14 when enabled;
- shows the role code, Arabic and English names, canonical scope, current interface implementation status, and a preview action;
- supports Arabic RTL and English LTR via the existing `LanguageProvider`;
- uses the existing design tokens, typography, and API-client conventions;
- never displays internal UUIDs, the session token, or any credential material.

### Header role-switcher result

The role switcher (`apps/web/src/components/role-preview/role-preview-switcher.tsx`) is rendered in the Clinic Admin header only when the parent (`ClinicAdminShell`) has confirmed that (a) the backend availability endpoint returned `enabled: true` AND (b) the current-preview-role endpoint returned `active: true`. The switcher:
- lists all canonical roles;
- shows the current role;
- calls the secure backend `select` endpoint on role switch;
- navigates to `/clinic-admin` when an implemented role (R09) is selected;
- navigates to `/role-preview` when an unimplemented role is selected;
- supports Arabic and English labels;
- is keyboard accessible (Escape closes the dropdown and restores focus to the trigger);
- has visible focus states;
- works on desktop, tablet, and mobile;
- does NOT hardcode credentials, does NOT mutate client-side permission state, does NOT store the role code as authorization state in localStorage, and does NOT fake the unread notification count.

The existing notification bell, the eleven-item Clinic Admin sidebar, the language switch, the active organisation/facility context chips, the profile menu, and the sign-out control all remain intact.

### Production-hidden result

Ten unit tests in `role-preview-feature.config.spec.ts` verify that the gate returns `false` in production regardless of the flag value, returns `false` for any non-`true` flag value, and returns `true` only when `NODE_ENV !== 'production'` AND the flag is the exact string `true`. The frontend availability check renders the safe unavailable result when the backend returns 404; the role switcher is rendered only when the parent has confirmed both `enabled: true` and `active: true`.

### Normal-login / Dashboard / Clinic Admin regression results

The implementation does NOT modify the existing `/login`, `/dashboard`, `/clinic-admin`, auth, session-context, or authorization code. The Clinic Admin header gains two optional props (`previewRoles` and `currentPreviewRoleCode`) that default to `null`/`undefined`; when absent, the header renders exactly as before. All existing authentication, session, context, and Clinic Admin tests remain green (180 web tests pass, including 29 existing Clinic Admin tests; 31 API tests pass; 154 contracts tests pass; 97 domain tests pass; 83 observability tests pass).

### Files created

**Backend (apps/api):**
- `src/modules/dev/index.ts`
- `src/modules/dev/role-preview/index.ts`
- `src/modules/dev/role-preview/preview-identity-catalogue.ts`
- `src/modules/dev/role-preview/preview-identity-catalogue.spec.ts`
- `src/modules/dev/role-preview/role-preview-feature.config.ts`
- `src/modules/dev/role-preview/role-preview-feature.config.spec.ts`
- `src/modules/dev/role-preview/role-preview.errors.ts`
- `src/modules/dev/role-preview/role-preview.service.ts`
- `src/modules/dev/role-preview/role-preview.controller.ts`
- `src/modules/dev/role-preview/role-preview.module.ts`
- `src/scripts/role-preview-seed-dev.ts`

**Contracts (packages/contracts):**
- `src/role-preview/index.ts`
- `src/role-preview/role-preview.schema.ts`
- `src/role-preview/role-preview.schema.spec.ts`

**Frontend (apps/web):**
- `src/app/role-preview/layout.tsx`
- `src/app/role-preview/page.tsx`
- `src/components/role-preview/role-preview-copy.ts`
- `src/components/role-preview/role-preview-switcher.tsx`
- `src/components/role-preview/role-preview-switcher.spec.tsx`
- `src/lib/api/role-preview/index.ts`
- `src/lib/api/role-preview/role-preview.client.ts`

### Files modified

- `.env.example` (added `IBN_HAYAN_ROLE_PREVIEW_ENABLED=false` documentation)
- `apps/api/package.json` (added `role-preview:seed` and `prerole-preview:seed` scripts)
- `apps/api/src/app.module.ts` (registered `RolePreviewModule`)
- `apps/web/src/components/clinic-admin/clinic-admin-header.tsx` (added optional `previewRoles` and `currentPreviewRoleCode` props; renders `RolePreviewSwitcher` only when both are present)
- `apps/web/src/components/clinic-admin/clinic-admin-shell.tsx` (added preview availability + current preview role loading; passes preview props to header)
- `apps/web/src/lib/api/index.ts` (re-exported role-preview client)
- `packages/contracts/src/index.ts` (re-exported role-preview contracts)
- `packages/observability/src/audit/action-codes.ts` (added `role_preview.session.created` and `role_preview.session.ended` action codes; updated `inferCategoryFromAction`)

### Files deleted

None.

### Schema or migration files changed

**None.** The implementation uses the existing `User`, `LocalCredential`, `Tenant`, `Organisation`, `Facility`, `TenantMembership`, `TenantRoleAssignment`, `AuthSession`, and `AuditOutboxEvent` models. No `prisma/schema.prisma` change, no `prisma/migrations/**` change, no `prisma-audit/schema.prisma` change.

### Dependency or lockfile changes

**None.** No `package.json` dependency was added or removed; `pnpm-lock.yaml` is unchanged. The `apps/api/package.json` modification adds only the `role-preview:seed` and `prerole-preview:seed` scripts.

### Fake business data introduced

**None.** The preview seed creates only identity, tenancy, membership, and role-assignment records. No patients, appointments, invoices, payments, inventory, attendance, waiting-room, or notification records are created.

### Secrets exposed

**None.** The implementation NEVER logs, prints, or returns:
- the preview password (referenced only as a constant for hashing);
- the password hash;
- the raw session token;
- the CSRF token;
- the preview identities' email addresses (used only for database lookup);
- internal UUIDs (the API response carries only display labels).

### Validation results

| Gate | Result | Notes |
|---|---|---|
| `pnpm run build:shared` | PASS | contracts + domain built |
| `pnpm --filter @ibn-hayan/observability build` | PASS | observability built (includes the new role-preview action codes) |
| `pnpm run typecheck` | PASS | 7 packages + 2 apps typecheck clean |
| `pnpm run lint` | PASS | 7 packages + 2 apps lint clean |
| `pnpm run test` | PASS | 545 tests pass (97 domain + 154 contracts + 83 observability + 31 api + 180 web) |
| `pnpm run build` | PASS | All packages built; Next.js production build succeeded; `/role-preview` registered as a static route alongside `/`, `/_not-found`, `/clinic-admin`, `/dashboard`, `/login` |
| `git diff --check` | PASS | No whitespace errors |

### Database-backed validation status

**BLOCKED.** This environment has no PostgreSQL 17 available. The database-backed validation (creating the isolated `role_preview` database, applying migrations, running the preview seed, verifying every canonical role identity, testing session switching, verifying R09 context reaches `/clinic-admin`, verifying other roles reach the honest role-status view) was NOT executed in this environment. Per the specification, the task does NOT substitute production infrastructure and does NOT claim integration validation passed. The unit tests (gate, catalogue, contracts, switcher) provide structural verification; the PostgreSQL 17 integration validation will run on GitHub Actions CI when the branch is pushed through a separate controlled branch-and-PR workflow.

### Known limitations

1. **Branch is local-only.** `feat/demo-role-preview-v1` has NOT been pushed to `origin`. A separate controlled branch-and-PR workflow remains required.
2. **Database-backed runtime validation is blocked.** See "Database-backed validation status" above.
3. **Operator visual review remains required.** Build-time HTML inspection verified the route is registered, but runtime browser validation (Arabic RTL desktop, English LTR desktop, tablet, mobile, role-card grid, role switcher open/close, role switch with R09 navigation, role switch with unimplemented role, keyboard nav, focus states, console errors, network requests) was not executed in this environment.
4. **The preview seed has not been run.** Running the seed requires a PostgreSQL 17 database whose URL contains `role_preview` or `preview_role`. The seed script is registered as `pnpm --filter @ibn-hayan/api role-preview:seed` and is ready to run in a development environment with the required `ALLOW_ROLE_PREVIEW_SEED=true`, `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true`, and the isolated preview database URL.

### Immediate next product slice

**Today's Appointments.** This Demo Role Preview Mode implementation does NOT alter the canonical next-vertical-slice ordering. Today's Appointments remains the immediate next product slice, to be implemented end-to-end using real tenant-scoped and facility-scoped data through database, business logic, API, permissions, frontend table, tests, RTL/LTR states, and manual validation. The notification backend remains a **later** vertical slice; the notification bell in the fixed header continues to show an honest empty/unavailable state.

### Recovery information

- **Implementation branch:** `feat/demo-role-preview-v1` (local-only, unpushed)
- **Implementation worktree:** `/home/z/demo-role-preview-v1`
- **Branch parent:** `72cce12af075e3f19962c3e247b4fd0e3aa67e3f` (the merged PR #4 commit on `main`)
- **Implementation commit subject:** `feat: add secure demo role preview mode v1`
- **Implementation commit SHA:** recorded in `worklog.md` (per the durable Git-authority rule)
- **To inspect the implementation without checking out the branch:** `git worktree add /tmp/demo-role-preview-review feat/demo-role-preview-v1` (the local branch is reachable from the primary worktree)
- **To re-run validation in the worktree:** `cd /home/z/demo-role-preview-v1 && pnpm install --frozen-lockfile && pnpm run build:shared && pnpm --filter @ibn-hayan/observability build && pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- **To run the preview seed (requires PostgreSQL 17 + isolated preview database):** `cd /home/z/demo-role-preview-v1/apps/api && ALLOW_ROLE_PREVIEW_SEED=true IBN_HAYAN_ROLE_PREVIEW_ENABLED=true DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/role_preview_db NODE_ENV=development pnpm role-preview:seed`


---

## Secure Demo Role Preview Mode v1 — Runtime Correction

**Date:** 2026-07-25
**Branch:** `feat/demo-role-preview-v1` (local-only, unpushed)
**Parent commit:** `dfd22f97a141ab6d7f19c84a6c5aa8c6eed67015` (`feat: add secure demo role preview mode v1`)
**Correction commit subject:** `fix: secure demo role preview runtime v1`
**Correction commit SHA:** recorded in `worklog.md` (per the durable Git-authority rule)

### Problem corrected

The initial Demo Role Preview Mode v1 implementation (`dfd22f9`) tracked a
fixed plaintext preview password as a TypeScript constant
(`PREVIEW_IDENTITY_PASSWORD = 'preview-role-only-do-not-use-in-production'`)
in `apps/api/src/modules/dev/role-preview/preview-identity-catalogue.ts`.
While the implementation defended the password through seed-time
production-refusal and database-URL validation, the password value itself
was tracked in the repository — which is not acceptable as the final
implementation.

### Correction architecture

The tracked fixed password was replaced with a server-only environment
variable: `IBN_HAYAN_ROLE_PREVIEW_PASSWORD`.

Properties of the corrected architecture:
- **No default value.** The password is never defaulted. The operator
  must supply it explicitly when preview mode is enabled.
- **No fallback value.** When preview mode is enabled and the password
  is missing or invalid, the application refuses to start.
- **Never exposed through a `NEXT_PUBLIC_*` variable.** The password is
  server-only; the frontend never sees it.
- **Never returned to frontend code.** No API response, audit event, log
  line, or error message contains the password.
- **Never printed or logged.** The password is read from the
  environment, hashed with Argon2id, and discarded.
- **Never written into `PROJECT_CONTINUITY.md` or `worklog.md`.** Only
  the variable name and the protected file location are documented.
- **Required only when preview mode or the preview seed is being used.**
  When `IBN_HAYAN_ROLE_PREVIEW_ENABLED` is not `'true'` (or when
  `NODE_ENV === 'production'`), the password is not required and not
  validated.
- **Production fails closed.** Even if the password is present and the
  flag is `'true'`, production refuses to enable preview mode.
- **Minimum reasonable length.** The password must be at least 12
  characters (matching ADR-013 §1.1).
- **Whitespace-only value rejected.** A value that is empty after
  trimming is treated as missing.
- **Development preview startup fails safely when missing.** The
  `RolePreviewPasswordValidator` provider is constructed eagerly when
  the module is loaded; an invalid password prevents the application
  from starting.
- **Normal production and normal development startup with preview
  disabled must not require it.** When the gate returns `false`, the
  password is not read, not validated, and not required.

### Protected password file

The actual runtime password lives outside the repository at:
`/home/z/.config/ibn-hayan-role-preview/preview.env`

- Directory permissions: `0700` (`drwx------`)
- File permissions: `0600` (`-rw-------`)
- Password length: 32 characters (well above the 12-char minimum)
- Password alphabet: `A-Za-z0-9-_` (≈187 bits of entropy)
- Generated with Python `secrets.choice()` (cryptographically secure)
- The password value is NEVER printed, logged, committed, or included
  in any completion report.

The `.env.example` file carries only a blank placeholder:
`IBN_HAYAN_ROLE_PREVIEW_PASSWORD=`

### Files created

- `apps/api/src/modules/dev/role-preview/preview-password.ts` —
  server-only password architecture: `MIN_PREVIEW_PASSWORD_LENGTH`,
  `PREVIEW_PASSWORD_ENV_VAR`, `PreviewPasswordMissingError`,
  `isValidPreviewPassword()`, `readPreviewPasswordFromEnv()`.
- `apps/api/src/modules/dev/role-preview/preview-password.spec.ts` —
  27 unit tests covering validation, error behaviour, and the
  no-leakage requirement.
- `apps/api/src/modules/dev/role-preview/role-preview-password-validator.ts`
  — NestJS `@Injectable` provider whose constructor validates the
  password at module-init time when the gate is enabled; a missing or
  invalid password prevents the application from starting.
- `apps/api/src/modules/dev/role-preview/role-preview-password-validator.spec.ts`
  — 11 unit tests covering all gate/password combinations including
  production fail-closed, fail-safe, and the no-exposure requirement.

### Files modified

- `apps/api/src/modules/dev/role-preview/preview-identity-catalogue.ts`
  — removed the `PREVIEW_IDENTITY_PASSWORD` constant and its JSDoc;
  updated item 7 of the catalogue documentation to describe the
  server-only password architecture.
- `apps/api/src/modules/dev/role-preview/index.ts` — removed the
  `PREVIEW_IDENTITY_PASSWORD` re-export; added re-exports for the new
  password module.
- `apps/api/src/modules/dev/role-preview/preview-identity-catalogue.spec.ts`
  — removed the test that asserted the tracked password's length;
  replaced it with a test that asserts the catalogue module no longer
  exports `PREVIEW_IDENTITY_PASSWORD`.
- `apps/api/src/modules/dev/role-preview/role-preview.module.ts` —
  registered the `RolePreviewPasswordValidator` as a provider so that
  NestJS constructs it eagerly when the module is loaded.
- `apps/api/src/scripts/role-preview-seed-dev.ts` — replaced the
  `PREVIEW_IDENTITY_PASSWORD` import with
  `readPreviewPasswordFromEnv`; the seed now reads the password from
  the server-only environment variable and validates it before
  hashing.
- `.env.example` — added a blank `IBN_HAYAN_ROLE_PREVIEW_PASSWORD=`
  placeholder with a safe explanatory comment that documents the
  variable's purpose, validation rules, and the protected file
  location without including any sample password.

### Files deleted

None.

### Schema or migration changes

None.

### Dependency or lockfile changes

None.

### Fake business data introduced

None. The correction does not create any patient, appointment,
invoice, payment, inventory, attendance, waiting-room, financial, or
notification records.

### Runtime authentication flow review (Phase 3)

The existing runtime authentication flow was reviewed and verified
correct. No changes were needed:

- The backend feature gate (`RolePreviewFeatureConfig`) is
  authoritative; every route consults it before delegating.
- Production always rejects preview routes (the gate returns `false`
  unconditionally when `NODE_ENV === 'production'`).
- Role selection accepts only a canonical `roleCode` (Zod `.strict()`
  schema rejects any additional field — no `userId`, `membershipId`,
  `tenantId`, `organisationId`, `facilityId`, permission codes, or
  session IDs accepted).
- The selected identity is server-derived from the role code via the
  preview identity catalogue; the caller cannot supply any identity or
  context ID.
- The selected identity must belong to the isolated preview tenant
  (verified by slug lookup and membership check).
- Normal session-token generation and hashing are used
  (`SessionTokenService.generate()` and `.hash()`).
- Normal secure HttpOnly session cookies are used
  (`buildSessionCookieOptions()`).
- The previous preview session is revoked atomically in the same
  Prisma transaction as the new session creation.
- Origin checks remain active on mutation routes (select, end).
- CSRF remains active on mutation routes (verified after the session
  check, before the business logic).
- Audit events contain no secret (metadata carries only `endpoint`
  and `roleCode`).
- No raw session token is returned in JSON (it lives only in the
  HttpOnly cookie).
- No password or hash is returned in any response.
- Normal login remains unchanged.
- Normal non-preview sessions cannot use the preview role switcher
  (the switcher is rendered only when the backend confirms the session
  is an active preview session).

### PostgreSQL 17 availability (Phase 4)

**BLOCKED.** This environment does NOT provide a supported PostgreSQL 17
runtime:

- No `psql` command available.
- No `/usr/lib/postgresql/` directory.
- No `docker` or `podman` container runtime.
- No repository-supported `docker-compose` or container command.
- No official Z.AI development database capability documented in the
  repository or environment.

`AGENTS.md` §"Environment Constraints" confirms: "Have **no PostgreSQL
17** locally — use the GitHub Actions Docker workflow for PG17
validation."

Per the correction specification's Phase 4 and Phase 10, the task does
NOT substitute SQLite, PGlite, or another database while claiming
PostgreSQL 17 validation. The task does NOT start a misleading
frontend-only preview. The corrected branch and commit are preserved;
the runtime preview launch is deferred until a supported PostgreSQL 17
runtime is available.

### Database-backed runtime validation (Phase 5–6)

**BLOCKED** by Phase 4. The isolated preview database was not created,
migrations were not applied, the seed was not run, and the 20-item
database-backed integration validation was not executed. These steps
will run on GitHub Actions CI when the branch is pushed through a
separate controlled branch-and-PR workflow, or when a supported
PostgreSQL 17 runtime is provided in the development environment.

### Automated validation (Phase 7)

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS (all 7 packages + 2 apps) |
| `pnpm run lint` | PASS (all 7 packages + 2 apps) |
| `pnpm run test` | PASS — 579 tests (97 domain + 154 contracts + 83 observability + 65 api + 180 web) |
| `pnpm run build` | PASS — Next.js production build; `/role-preview` registered as a static route alongside `/`, `/_not-found`, `/clinic-admin`, `/dashboard`, `/login` |
| `git diff --check` | PASS — no whitespace errors |

### Clinic Admin shell regression check

- Exactly 11 sidebar items (1 implemented `overview` + 10 unimplemented). ✓
- Notifications remain in the header bell (`<NotificationBell />` at `clinic-admin-header.tsx:194`). ✓
- R09 Arabic label remains `مدير المنشأة` in the role catalogue. ✓
- No fake business data introduced. ✓

### Production safety

- The feature is completely unavailable in production regardless of the
  flag value or the password value. Ten unit tests verify the gate's
  fail-closed behaviour.
- The frontend consults the backend availability endpoint; no
  client-side state can enable the feature.
- The password is server-only; no `NEXT_PUBLIC_*` variable exposes it.
- The `RolePreviewPasswordValidator` prevents the application from
  starting when preview mode is enabled but the password is missing or
  invalid (fail-safe).
- No tracked fixed preview password remains in the repository. A unit
  test asserts the catalogue module no longer exports
  `PREVIEW_IDENTITY_PASSWORD`.

### Z.AI user-visible preview (Phase 9)

**NOT LAUNCHED.** Per Phase 10, the official Z.AI preview mechanism
requires a backend database to satisfy the specification's requirement
that the preview be "backed by an isolated PostgreSQL 17 preview
database and the real R01–R14 preview identities." Because no
supported PostgreSQL 17 runtime is available (Phase 4), the preview
was not launched. The task did NOT improvise platform infrastructure,
did NOT create daemon scripts, did NOT probe hidden services, and did
NOT leave orphan processes.

### Known blockers

1. **No supported PostgreSQL 17 runtime in this environment.** This
   blocks Phase 5 (seed), Phase 6 (database-backed integration
   validation), and Phase 9 (launch of the Z.AI user-visible preview
   backed by a real database).

2. **Pre-existing `.preview-logs/` tracked scripts.** The files
   `.preview-logs/preview-proxy.py`, `.preview-logs/start-api.sh`, and
   `.preview-logs/start-web.sh` are tracked in the repository from a
   previous session (commit `362d4cd`, July 19). The `.gitignore`
   documents them as "intentional preview-infrastructure scripts."
   These are NOT part of the current correction and were NOT modified
   or added by this task. The operator may wish to review whether they
   should be removed in a separate housekeeping commit; they predate
   the Demo Role Preview Mode v1 implementation.

### Immediate next product slice

Today's Appointments — unchanged. The Secure Demo Role Preview Mode v1
correction does NOT alter the canonical next-vertical-slice ordering.

### Recovery information

- **Primary worktree:** `/home/z/my-project` on `main` at `72cce12af075e3f19962c3e247b4fd0e3aa67e3f` (0/0 divergence with origin).
- **Demo-preview worktree:** `/home/z/demo-role-preview-v1` on `feat/demo-role-preview-v1`.
- **Pre-correction SHA:** `dfd22f97a141ab6d7f19c84a6c5aa8c6eed67015` (`feat: add secure demo role preview mode v1`).
- **Correction commit subject:** `fix: secure demo role preview runtime v1`.
- **Correction commit SHA:** recorded in `worklog.md` (per the durable Git-authority rule).
- **Protected password file:** `/home/z/.config/ibn-hayan-role-preview/preview.env` (directory `0700`, file `0600`, outside the repository).
- **To inspect the correction without checking out the branch:** `git worktree add /tmp/demo-role-preview-correction-review feat/demo-role-preview-v1`.
- **To re-run validation in the worktree:** `cd /home/z/demo-role-preview-v1 && pnpm install --frozen-lockfile && pnpm run build:shared && pnpm --filter @ibn-hayan/observability build && pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`.
- **To run the preview seed (requires PostgreSQL 17 + isolated preview database + protected preview.env):** `set -a && source /home/z/.config/ibn-hayan-role-preview/preview.env && set +a && cd /home/z/demo-role-preview-v1/apps/api && ALLOW_ROLE_PREVIEW_SEED=true IBN_HAYAN_ROLE_PREVIEW_ENABLED=true DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/role_preview_db NODE_ENV=development pnpm role-preview:seed`.
