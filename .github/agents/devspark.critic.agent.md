---
name: "devspark.critic"
description: "Perform adversarial risk analysis identifying technical flaws, implementation hazards, and failure modes across spec.md, plan.md, and tasks.md."
---

## Prompt Resolution

Determine the current git user by running `git config user.name`.
Normalize to a folder-safe slug: lowercase, replace spaces with hyphens, strip non-alphanumeric/hyphen chars.

Read and execute the instructions from the **first file that exists**:
1. `.documentation/{git-user}/commands/devspark.critic.md` (personalized override)
2. `.documentation/commands/devspark.critic.md` (team customization)
3. `.devspark/defaults/commands/devspark.critic.md` (stock default)

## User Input

{{input}}

Pass the user input above to the resolved prompt.
