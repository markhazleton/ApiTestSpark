---
name: "devspark.discover-constitution"
description: "Analyze existing codebase to discover implicit patterns and conventions, then guide user through crafting a constitution via interactive questioning."
---

## Prompt Resolution

Determine the current git user by running `git config user.name`.
Normalize to a folder-safe slug: lowercase, replace spaces with hyphens, strip non-alphanumeric/hyphen chars.

Read and execute the instructions from the **first file that exists**:
1. `.documentation/{git-user}/commands/devspark.discover-constitution.md` (personalized override)
2. `.documentation/commands/devspark.discover-constitution.md` (team customization)
3. `.devspark/defaults/commands/devspark.discover-constitution.md` (stock default)

## User Input

{{input}}

Pass the user input above to the resolved prompt.
