---
name: ibn-hayan-completion-git-proof
description: >
  Completion, pause, handoff, continuity, Git commit, push, and recovery-proof
  workflow for the Ibn Hayan Healthcare Operating System.
metadata:
  project: ibn-hayan-healthcare-os
  version: "1.0.0"
triggers:
  - complete
  - completed
  - finish
  - finished
  - done
  - commit
  - push
  - backup
  - save
  - stop
  - pause
  - sleep
  - close
  - handoff
  - recovery
  - اكمل
  - انتهى
  - حفظ
  - رفع
  - توقف
  - أغلق
  - استرجاع
---

# Ibn Hayan Completion and Git Proof

Apply this skill when completing a coherent task or preparing to pause, close, sleep, hand off, or continue later.

## Final validation

Before claiming completion:

- Re-run all validation relevant to the task.
- Distinguish new failures from pre-existing failures.
- Confirm the affected workflow manually where applicable.
- Run `git diff --check`.
- Inspect final `git status`.
- Never claim a task complete merely because code was written.

## Continuity

Update `PROJECT_CONTINUITY.md` with:

- repository and branch
- verified pre-task base commit
- current project state
- completed work
- files created, modified, and deleted
- validation results
- important decisions
- known bugs and unfinished work
- immediate next step
- recovery information

Do not create an infinite SHA recursion. The final commit SHA belongs in the external completion report.

## Commit and push proof

1. Review every changed and untracked file.
2. Confirm no secrets, accidental deletions, unrelated files, or unintended lockfile changes.
3. Stage only legitimate task files.
4. Create a descriptive commit.
5. Push only the authorized current branch.
6. Never force push.
7. Retrieve complete local, direct remote, and remote-tracking SHAs.
8. Confirm all three match exactly.

Do not say “saved,” “backed up,” or “on GitHub” unless all proof checks succeed.

## Pause and recovery

When the operator will pause or continue later:

- Ensure the workspace is clean or document every uncommitted file.
- Create a clearly named recovery tag only when explicitly requested or genuinely appropriate.
- Record the exact branch and verified remote commit.
- On resumption, fetch first and verify the workspace is not older than the verified remote commit before editing.

## Completion report

Report task result, root cause where applicable, repository and branch, files created/modified/deleted, validation, commit message, all three complete SHAs, SHA match result, push status, remaining risks, and recommended next step.

For investigation-only tasks that do not modify files, do not create unnecessary commits.
