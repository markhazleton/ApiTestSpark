---
description: "Bold: Report current personal preferences, developer identity, and repo facts — read-only."
---

# bold-personalize-validate

Resolve the effective prompt via Bold's three-tier resolution (user > team > source —
see `.bold/scripts/*/bold-which.*`):

1. `.bold-user/{your-git-user-name}/commands/personalize/validate.md` (run `bold-which` to resolve the exact slug and path)
2. `bold-docs/overrides/commands/personalize/validate.md`
3. `.bold/commands/personalize/validate.md`

Read whichever resolves first and follow it as your instructions for this invocation,
including running its declared collector `.bold/scripts/{bash,powershell}/collect-personalize-context.{sh,ps1}` before anything else.