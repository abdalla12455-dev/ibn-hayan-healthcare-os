# AI Agent Safety Skill — Ibn Hayan Healthcare OS

> **This document is the permanent, repository-backed safety skill for AI agents working on the Ibn Hayan Healthcare OS. It encodes the hard-won lessons from real incidents during development. Every rule here exists because something went wrong without it.**

## Purpose

This skill exists to prevent the following classes of incidents that have occurred during the development of this project:

1. **Accidental mass-commits** — An AI environment auto-committed 94 untracked files to `main` with a UUID subject, breaking the invariant that `main` only advances through reviewed pushes
2. **Lost work from bad resets** — Without quarantine branches, resetting away an accidental commit would destroy potentially useful content
3. **Secret leakage** — Deploy keys, if printed or committed, grant permanent write access to the repository
4. **Non-fast-forward pushes** — Force-pushing overwrites reviewed history and can destroy verified work
5. **Stale state confusion** — Without a continuity document, a new session has no idea what the previous session did or what the canonical state is

## Core Principles

### Principle 1: Explicit Authorization for Every State Change

No git operation that modifies repository state (commit, push, reset, branch, tag, merge, rebase, amend, stash, clean, restore) is ever performed without explicit, specific, written authorization from the human operator naming the exact operation.

**Corollary:** The environment may auto-stage or auto-commit behind your back. Always verify state before and after every operation.

### Principle 2: Verify Before Acting

Before any git operation, verify:
- Working tree is in the expected state (`git status --short`)
- Current branch is correct (`git branch --show-current`)
- HEAD matches the expected commit (`git rev-parse HEAD`)
- Remote sync is as expected (`git rev-list --left-right --count origin/main...main`)
- No unexpected untracked files exist (`git ls-files --others --exclude-standard`)

### Principle 3: Quarantine, Never Destroy

When something goes wrong (accidental commit, wrong branch, bad merge), the first response is to **preserve** the bad state on a quarantine branch, then recover. Never destroy state until the operator has confirmed it is safe to do so.

### Principle 4: Minimal Blast Radius

Use the narrowest operation that achieves the goal:
- Stage individual files, not `git add .`
- Push a single branch, not `--all` or `--mirror`
- Use fast-forward pushes, not `--force`
- Generate keys outside the repo, not inside

## Pre-Commit Protocol

Before committing anything:

### Step 1: Verify Clean Baseline

```bash
git status --short                    # must show only your intended changes
git ls-files --others --exclude-standard  # must be empty (no untracked files)
git diff --cached --stat              # must show only what you intend to commit
```

### Step 2: Stage Individually

```bash
# GOOD — stage specific files
git add path/to/file1.ts path/to/file2.ts

# FORBIDDEN — captures everything
git add .
git add -A
git add --all
```

### Step 3: Verify Staged Content

```bash
git diff --cached --stat              # review what will be committed
git diff --cached                     # full diff review
```

### Step 4: Secret Scan

Scan the staged diff for secrets:

```bash
git diff --cached | grep -iE '(api[_-]?key|secret|password|token|-----BEGIN.*PRIVATE KEY|ghp_|gho_|github_pat_|sk-|AKIA)' || echo "No secrets detected"
```

### Step 5: Commit with Descriptive Subject

```bash
git commit -m "feat(scope): descriptive subject line"
```

Never use UUID-only subjects. If the environment auto-generates a UUID commit, quarantine it and re-commit with a real subject.

## Push Protocol

### Step 1: Verify Ahead/Behind

```bash
git fetch origin
git rev-list --left-right --count origin/main...main
```

The output must be `0 N` (zero behind, N ahead). If it is anything else:
- `M 0` with M > 0: local is behind — fetch and merge or rebase (with authorization)
- `M N` with both > 0: diverged — stop and report
- `0 0`: nothing to push — verify you're on the right branch

### Step 2: Push (Fast-Forward Only)

```bash
git push origin main
```

**Never use:**
- `--force`
- `--force-with-lease`
- `--all`
- `--mirror`
- `+main:main` (+ prefix forces)

### Step 3: Verify Push

```bash
git fetch origin
git rev-parse origin/main   # must equal git rev-parse main
git rev-list --left-right --count origin/main...main   # must be "0 0"
```

## Deploy Key Lifecycle

When the environment has no GitHub authentication (no SSH client, no stored credentials), use a temporary deploy key:

### Phase 1: Generate Key Pair

Generate an Ed25519 key pair **outside** the repository:

```python
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

private_key = Ed25519PrivateKey.generate()
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.OpenSSH,
    encryption_algorithm=serialization.NoEncryption(),
)
# Write to /home/z/.ssh/<descriptive-name> with chmod 600
# Write public key to /home/z/.ssh/<descriptive-name>.pub with chmod 644
```

**Rules:**
- Key files must live outside the repository (e.g. `/home/z/.ssh/`)
- Private key must be `chmod 600`
- Never print, display, encode, summarize, or reveal the private key
- Use a descriptive comment: `ZAI Temporary Ibn Hayan <Purpose>`

### Phase 2: Register on GitHub

The human operator adds the public key as a deploy key with write access at:
`https://github.com/abdalla12455-dev/ibn-hayan-healthcare-os/settings/keys/new`

### Phase 3: SSH Shim (When No SSH Client Available)

If `ssh` is unavailable, create a paramiko-based SSH shim:

```python
#!/usr/bin/env python3
import paramiko, select, os, sys, hashlib, base64

# Load the private key
private_key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)

# Connect to github.com:22
transport = paramiko.Transport(("github.com", 22))
transport.connect(username="git", pkey=private_key)

# Verify host key against GitHub's published SHA-256 fingerprints
remote_key = transport.get_remote_server_key()
sha256_fp = "SHA256:" + base64.b64encode(
    hashlib.sha256(remote_key.asbytes()).digest()
).decode().rstrip("=")

KNOWN_FINGERPRINTS = [
    "SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s",  # RSA
    "SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU",  # Ed25519
    "SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM",  # ECDSA
]
assert sha256_fp in KNOWN_FINGERPRINTS, f"Host key mismatch: {sha256_fp}"

# Execute git-receive-pack (push) or git-upload-pack (fetch)
channel = transport.open_session()
channel.exec_command(command)
# ... bidirectional streaming via select.select ...
```

The shim:
- Lives outside the repository (e.g. `/home/z/git-ssh-shim-<purpose>.py`)
- Connects only to `github.com:22`
- Only allows `git-upload-pack` and `git-receive-pack` commands
- Verifies the host key against GitHub's published fingerprints
- Filters `-o`, `-i`, `-G` options from git's invocation

### Phase 4: Push Using the Shim

```bash
GIT_SSH_COMMAND="/home/z/git-ssh-shim-<purpose>.py" \
GIT_SSH_VARIANT=ssh \
git push git@github.com:abdalla12455-dev/ibn-hayan-healthcare-os.git main
```

Using a one-shot SSH URL (`git@github.com:...`) avoids modifying the `origin` remote.

### Phase 5: Cleanup

After the push is verified:

1. Delete the private key: `rm /home/z/.ssh/<descriptive-name>`
2. Delete the public key: `rm /home/z/.ssh/<descriptive-name>.pub`
3. Delete the SSH shim: `rm /home/z/git-ssh-shim-<purpose>.py`
4. The human operator removes the deploy key from GitHub after inspecting the CI run

## Quarantine Procedure

When an accidental or unauthorized commit is discovered on `main`:

### Step 1: Identify the Bad Commit

```bash
git log --oneline -10           # find the unauthorized commit
git rev-parse HEAD              # note current (bad) HEAD
```

### Step 2: Identify the Last Good Commit

```bash
git log --oneline -20           # find the last authorized commit before the bad one
```

### Step 3: Create Quarantine Branch

```bash
git branch quarantine/<descriptive-name> <bad-commit-sha>
```

This preserves the bad commit (and all files it captured) on a separate branch.

### Step 4: Reset main (With Authorization)

```bash
git reset --hard <last-good-commit-sha>
```

**Only perform this step with explicit written authorization from the operator.**

### Step 5: Document

Update `PROJECT_CONTINUITY.md`:
- Add the quarantine branch to Active Branches
- Note the quarantined SHA, subject, and disposition (pending review)
- Record the recovery action taken

### Step 6: Review Quarantine Content Later

The operator may later:
- Cherry-pick useful files from the quarantine branch
- Preserve it indefinitely as a record
- Delete it after confirming nothing useful is inside

## GitHub Actions Workflow Discipline

When fixing a CI workflow:

### Iterative Fix Pattern

1. Work on a dedicated branch (e.g. `adr-015-validation`), not `main`
2. Use `git worktree` to avoid the environment auto-restoring to `main`
3. Make one targeted fix per commit
4. Push the branch
5. Monitor the Actions run
6. If it fails, diagnose from the error, make the next targeted fix
7. Repeat until green

### Common Failure Modes

| Failure | Cause | Fix |
|---|---|---|
| `command not found` | Login shell reset PATH | Use `bash -c` not `bash -lc`; use absolute `$BINDIR/...` paths |
| `Command "prisma" not found` | Root workspace doesn't expose binary | Use `pnpm --dir apps/api exec prisma` |
| `Cannot find module '@ibn-hayan/*'` | Workspace packages not built | Run `pnpm run build:shared` before typecheck |
| `psql: connection refused` | PostgreSQL service not started | Verify `pg_ctl` start; check `$PGDATA` |

## Worktree Pattern for Isolated Branch Work

When the environment auto-restores the checkout to `main` between operations:

```bash
git worktree add /home/z/<branch-name>-worktree <branch-name>
cd /home/z/<branch-name>-worktree
# ... make changes, commit ...
git push origin <branch-name>
cd /home/z/my-project
git worktree remove /home/z/<branch-name>-worktree
```

This keeps the main checkout untouched while allowing work on a different branch.

## Forbidden Operations Reference

The following operations are **never** performed without explicit written authorization that names the exact operation:

| Operation | Why Forbidden |
|---|---|
| `git add .` / `git add -A` | Captures untracked files en masse |
| `git push --force` | Overwrites remote history |
| `git push --force-with-lease` | Overwrites remote history (slightly safer but still destructive) |
| `git push --all` | Pushes all branches including quarantine/backup |
| `git push --mirror` | Mirrors everything including deletions |
| `git rebase` on shared branches | Rewrites shared history |
| `git commit --amend` on pushed commits | Rewrites pushed history |
| `git reset --hard` | Discards working tree changes (except authorized recovery) |
| `git clean -fd` | Deletes untracked files (may destroy work) |
| Printing/encoding private keys | Leaks the credential |
| Storing keys inside the repo | Risks accidental commit |
| Modifying `.gitignore` for temporary keys | Pollutes repo config for ephemeral needs |

## Incident Response Playbook

### If You Discover an Unexpected Commit on main

1. **STOP.** Do not reset, do not push, do not amend.
2. Run `git log --oneline -10` and `git show --stat HEAD` to assess the damage.
3. Run `git ls-files --others --exclude-standard` to check for more untracked files.
4. Create a quarantine branch: `git branch quarantine/<name> HEAD`.
5. Report to the operator: what commit, what files, what quarantine branch was created.
6. Wait for authorization before resetting.

### If You Discover a Secret in a Commit

1. **STOP.** Do not push.
2. If already pushed: the secret must be rotated immediately — report to operator.
3. If not pushed: remove the secret from the commit (soft reset, re-stage without secret, re-commit).
4. Scan all subsequent commits for the same secret.
5. Document the incident in `PROJECT_CONTINUITY.md`.

### If a Push Fails with Non-Fast-Forward

1. **STOP.** Do not force.
2. Run `git fetch origin` and `git rev-list --left-right --count origin/main...main`.
3. If behind: the remote has commits you don't have — fetch and inspect them.
4. If diverged: report to operator. A rebase or merge may be needed, but only with authorization.
5. Never resolve a non-fast-forward with `--force`.

## Session Start Checklist

When starting a new session on this project:

1. Read `AGENTS.md` (safety contract)
2. Read `PROJECT_CONTINUITY.md` (current state)
3. Read this document (`docs/AI_AGENT_SAFETY_SKILL.md`)
4. Verify the repository state matches what `PROJECT_CONTINUITY.md` records:
   ```bash
   git rev-parse HEAD
   git rev-parse origin/main
   git rev-list --left-right --count origin/main...main
   git status --short
   ```
5. If anything mismatches, report before proceeding.

## Session End Checklist

When ending a session:

1. Update `PROJECT_CONTINUITY.md` with:
   - Any new commits pushed to origin
   - Any new branches created
   - Any quarantine/backup branches
   - Any pending actions for the next session
2. Verify all temporary resources are cleaned up (keys, shims, worktrees)
3. Verify the working tree is clean
4. Verify main and origin/main are in sync (or document why they're not)
