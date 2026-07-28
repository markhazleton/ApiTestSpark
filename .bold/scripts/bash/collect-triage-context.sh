#!/usr/bin/env bash
# Collector for bold.plan (default/triage). Emits deterministic JSON facts —
# system doc inventory, active feature tiers/status, backbone principle
# status, and the project genome — so the triage prompt reasons over
# structured ground truth instead of re-deriving it from prose.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib/common.sh"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
docs_dir="$repo_root/bold-docs"
append_run_log "$repo_root" "plan" "collect-triage-context"

bold_sync_git_remote "$repo_root"

system_docs="$(collect_system_docs "$repo_root" "$docs_dir")"
active_features="$(collect_active_features "$docs_dir")"
backbone_principles="$(collect_backbone_principles "$docs_dir")"
stale_references="$(collect_stale_references "$repo_root" "$docs_dir")"

mapfile -t known_feature_ids < <(collect_known_feature_ids "$repo_root" "$docs_dir")
next_feature_number_value="$(printf '%s\n' "${known_feature_ids[@]}" | next_feature_number)"
known_feature_ids_json="$(json_array "${known_feature_ids[@]}")"

git_status="$(collect_git_status "$repo_root")"

genome="null"
genome_file="$docs_dir/project.json"
if [ -f "$genome_file" ]; then
  genome="$(cat "$genome_file")"
fi

# Feature 0008, AC1: project.json's repo block, once it exists, rides
# along in $genome above with no code change needed here. What IS new:
# detecting candidate values when the block is missing or incomplete, so
# plan/default.md's backfill/correction step has something to reason over
# instead of re-deriving detection itself. Never touches `policies` -- no
# auto-detection path exists for that field. No JSON parser in this repo's
# bash collectors, so this checks for genuine non-null string values by
# pattern rather than real structural parsing -- consistent with how
# spec.md's own Tier/Status fields are read elsewhere in this codebase.
detected_repo_facts="null"
repo_incomplete=true
if [ -f "$genome_file" ] && \
   grep -q '"repo"' "$genome_file" && \
   grep -qE '"platform"[[:space:]]*:[[:space:]]*"[^"]+"' "$genome_file" && \
   grep -qE '"organization"[[:space:]]*:[[:space:]]*"[^"]+"' "$genome_file" && \
   grep -qE '"repository"[[:space:]]*:[[:space:]]*"[^"]+"' "$genome_file"; then
  repo_incomplete=false
fi
if [ "$repo_incomplete" = true ]; then
  detected_repo_facts="$(get_repo_facts_from_remote "$repo_root")"
fi

user_slug="$(bold_user_slug "$repo_root")"

printf '{"system_docs":%s,"active_features":%s,"backbone_principles":%s,"stale_references":%s,"known_feature_ids":%s,"next_feature_number":"%s","git_status":%s,"genome":%s,"detected_repo_facts":%s,"user":"%s"}\n' \
  "$system_docs" "$active_features" "$backbone_principles" "$stale_references" "$known_feature_ids_json" "$next_feature_number_value" "$git_status" "$genome" "$detected_repo_facts" "$(json_escape "$user_slug")"
