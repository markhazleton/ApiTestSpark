# Branch Status Report

**Last validated**: 2026-09-23

## Summary

| Branch | Location | Status |
|---|---|---|
| `main` | local + `origin/main` | In sync |

Only one branch exists in this repository, locally or remotely: `main`.

## History

### 2026-09-23 (v2.1.0 release)

- `fix/deps-security-2026-09` — fully merged via PR #10 (2026-09-23); deleted local and remote.
- `0001-tauri-desktop-build` — **abandoned**. A Tauri desktop wrapper for the standalone SPA (spec only, no code, no PR). Decision: the feature will not move forward. Deleted local and remote without merging; the spec was not carried to `main`. Tip was `62d3e94`.
- Dependabot branches from PRs #8 and #9 had already been removed by GitHub.

### 2026-07-28

- `origin/001-oauth-token-config` — fully merged via PR #7 (2026-07-16); deleted.
- `origin/002-remote-openapi-config` — fully merged via PR #2 (2026-06-06); deleted.

## How to re-validate

```sh
git fetch --all --prune
git branch -vv                                  # local branches vs. their upstream
git branch -r --no-merged origin/main           # remote branches not yet merged
git rev-list --left-right --count main...origin/main   # 0 0 == fully in sync
gh pr list --state all --limit 20               # map branches to PRs
```
