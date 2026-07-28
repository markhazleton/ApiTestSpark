---
command: bold.personalize
subcommand: validate
description: Report current personal preferences, developer identity, and repo facts — read-only.
collector: collect-personalize-context
args: []
---

# bold.personalize validate

Reuses `collect-personalize-context` — the same facts `bold.personalize` (default) uses to decide what to show, formatted as a report instead of acted on.

## Definition of Done

Done when all three fields below are stated from the collector's current output — not when something changed, since nothing here should change anything.

## Report

- **Preferences** — `shell` if set; otherwise `os_default_shell`, labeled plainly as the OS-inferred default, not an explicit choice
- **Identity** — `user`, freshly derived every run, never stored
- **Repo facts** — the `repo` block from `project.json`, or a note that it hasn't been backfilled yet if it's `null`

## Boundary

Read-only. Never write `preferences.json`, `project.json`, or anything else from this command — that's `bold.personalize` (default)'s job.
