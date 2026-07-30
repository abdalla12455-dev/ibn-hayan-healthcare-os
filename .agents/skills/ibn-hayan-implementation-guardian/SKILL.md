---
name: ibn-hayan-implementation-guardian
description: >
  Project-specific execution and safety workflow for implementing, continuing,
  debugging, reviewing, or changing the Ibn Hayan Healthcare Operating System.
  Use this skill before any repository modification.
metadata:
  project: ibn-hayan-healthcare-os
  version: "1.0.0"
triggers:
  - implement
  - implementation
  - continue
  - continuation
  - debug
  - fix
  - build
  - feature
  - module
  - workflow
  - architecture
  - database
  - migration
  - deploy
  - UI
  - UX
  - تنفيذ
  - تطوير
  - متابعة
  - إصلاح
  - واجهة
  - قاعدة البيانات
---

# Ibn Hayan Implementation Guardian

Apply this workflow carefully before and during any repository-changing task.

## Authority and scope

- Treat the repository, Git history, `AGENTS.md`, `PROJECT_CONTINUITY.md`, and canonical project documentation as authoritative.
- Never use chat memory, previews, cached files, generated summaries, or an agent workspace snapshot as a backup.
- Confirm the exact target role, interface, module, workflow, and expected result before editing.
- Never confuse Platform Super Admin with Clinic Admin or any other role.
- If a material requirement remains ambiguous or canonical sources conflict, stop and report the conflict instead of guessing.

## Mandatory repository preflight

Before editing:

1. Identify the repository root and current working directory.
2. Verify the Git remote and required branch.
3. Run `git fetch origin`.
4. Inspect the current branch, Git status, staged/modified/deleted/untracked/ignored files, recent commits, and local/direct-remote/remote-tracking SHAs.
5. Determine whether the workspace is ahead, behind, or diverged.
6. Read `AGENTS.md`, `PROJECT_CONTINUITY.md`, and relevant canonical documentation.
7. Inspect existing changes before starting.
8. Stop before editing if the workspace is older than remote work, unexpectedly diverged, or contains unexplained changes.

## Protect all existing work

Preserve committed and uncommitted work.

Never perform these actions without explicit operator approval:

- `git reset --hard`
- `git clean`
- `git restore .`
- `git checkout -- .`
- force push
- branch deletion
- mass file deletion
- database reset
- migration reset
- `DROP`
- `TRUNCATE`
- production deployment
- production data modification

Do not overwrite newer remote work with an older workspace.
Create a protective checkpoint when necessary.
Do not expose, print, commit, or upload secrets.

## Inspect before implementation

- Diagnose root cause before fixing a bug.
- Inspect the current implementation and edit it in place unless a genuinely new component is required.
- Do not create duplicate screens, modules, services, schemas, migrations, or competing implementations.
- Preserve approved architecture, database contracts, tenant isolation, permissions, role boundaries, canonical designs, and working features.
- Keep changes limited to the requested task.
- Avoid unrelated refactoring, formatting, regeneration, dependency upgrades, and lockfile changes.

## Validation

Run all validation relevant to the task, including as applicable:

- type checking
- linting
- focused tests
- production build
- Prisma formatting, validation, generation, and migration checks
- authentication and authorization checks
- tenant-isolation checks
- browser console and network inspection
- responsive UI inspection
- RTL and LTR inspection
- manual verification of the affected workflow
- `git diff --check`
- final `git status`

Distinguish errors introduced by the task from pre-existing errors.
Never claim a validation passed unless it actually ran and passed.
Code written is not task completion.

## Durable continuity

After a coherent completed implementation task:

- Update `PROJECT_CONTINUITY.md`.
- Record repository, branch, verified pre-task commit, current state, completed work, files created/modified/deleted, validation, decisions, known bugs, unfinished work, immediate next step, and recovery information.
- Do not create recursive commits merely to place the current commit SHA inside the commit that contains the continuity file.
- The external completion report must provide the final exact SHA.

Do not modify `AGENTS.md` unless a durable repository-wide rule genuinely changed.

## Verified Git backup

After successful validation and only when the task authorizes repository writes:

1. Review all changed and untracked files.
2. Confirm no secrets, accidental deletions, unrelated changes, or unintended lockfile changes exist.
3. Stage only legitimate task files.
4. Create a descriptive commit.
5. Push only the current authorized branch.
6. Never force push.
7. Retrieve complete local, direct remote, and remote-tracking SHAs.
8. Confirm all three match exactly.

Never claim saved, backed up, or present on GitHub unless commit, push, and SHA verification all succeed.

For read-only investigation tasks, do not create unnecessary commits.

## Completion report

Report task result, root cause where applicable, repository and branch, files created/modified/deleted, validation, commit message, all three complete SHAs, SHA match result, push status, remaining risks, recommended next step, and explicit confirmation of what was not modified.

Never use vague claims such as “saved successfully” without verifiable Git evidence.
