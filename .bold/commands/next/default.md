---
command: bold.next
subcommand: default
description: Look at the repo's current state and recommend the single next bold.plan/bold.build/bold.ship command to run.
collector: collect-next-context
args: []
---

# bold.next

The methodology doesn't require memorizing which of `bold.plan` / `bold.build` / `bold.ship` (and which subcommand) applies right now — this command reads the same ground truth those three already compute and states the one next step. It is a router, not a fourth step in the methodology: it never triages, builds, or ships anything itself.

## Definition of Done

Done when exactly one next command is recommended, with the specific collector fact that drove it named inline — not a menu of possibilities, and not a restatement of everything `bold.build status` or `bold.ship review` would already report in full.

## Determine the next command

Work through these in order; stop at the first one that applies.

1. **Not installed.** `has_bold_docs` is `false` — nothing below applies yet. Recommend `bold.install` (or `bold.plan init` if Bold's payload is already on disk but never initialized).
2. **Base has moved.** `git_status.proceed` is `false` — state `git_status.message` and recommend syncing before anything else. Every check below assumes branch position is trustworthy, so don't reason past this one.
3. **Repo policy tension.** `git_status.current_branch` equals `git_status.base_branch`, and either `has_uncommitted_changes` is `true` or `git_status.commits_ahead` is greater than zero, and `repo.policies.direct_push_to_base_allowed` is `false`: state the tension before whatever recommendation step 4 below produces — this repo doesn't allow direct pushes to the base branch, so Patch tier's "stay on this branch, no PR" default may not actually fit here. Advisory only: this never changes the recommendation itself, it just names the caveat first. Skip silently when `repo` is `null` (never backfilled yet) or the policy is `true`.
4. **Nothing in flight on this branch.** No entry in `active_features` has `id` equal to `git_status.current_branch`. Recommend `bold.plan` to triage new work. If `active_features` has entries for *other* branches, name them as context only ("also in flight: `{id}` on its own branch") — they don't change the recommendation.
5. **A feature matches this branch.** Find that entry (by `id == git_status.current_branch`) and read its `tier` and `status`:
   - `tier` is `Feature` and `gate_problems` is non-empty: recommend the specific `bold.plan` subcommand(s) implied by each listed problem (`analyze`, `critic`, or `checklist`) before `bold.build` can start.
   - `gate_problems` is empty but `gate_order_problems` has entries other than `no-baseline`: the gate files exist but look backfilled after implementation started. Recommend redoing them for real — say which file and why, don't accept them as satisfying step 4's first bullet.
   - `status` is not `Complete`, or `has_unchecked_tasks` is `true`: work is still in progress. Recommend continuing `bold.build`, and point at `bold.build status` for the full gate/test detail rather than repeating it here.
   - `status` is `Complete`, `has_unchecked_tasks` is `false`, and (tier isn't `Feature`, or both gate fields above are clear): ready to ship.
     - `has_uncommitted_changes` is `true`: recommend committing first, then `bold.ship`.
     - `git_status.commits_ahead` is `0`: flag this before recommending `bold.ship` — a spec marked Complete with nothing committed ahead of `git_status.base_branch` is worth double-checking, not assuming is correct.
     - Otherwise: recommend `bold.ship` (or `bold.ship review` if the human says a PR is already open against this branch — `bold.next` has no way to know that on its own).

## Report

State the recommendation first, in one sentence, naming the collector fact that drove it. Then, only if present:
- Any `backbone_principles` entry whose `enforced` status looks violated by what's on disk right now — read `bold-docs/backbone.md` for the principle text; the collector only reports status counts, not violations.
- `stale_references`, mentioned once as available cleanup via `bold.ship harvest` — never the primary recommendation on its own.

## Boundary

Read-only. Never create a branch, write a spec or gate file, commit, or open a PR from this command — every action it recommends is still performed by running the recommended command, not by `bold.next` itself.
