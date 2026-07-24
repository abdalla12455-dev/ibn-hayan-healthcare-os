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
| `11a377e...` | 2026-07-22 02:47 | `ccfd5dbc-56da-495f-ada2-15fbc00c8c9a` | ADR-015 scoped context feature (32 files, +4868/-82). UUID subject is intentional — environment-generated commit marker. |
| `6d046b2...` | 2026-07-22 03:39 | `31d5bd0f-8e53-44e3-b9e1-5d6c9697484d` | ADR-015 refinements (7 files, +581/-111). UUID subject, same as above. |
| `a065b41...` | 2026-07-22 04:16 | Complete ADR-015 scoped context verification | Verification tests (10 files, +4205/-91) |
| `f78ad2731bc681b52d2cde3f261ff0fa3f13417b` | 2026-07-22 05:09 | Add genuine ADR-015 migration upgrade test | Migration upgrade test (2 files, +609/-44). **Current tip of main.** |

### Current State (as of last verified session)

- **Local `main`:** `f78ad2731bc681b52d2cde3f261ff0fa3f13417b`
- **`origin/main`:** `f78ad2731bc681b52d2cde3f261ff0fa3f13417b`
- **Ahead/behind:** `0 0` (in sync)
- **Working tree:** clean
- **Safety skill installed:** this commit (AGENTS.md, PROJECT_CONTINUITY.md, docs/AI_AGENT_SAFETY_SKILL.md)

## Active Branches

### `adr-015-validation`

- **Purpose:** GitHub Actions workflow for validating ADR-015 against PostgreSQL 17 in Docker
- **Tip:** `d2aab9f5af0cf1d06b93fd95245c0e7ac7ed2248`
- **origin sync:** in sync (pushed)
- **Workflow file:** `.github/workflows/adr015-postgresql17-validation.yml`
- **Status:** Latest fix (v6) inserted `pnpm run build:shared` before typecheck to resolve `@ibn-hayan/observability` module resolution. Awaiting CI run verification.

**ADR-015 validation workflow commit history:**

| SHA | Version | Fix |
|---|---|---|
| `1988075` | v1 | Corepack-based pnpm |
| `6c01bda` | v2 | npm-installed pnpm, node:22 |
| `6af7e18` | v3 | node:24, workspace ownership |
| `64a27df` | v4 | `bash -c` instead of `bash -lc`, PG_BINDIR hardening |
| `aa4eff1` | v5 | `pnpm --dir apps/api exec prisma` for workspace resolution |
| `d2aab9f` | v6 | `pnpm run build:shared` before typecheck (current) |

### `quarantine/auto-commit-8d5e167`

- **Purpose:** Preserves an accidental automatic commit that captured 94 previously-untracked files onto `main`
- **Quarantined SHA:** `8d5e167490824d1489a56efbda9574d882356176`
- **Subject:** `05cb14bc-51b7-4ad6-8f09-12c214fbe300` (UUID — environment-generated)
- **origin sync:** local-only (never pushed)
- **Disposition:** Pending operator decision — cherry-pick useful files, preserve indefinitely, or eventually delete
- **Recovery action taken:** `main` was reset from `8d5e167` back to `f78ad27` (the last verified commit) after creating this quarantine branch

**Important:** This quarantine branch contains 94 files that were NOT intended to be committed. Do not cherry-pick from it without individually reviewing each file for secrets, temporary artifacts, and relevance.

## Pending Actions

The following items require operator attention:

1. **ADR-015 CI verification:** Monitor the GitHub Actions run triggered by commit `d2aab9f` on `adr-015-validation`. All 7 PostgreSQL 17 test suites (229 tests total) must pass. If any suite fails, diagnose from the Actions logs and apply a targeted fix.

2. **Deploy key cleanup:** The temporary GitHub deploy key labelled `ZAI Temporary Ibn Hayan Main Push` should be removed from the repository's deploy keys settings after this push is verified. (The key itself has already been deleted from the local filesystem.)

3. **Quarantine branch disposition:** Decide what to do with `quarantine/auto-commit-8d5e167` — the 94 files it preserves may contain useful work or may be entirely disposable.

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
| Pre-ADR-015-push main | `ff4df26748d92355c0316fc0ceb32d81458d8815` | `git reset --hard ff4df26` (with authorization) |
| ADR-015 validation v6 | `d2aab9f5af0cf1d06b93fd95245c0e7ac7ed2248` | `git checkout adr-015-validation` |
| Quarantine (accidental commit) | `8d5e167490824d1489a56efbda9574d882356176` | `git checkout quarantine/auto-commit-8d5e167` |
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
