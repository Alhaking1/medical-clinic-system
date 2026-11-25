# Enterprise Team Workflow & Engineering Guidelines

This document outlines the branching strategy, daily development routine, pull request (PR) rules, conflict resolution protocols, and rollback strategies for all engineers working on the **Medical Clinic System**.

---

## 1. Branching Strategy

Our core production branch is `main`. Direct pushes to `main` are strictly forbidden and blocked by GitHub branch protection rules.

### Branch Categories:
- **Feature Branches:** `feature/[feature-name]-[developer-name]`  
  *Example:* `feature/patient-booking-ui-ahmed`
- **Bug Fix Branches:** `bugfix/[issue-summary]-[developer-name]`  
  *Example:* `bugfix/queue-counter-sync-khalid`
- **Hotfix Branches:** `hotfix/[critical-fix]-[developer-name]`  
  *Example:* `hotfix/auth-token-crash-admin`

---

## 2. Daily Developer Routine

Follow this cycle every day before starting and finishing work:

```bash
# 1. Update your local main branch
git checkout main
git pull origin main

# 2. Create or switch to your feature branch
git checkout -b feature/patient-booking-ui-ahmed

# 3. Work on assigned modules only (do not touch unrelated files)
# Run tests and format code prior to committing:
# - In backend/: npm test
# - In apps/: ensure Gradle builds cleanly

# 4. Stage and commit with structured semantic messages
git add <modified-files>
git commit -m "feat(patient-app): implement real-time queue badge [by Ahmed]"

# 5. Keep branch updated with main before pushing
git pull origin main --rebase

# 6. Push to remote and open a Pull Request
git push -u origin feature/patient-booking-ui-ahmed
```

---

## 3. Pull Request (PR) Rules & Code Quality

1. **Mandatory Reviews:** Every PR requires at least **1 approved review** from the Tech Lead or a peer before merging.
2. **Automated CI Checks:** The PR must pass all automated CI tests (`Backend Checks`, `Android Checks`). If CI fails, merging is automatically blocked.
3. **No Stale Approvals:** Any new commit pushed to the branch automatically dismisses previous approvals to guarantee review of the latest code.
4. **Scope Isolation:** Keep PRs atomic and focused. Do not mix backend changes with Android layout refactoring in the same PR.

---

## 4. Conflict Resolution Protocol

When `git pull origin main --rebase` reports conflicts:
1. Open the project in **VS Code** or **Android Studio**.
2. Navigate to conflicted files highlighted in red.
3. Review options: `Accept Current Change`, `Accept Incoming Change`, or `Accept Both Changes`.
4. Run tests to ensure resolution did not break code:
   ```bash
   git add <resolved-files>
   git rebase --continue
   ```
5. Never run `git push --force` on shared branches. Use `--force-with-lease` only on your personal feature branch if rebase demands it.

---

## 5. Rollback & Incident Recovery Strategy

If a merged PR introduces unexpected regressions into `main`:
1. **Never reset `main` directly.**
2. Revert the bad commit cleanly via Git:
   ```bash
   git checkout main
   git pull origin main
   git revert -m 1 <MERGE_COMMIT_SHA>
   git push origin main
   ```
3. This creates a clean inverse commit preserving Git history while instantly restoring service stability.
