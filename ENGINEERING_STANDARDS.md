# Engineering Standards — Ibn Hayan Healthcare OS

> **This document defines the engineering, security, repository, and recovery standards for Ibn Hayan Healthcare OS. Review the relevant requirements before modifying the project.**

## Project Identity

- **Name:** Ibn Hayan Healthcare OS
- **Repository:** https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os.git
- **Type:** Healthcare platform monorepo (pnpm workspace)
- **Stack:** Node.js 24, TypeScript, React (web), NestJS (api), Prisma, PostgreSQL 17
- **Domain:** Multi-tenant healthcare with strict organisational and facility scoping

## Critical Invariants — NEVER Violate

These invariants exist because each one corresponds to a real incident that occurred during development. Violating any of them can corrupt the repository, leak secrets, or destroy verified work.

### 1. Controlled Git Operations

Routine development work may include creating branches,
staging reviewed files, committing, pushing development
branches, opening pull requests, and merging reviewed
changes after successful required validation.

The project operator has authorized this routine workflow
for requested development tasks.

Separate approval is not required for every ordinary
commit, push, or reviewed pull-request merge.

Before every state-changing Git operation:

- Verify the repository, remote, branch, and current HEAD.
- Inspect working-tree changes, staged files, and untracked files.
- Verify local and remote branch differences.
- Preserve existing committed and uncommitted work.
- Review the exact files included in the operation.
- Check for secrets and accidental deletions.
- Stage only intended files individually.
- Never overwrite newer remote work.
- Confirm that required validation has passed.

Before merging a pull request, verify its source and
target branches, exact commit SHAs, changed-file scope,
required CI results, and current mergeability.

After each push or merge, verify the resulting GitHub
commit SHA against the expected commit.

Never claim that work is backed up on GitHub unless
the commit and push succeeded and the local and remote
branch SHAs match exactly.

Destructive operations, branch deletion, force pushes,
production deployment, and production data modification
require separate explicit operator approval.

### 2. main Stays at Canonical Checkpoints

The main branch advances only through reviewed changes
with successful required CI validation.

Use development branches and reviewed pull requests for
routine project changes.

Do not push directly to main during routine development.

Before merging, verify the exact source and target SHAs,
required checks, changed files, and remote branch state.

If main has changed unexpectedly, stop and review the
new state before continuing.

After merging, retrieve the complete remote main SHA,
verify the merge commit and its parents, and confirm
that the development branch remains preserved.

### 3. No Force Operations

**NEVER** use any of the following, under any circumstances, without explicit written authorization that names the exact flag:

- `--force`
- `--force-with-lease`
- `--all`
- `--mirror`
- `+`-prefixed refspec (e.g. `+main:main`)
- `git rebase` on shared branches
- `git commit --amend` on pushed commits
- `git reset --hard` (except for explicitly authorized recovery)

Fast-forward pushes are the default and the only acceptable push mode for routine work.

### 4. No Mass-Staging of Untracked Files

**NEVER** run `git add .`, `git add -A`, `git add --all`, or `git add *`. These commands can capture temporary files, editor backups, build artifacts, secret keys, and environment files that happen to be present in the working tree.

Instead, stage files **individually by name**: `git add path/to/specific/file.ts`. If you need to stage a directory, first run `git status --short` on that directory and verify every file listed is one you intend to commit.

### 5. Deploy Keys Are Temporary and External

Temporary GitHub deploy keys must:

- Be generated **outside** the repository (e.g. `/home/z/.ssh/`, never inside `/home/z/my-project/`)
- Use Ed25519
- Have no passphrase (for automated use)
- Be deleted from the local filesystem immediately after the push is verified
- Be removed from GitHub by the operator after the resulting CI run is inspected
- **NEVER** be printed, displayed, base64-encoded, summarized, or revealed in any form — only the public key may be shown

### 6. Quarantine, Never Delete

If an accidental commit captures unintended files, **do not delete it**. Instead:

1. Create a quarantine branch: `git branch quarantine/<descriptive-name> <bad-commit-sha>`
2. Reset main to the last known-good commit (only with explicit authorization): `git reset --hard <good-sha>`
3. The quarantine branch preserves the content for later cherry-picking or inspection
4. Document the quarantine branch in `PROJECT_CONTINUITY.md`

## Pre-Operation Checklist

Before any git operation that modifies state (commit, push, reset, branch, tag, merge, rebase):

1. **Verify working tree:** `git status --short` — must be clean unless you intentionally have changes
2. **Verify branch:** `git branch --show-current` — must be the branch you expect
3. **Verify HEAD:** `git rev-parse HEAD` — must match the expected commit
4. **Verify remote sync:** `git fetch origin && git rev-list --left-right --count origin/main...main`
5. **Verify no untracked files:** `git ls-files --others --exclude-standard` — must be empty unless you intentionally have new files
6. **Confirm scope:** The operation must be within the operator-approved development workflow. Destructive or production operations require separate explicit authorization.

## Branch Discipline

| Branch pattern | Purpose | Who creates | Push rules |
|---|---|---|---|
| `main` | Canonical reviewed history | Project maintainer | Reviewed pull-request merges only; no force or routine direct pushes |
| `adr-*` | Architecture Decision Record implementation branches | Project maintainer | Fast-forward only |
| `quarantine/*` | Preserves accidental commits for recovery | Project maintainer (recovery) | Never pushed to origin unless explicitly authorized |
| `backup/*` | Point-in-time backups before risky operations | Project maintainer | Local-only unless explicitly authorized |

## Secret Hygiene

- **NEVER** commit `.env`, `.env.*`, `*.key`, `*.pem`, `id_rsa`, `id_ed25519`, or any file matching a private key pattern
- **NEVER** hardcode API keys, passwords, tokens, or connection strings with real credentials — use environment variables and `.env.example` placeholders
- Before committing, scan your diff for secret patterns: `ghp_`, `gho_`, `github_pat_`, `sk-`, `AKIA`, `-----BEGIN`, `postgresql://user:password@`
- If you find a secret in a pending commit, **stop immediately**, remove it, and rotate the credential

## Development Environment

The primary development workflow uses the operator's
macOS workstation and terminal.

Project changes are made through inspected, targeted
terminal commands.

Do not assume that an older workspace snapshot is
newer than the GitHub repository.

Use the repository's established package manager,
build tools, test commands, and database tooling.

Validate PostgreSQL 17-dependent changes using the
existing approved validation environment.

Do not run destructive database commands or modify
production data without separate explicit approval.

Temporary files and protective backups must remain
outside the repository unless they are intentional
project artifacts.

Historical development-environment incidents remain
documented in PROJECT_CONTINUITY.md.

## Key Documents

| Document | Purpose |
|---|---|
| `PROJECT_CONTINUITY.md` | Current project state, canonical commits, active branches, recovery checkpoints |
| `AGENTS.md` | Repository entrypoint to engineering requirements |
| `download/docs/12_ADR/` | Architecture Decision Records |
| `.github/workflows/` | CI validation workflows |

## Escalation

If you encounter any of the following, **STOP immediately** and report to the human operator before taking any corrective action:

- Unexpected commits on `main` (especially with UUID subjects)
- Untracked files you did not create
- Staged files you did not stage
- A behind/non-fast-forward state on `main` vs `origin/main`
- A missing quarantine or backup branch you expected to exist
- Any sign of a leaked secret (in a commit, in the working tree, in a log)

**When in doubt, stop and ask.** The cost of asking is a few seconds. The cost of a wrong force-push or a leaked key is hours to days of recovery.

## Specialized Engineering Controls

These requirements consolidate the repository's former specialized
development guidance. They apply alongside the critical invariants
above and the approved architecture and product documentation.

### Repository Inspection and Change Scope

- Inspect the repository root, remote, current branch, recent commits,
  staged changes, modified files, deleted files, untracked files,
  ignored files, and local-versus-remote divergence before editing.
- Fetch remote refs and confirm the working copy is not behind or
  diverged from the intended development branch.
- Read AGENTS.md, PROJECT_CONTINUITY.md, relevant Architecture
  Decision Records, product specifications, and module documentation.
- Verify the exact target role, interface, module, workflow, and
  expected result before changing implementation.
- Diagnose root causes before fixing defects.
- Modify the established implementation in place. Do not create
  duplicate routes, components, services, schemas, or competing flows.
- Preserve existing features, architectural contracts, approved
  designs, tenant isolation, and permission boundaries.
- Avoid unrelated refactoring, dependency upgrades, file
  regeneration, and lockfile changes.
- Preserve all existing committed and uncommitted work.

### Database and Multi-Tenant Integrity

- Inspect Prisma schemas, migration history, data ownership,
  canonical database documentation, and applicable ADRs first.
- Maintain strict Tenant, Organisation, and Facility separation.
- Verify ownership chains and use composite constraints where needed
  to prevent cross-tenant or cross-organisation relationships.
- Never weaken tenant isolation or authorization for convenience.
- Reuse established identifiers, types, timestamps, relationships,
  indexing conventions, and referential actions.
- Keep domain data in its owning module: Patient for patient identity,
  Workforce for provider and workforce identity, and Billing for
  financial records.
- Do not introduce fabricated domain entities or premature
  references to modules that have not been implemented.
- Preserve timestamps in UTC and configured facility timezones as
  valid IANA identifiers.
- For facility-local date workflows, missing facility timezone is
  a configuration-required state, not permission to silently
  substitute UTC, browser time, server time, or tenant timezone.
- Prefer forward-only and non-destructive migrations.
- Never reset databases, rewrite applied shared migrations, or
  perform destructive data changes without explicit authorization.
- Correct already-applied migrations through reviewed forward
  migrations rather than rewriting applied history.
- Validate Prisma schema, client generation, migration SQL,
  constraints, referential actions, and PostgreSQL 17 behavior
  where applicable.
- Use only isolated synthetic database fixtures for destructive
  integration tests. Never point test cleanup at operational data.

### Authentication, Authorization, and Audit

- Platform Super Admin is platform-scoped and independent of tenant
  memberships and R09 or R13 tenant roles.
- Clinic Admin remains tenant-, organisation-, and facility-scoped.
- Never infer authority from browser-supplied identity, role,
  membership, tenant, or facility identifiers.
- Preserve existing authentication, session lifecycle, CSRF,
  authorization, and audit contracts.
- Preserve generic client-facing authorization denials and avoid
  leaking internal grant or membership details.
- Reuse the canonical audit infrastructure and approved event
  catalogue rather than implementing competing audit stores.
- Exclude credentials, raw tokens, cookies, private keys, and
  clinical information from logs and audit metadata.
- Treat test success as evidence for the tested controls only,
  not as a security certification.

### UI, Accessibility, and Language Direction

- Identify the exact user role, route, tenant context, organisation,
  facility, locale, and workflow before changing a screen.
- Follow the approved DESIGN_BIBLE.md and existing design system.
- Keep Clinic Admin and Platform Super Admin interfaces separate.
- Preserve approved hierarchy, terminology, navigation, responsive
  behavior, permissions, and error states.
- Edit existing components rather than producing duplicate screens.
- Maintain safe spacing on all viewport edges, including mobile
  safe areas, dialogs, cards, tables, controls, and profile sections.
- Verify text overflow, long Arabic and English labels, narrow
  screens, and desktop/tablet/mobile layouts.
- Support Arabic RTL and English LTR using semantic direction and
  logical CSS properties, never by reversing text manually.
- Represent unsupported, empty, loading, configuration-required,
  and permission-denied states accurately.
- Do not introduce interactive actions without a corresponding
  verified backend, permission, and data contract.
- Validate accessibility, browser console output, network requests,
  role-specific workflows, and visual behavior where applicable.

### Verification, Continuity, and Delivery

- Run relevant typechecks, lint, tests, build, schema checks,
  authorization tests, tenant-isolation tests, and browser reviews.
- Distinguish failures introduced by the task from existing defects.
- Never declare completion merely because code was written.
- Update PROJECT_CONTINUITY.md after each coherent completed task:
  record repository, branch, verified starting commit, current state,
  files created/modified/deleted, decisions, validation results,
  outstanding risks, next work, and recovery instructions.
- Maintain AGENTS.md and PROJECT_CONTINUITY.md in the repository.
- Stage only individually reviewed project files and inspect staged
  changes for secrets, unrelated edits, and accidental deletions.
- Use descriptive commits on the approved development branch.
- After pushing, compare complete local, direct remote, and
  remote-tracking commit SHAs. Do not claim a verified Git backup
  without a successful commit, push, and exact SHA match.
- Preserve a clean worktree or explicitly document unfinished files
  when ending or resuming work.
- On resumption, inspect Git and continuity before editing.
- Report the outcome, repository, branch, modified files, validation,
  commit and push status, exact SHAs, remaining risks, and next step.
- Historical incident and recovery records remain available through
  Git history and chronological continuity entries.

### Documentation and Presentation Quality

- Maintain a clear distinction between implemented capabilities,
  planned modules, and experimental functionality.
- Write product-facing documentation for engineering teams,
  healthcare stakeholders, and implementation reviewers.
- Keep historical recovery details separate from the primary
  product introduction.
- Do not claim features, certifications, operational readiness,
  performance measurements, or team credentials without evidence.
- Never rewrite Git history to change the historical development
  record.
