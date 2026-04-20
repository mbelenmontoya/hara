#!/bin/bash
# PostToolUse hook — detects new console.log/warn/info in app/ and lib/ files
# Uses git diff to only flag newly added lines, not pre-existing ones

tool_info=$(cat)

tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty' 2>/dev/null)
file_path=$(echo "$tool_info" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only run on Edit, MultiEdit, Write
if [[ ! "$tool_name" =~ ^(Edit|MultiEdit|Write)$ ]] || [[ -z "$file_path" ]]; then
    exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Handle absolute and relative paths
if [[ "$file_path" = /* ]]; then
    abs_path="$file_path"
    rel_path="${file_path#$project_dir/}"
else
    rel_path="$file_path"
    abs_path="$project_dir/$file_path"
fi

# Only check .tsx and .ts files under app/ and lib/
if [[ ! "$rel_path" =~ ^(app|lib)/.*\.(tsx?|ts)$ ]]; then
    exit 0
fi

# Skip test files
if [[ "$rel_path" =~ \.(test|spec)\.(ts|tsx)$ ]]; then
    exit 0
fi

if [[ ! -f "$abs_path" ]]; then
    exit 0
fi

# Check if tracked by git
is_tracked=$(git -C "$project_dir" ls-files --error-unmatch "$rel_path" 2>/dev/null && echo "yes" || echo "no")

if [[ "$is_tracked" == "yes" ]]; then
    # Only flag lines added in this edit
    new_logs=$(git -C "$project_dir" diff HEAD -- "$rel_path" 2>/dev/null \
        | grep '^+' | grep -v '^+++' \
        | grep -E 'console\.(log|warn|info)\(' \
        | wc -l | tr -d ' ')
else
    # New file: flag any console.log in the whole file
    new_logs=$(grep -cE 'console\.(log|warn|info)\(' "$abs_path" 2>/dev/null || echo 0)
fi

if (( new_logs == 0 )); then
    exit 0
fi

RED=$'\033[0;31m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
name=$(basename "$file_path")

echo -e "${RED}${BOLD}🚫 CONSOLE.LOG DETECTED: ${name} has ${new_logs} new console.log/warn/info call(s).${RESET}" >&2

jq -n --arg msg "🚫 CONSOLE.LOG DETECTED: ${name} has ${new_logs} new console.log/warn/info call(s).

Hará uses lib/monitoring.ts for error logging, not console.log. You MUST:

1. REPLACE console.log/warn/info with the monitoring utility:

   // ❌ Not allowed:
   console.log('data:', data)

   // ✅ Use this instead:
   import { logError } from '@/lib/monitoring'
   logError('descriptive message', error)

2. console.error() IS allowed for critical catch blocks.

Fix this before finishing your response." \
'{"systemMessage": $msg}'

exit 0
