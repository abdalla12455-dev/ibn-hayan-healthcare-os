# AGENTS.md — Ibn Hayan Healthcare OS

> **This file is the authoritative safety and operating contract for every AI agent (Claude Code, Cursor, Copilot Chat, Z.AI, etc.) working in this repository. Read it in full before any operation.**

## Project Identity

- **Name:** Ibn Hayan Healthcare OS
- **Repository:** https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os.git
- **Type:** Healthcare platform monorepo (pnpm workspace)
- **Stack:** Node.js 24, TypeScript, React (web), NestJS (api), Prisma, PostgreSQL 17
- **Domain:** Multi-tenant healthcare with strict organisational and facility scoping

## Critical Invariants — NEVER Violate

These invariants exist because each one corresponds to a real incident that occurred during development. Violating any of them can corrupt the repository, leak secrets, or destroy verified work.

### 1. No Automatic Commits

**NEVER** run `git commit`, `git add`, `git stash`, or any history-writing command without explicit, specific, written authorization from the human operator for that exact operation.

The environment may auto-stage or auto-commit files without warning. Before any git operation, always run `git status --short` and `git diff --cached --stat` to verify nothing was staged behind your back. If you find staged files you did not explicitly stage, stop and report — do not commit through them.

### 2. main Stays at Canonical Checkpoints

The `main` branch must only advance through explicit, reviewed, human-authorized pushes. Before pushing, verify:

```
git rev-list --left-right --count origin/main...main
```

The output must show `0 N` (zero behind, N ahead). If it shows anything else (especially `M 0` with M > 0, meaning local is behind), **STOP** — do not force, do not rebase, do not merge. Report the divergence to the operator.

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
6. **Confirm authorization:** You must have explicit human authorization for the exact operation you are about to perform

## Branch Discipline

| Branch pattern | Purpose | Who creates | Push rules |
|---|---|---|---|
| `main` | Canonical, production-ready history | Human only | Fast-forward only, no force |
| `adr-*` | Architecture Decision Record implementation branches | AI agent (authorized) | Fast-forward only |
| `quarantine/*` | Preserves accidental commits for recovery | AI agent (recovery) | Never pushed to origin unless explicitly authorized |
| `backup/*` | Point-in-time backups before risky operations | AI agent (authorized) | Local-only unless explicitly authorized |

## Secret Hygiene

- **NEVER** commit `.env`, `.env.*`, `*.key`, `*.pem`, `id_rsa`, `id_ed25519`, or any file matching a private key pattern
- **NEVER** hardcode API keys, passwords, tokens, or connection strings with real credentials — use environment variables and `.env.example` placeholders
- Before committing, scan your diff for secret patterns: `ghp_`, `gho_`, `github_pat_`, `sk-`, `AKIA`, `-----BEGIN`, `postgresql://user:password@`
- If you find a secret in a pending commit, **stop immediately**, remove it, and rotate the credential

## Environment Constraints

This repository may be developed inside constrained AI environments (Z.AI, etc.) that:

- Have **no OpenSSH client** (`ssh`, `ssh-keygen` unavailable) — use the paramiko-based SSH shim pattern documented in `docs/AI_AGENT_SAFETY_SKILL.md`
- Have **no PostgreSQL 17** locally — use the GitHub Actions Docker workflow for PG17 validation
- May **auto-restore the working tree to `main`** between operations — use `git worktree` for isolated branch work
- May **auto-commit untracked files** with UUID subjects — always check `git log --oneline -5` and `git status` before and after every operation

## Key Documents

| Document | Purpose |
|---|---|
| `PROJECT_CONTINUITY.md` | Current project state, canonical commits, active branches, recovery checkpoints |
| `docs/AI_AGENT_SAFETY_SKILL.md` | Detailed safety skill: push patterns, deploy key lifecycle, quarantine procedures, recovery playbooks |
| `docs/adr/` | Architecture Decision Records |
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
