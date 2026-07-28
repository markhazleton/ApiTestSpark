---
description: "Bold: Look at the repo's current state and recommend the single next bold.plan/bold.build/bold.ship command to run."
---

# bold-next

Resolve the effective prompt via Bold's three-tier resolution (user > team > source —
see `.bold/scripts/*/bold-which.*`):

1. `.bold-user/{your-git-user-name}/commands/next/default.md` (run `bold-which` to resolve the exact slug and path)
2. `bold-docs/overrides/commands/next/default.md`
3. `.bold/commands/next/default.md`

Read whichever resolves first and follow it as your instructions for this invocation,
including running its declared collector `.bold/scripts/{bash,powershell}/collect-next-context.{sh,ps1}` before anything else.