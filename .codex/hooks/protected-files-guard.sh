#!/bin/bash
# PreToolUse hook — blocks edits to locked backend files without explicit approval

tool_info=$(cat)

tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty' 2>/dev/null)
file_path=$(echo "$tool_info" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ ! "$tool_name" =~ ^(Edit|MultiEdit|Write)$ ]] || [[ -z "$file_path" ]]; then
    exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

if [[ "$file_path" = /* ]]; then
    rel_path="${file_path#$project_dir/}"
else
    rel_path="$file_path"
fi

locked=(
    "app/api/events/route.ts"
    "app/api/admin/"
    "lib/attribution-tokens.ts"
    "lib/rate-limit.ts"
    "lib/supabase-admin.ts"
    "middleware.ts"
)

for entry in "${locked[@]}"; do
    if [[ "$entry" == app/api/admin/ ]]; then
        if [[ "$rel_path" == app/api/admin/* ]]; then
            message="🚫 Protected file: $rel_path is under app/api/admin/**. Ask for approval before editing."
            echo "$message" >&2
            jq -n --arg msg "$message" '{"systemMessage": $msg, "error": true}'
            exit 1
        fi
    elif [[ "$rel_path" == "$entry" ]]; then
        message="🚫 Protected file: $rel_path is locked. Ask for approval before editing."
        echo "$message" >&2
        jq -n --arg msg "$message" '{"systemMessage": $msg, "error": true}'
        exit 1
    fi

done

exit 0
