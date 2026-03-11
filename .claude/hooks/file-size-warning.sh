#!/bin/bash
# PostToolUse hook — warns when app/ and lib/ .tsx and .ts files exceed Hará size thresholds
# Thresholds: 300 (good) / 440 (warning) / 600 (must refactor)

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

lines=$(wc -l < "$abs_path" 2>/dev/null | tr -d ' ' || echo 0)

# Identify area
area="file"
if [[ "$rel_path" =~ ^app/r/ ]]; then
    area="recommendations file"
elif [[ "$rel_path" =~ ^app/api/ ]]; then
    area="API route"
elif [[ "$rel_path" =~ ^app/components/ ]]; then
    area="component"
elif [[ "$rel_path" =~ ^lib/ ]]; then
    area="utility"
fi

RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
name=$(basename "$file_path")

emit() {
    local color="$1" terminal_msg="$2" llm_msg="$3"
    echo -e "${color}${terminal_msg}${RESET}" >&2
    jq -n --arg msg "$llm_msg" '{"systemMessage": $msg}'
}

if   (( lines > 600 )); then
    emit "${RED}${BOLD}" \
        "🔴 MUST REFACTOR: ${name} is ${lines} lines (${area})" \
        "🔴 MUST REFACTOR: ${name} is ${lines} lines (${area}) — exceeds 600-line hard limit. Stop and propose a concrete extraction plan: identify hooks to extract to hooks/, sub-components to components/, and named constants to group at top. Name the new files."
elif (( lines > 440 )); then
    emit "${YELLOW}" \
        "🟡 SIZE WARNING: ${name} is ${lines} lines (${area})" \
        "🟡 SIZE WARNING: ${name} is ${lines} lines (${area}) — exceeds 440-line threshold. Suggest what logic, hooks, or components could be extracted before this file grows further."
elif (( lines > 300 )); then
    emit "${DIM}" \
        "📝 SIZE INFO: ${name} is ${lines} lines (${area})" \
        "📝 SIZE INFO: ${name} is ${lines} lines (${area}) — past the 300-line ideal. Note extraction opportunities if obvious."
fi

exit 0
