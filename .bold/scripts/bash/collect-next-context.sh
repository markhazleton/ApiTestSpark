#!/usr/bin/env bash
# Collector for bold.next. Emits a cross-phase snapshot -- entry-path
# presence, branch/base position, the active-feature inventory, and the
# same gate/task/staleness facts bold.plan, bold.build, and bold.ship each
# already compute in isolation -- so bold.next can point at a single next
# command without re-deriving state its siblings already know how to get.
# Deliberately never hard-gates (no exit 1 anywhere below): bold.next only
# reports what's true, it never blocks or advances a work item itself --
# that stays each verb's own job.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib/common.sh"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
docs_dir="$repo_root/bold-docs"
cd "$repo_root"
append_run_log "$repo_root" "next" "collect-next-context"

has_bold_docs=false
[ -f "$docs_dir/backbone.md" ] && has_bold_docs=true

bold_sync_git_remote "$repo_root"
collect_git_status_vars "$repo_root"
current_branch="$GIT_STATUS_CURRENT_BRANCH"
base_branch="$GIT_STATUS_BASE_BRANCH"
git_status_json="$(collect_git_status_json_from_vars)"

active_features="[]"
backbone_principles="[]"
stale_references="[]"
has_unchecked_tasks=false
gate_problems=()
gate_order_problems=()
changed_files=()
repo_json="null"

if [ "$has_bold_docs" = true ]; then
  active_features="$(collect_active_features "$docs_dir")"
  backbone_principles="$(collect_backbone_principles "$docs_dir")"
  stale_references="$(collect_stale_references "$repo_root" "$docs_dir")"

  # Feature 0008, AC7: pass project.json's repo block through the same
  # way collect-triage-context does -- null when the file or the block
  # is absent, never an error.
  repo_json="$(extract_repo_block_json "$docs_dir/project.json")"

  spec="$docs_dir/features/$current_branch/spec.md"
  if [ -n "$current_branch" ] && [ "$current_branch" != "unknown" ] && [ -f "$spec" ]; then
    grep -qE '^[[:space:]]*-[[:space:]]*\[ \]' "$spec" 2>/dev/null && has_unchecked_tasks=true
    feature_tier="$(sed -n 's/^\*\*Tier\*\*: //p' "$spec" | head -1)"
    if [ "$feature_tier" = "Feature" ]; then
      mapfile -t gate_problems < <(check_feature_gates_clear "$docs_dir" "$current_branch")
      [ "${#gate_problems[@]}" -gt 0 ] && [ -z "${gate_problems[0]}" ] && gate_problems=()
      mapfile -t gate_order_problems < <(check_feature_gates_predate_impl "$docs_dir" "$current_branch")
      [ "${#gate_order_problems[@]}" -gt 0 ] && [ -z "${gate_order_problems[0]}" ] && gate_order_problems=()
    fi
  fi

  if [ -n "$current_branch" ] && [ "$current_branch" != "$base_branch" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && changed_files+=("$f")
    done < <(git diff --name-only "$GIT_STATUS_COMPARED_AGAINST...HEAD" 2>/dev/null; printf '\n')
  fi
fi

has_uncommitted_changes=false
[ -n "$(git status --porcelain 2>/dev/null)" ] && has_uncommitted_changes=true

user_slug="$(bold_user_slug "$repo_root")"

printf '{"has_bold_docs":%s,"git_status":%s,"active_features":%s,"has_unchecked_tasks":%s,"gate_problems":%s,"gate_order_problems":%s,"changed_files":%s,"has_uncommitted_changes":%s,"backbone_principles":%s,"stale_references":%s,"repo":%s,"user":"%s"}\n' \
  "$has_bold_docs" "$git_status_json" "$active_features" "$has_unchecked_tasks" \
  "$(json_array "${gate_problems[@]}")" "$(json_array "${gate_order_problems[@]}")" \
  "$(json_array "${changed_files[@]}")" "$has_uncommitted_changes" "$backbone_principles" "$stale_references" "$repo_json" "$(json_escape "$user_slug")"
