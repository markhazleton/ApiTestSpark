# Branch Status Report

**Last validated**: 2026-07-28

## Summary

| Branch | Location | Status |
|---|---|---|
| `main` | local + `origin/main` | In sync — local SHA matches `origin/main` exactly (verified via `git rev-list --left-right --count` and an independent GitHub API check of `origin/main`'s actual ref, bypassing local fetch cache) |

Only one branch exists in this repository, locally or remotely: `main`.

## History

As of this validation:

- **Current SHA**: `ffe2528a1350ebce2fb41913589812096e0e7fc6` ("Migrate from DevSpark to Bold framework")
- Two stale remote feature branches were found and removed:
  - `origin/001-oauth-token-config` — fully merged into `main` via PR #7 (merged 2026-07-16); no local counterpart existed
  - `origin/002-remote-openapi-config` — fully merged into `main` via PR #2 (merged 2026-06-06); no local counterpart existed
  - Both deleted from `origin` after confirming full merge (`git merge-base --is-ancestor` + `gh pr list --state all`)

## How to re-validate

```sh
git fetch --all --prune
git branch -vv                                  # local branches vs. their upstream
git rev-list --left-right --count main...origin/main   # 0 0 == fully in sync
gh api repos/markhazleton/ApiTestSpark/git/refs/heads/main --jq '.object.sha'  # ground truth, bypasses local cache
```

A merged remote branch is safe to delete once `git merge-base --is-ancestor <branch> main` succeeds and (if applicable) its PR shows `MERGED` via `gh pr list --state all --search "head:<branch>"`.
