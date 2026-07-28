#!/usr/bin/env bash
# Collector for bold.personalize (default and validate). Emits current
# .bold-user/{slug}/preferences.json contents (or the OS-inferred default
# when it's absent or shell is unset), the developer's identity, and
# project.json's repo block -- so both subcommands reason over the same
# facts, one acting on them, one just reporting them.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib/common.sh"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
docs_dir="$repo_root/bold-docs"
append_run_log "$repo_root" "personalize" "collect-personalize-context"

slug="$(bold_user_slug "$repo_root")"
prefs_path="$repo_root/.bold-user/$slug/preferences.json"

has_preferences_file=false
shell_value="null"
if [ -f "$prefs_path" ]; then
  has_preferences_file=true
  detected="$(grep -oE '"shell"[[:space:]]*:[[:space:]]*"[^"]*"' "$prefs_path" | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' | head -1)"
  [ -n "$detected" ] && shell_value="\"$(json_escape "$detected")\""
fi

os_default_shell="bash"
case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*) os_default_shell="pwsh" ;;
esac

repo_json="$(extract_repo_block_json "$docs_dir/project.json")"

printf '{"has_preferences_file":%s,"shell":%s,"os_default_shell":"%s","user":"%s","repo":%s}\n' \
  "$has_preferences_file" "$shell_value" "$os_default_shell" "$(json_escape "$slug")" "$repo_json"
