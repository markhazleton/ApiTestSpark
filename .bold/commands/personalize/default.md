---
command: bold.personalize
subcommand: default
description: Set this developer's personal preferences in .bold-user/{slug}/preferences.json.
collector: collect-personalize-context
args: []
---

# bold.personalize

The primary, documented way a developer sets personal preferences — currently just `shell`, the dialect used when a command has to pick between a PowerShell and a bash script. Hand-editing `.bold-user/{slug}/preferences.json` directly still works (it's plain JSON), but this is the expected path.

## Definition of Done

Done when `.bold-user/{slug}/preferences.json` reflects the developer's confirmed choice, or nothing changed because the current value was kept. Not done if a value was written without the human confirming it first.

## Update

Show the current `shell` value from the collector — or `os_default_shell`, labeled as the OS-inferred default rather than an explicit choice, when `shell` is unset or the file doesn't exist yet — and ask whether to keep it or change it. Never a blank-slate re-prompt; the human is confirming or changing one known value, not answering from scratch.

If it changes: create `.bold-user/{slug}/` first if it doesn't exist, then read the file's current contents (if any), update only `shell`, and write back the full merged object. Any other field a human hand-added stays untouched — never a blind rewrite of the whole file.

## Boundary

Only writes `.bold-user/{slug}/preferences.json`. Never touches `project.json`'s `repo` block — populating that is `bold.plan`'s job, not this command's, even though both are configuration data. Never writes anything without the human confirming the value first.
