#!/bin/bash
# PreToolUse hook — blocks edits to production-locked backend files
# These files are tested, billing-critical, and require explicit user approval to modify

tool_info=$(cat)

tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty' 2>/dev/null)
file_path=$(echo "$tool_info" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Only check Edit and Write tools
if [[ ! "$tool_name" =~ ^(Edit|Write)$ ]] || [[ -z "$file_path" ]]; then
    exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Handle absolute and relative paths
if [[ "$file_path" = /* ]]; then
    rel_path="${file_path#$project_dir/}"
else
    rel_path="$file_path"
fi

# Protected files list — billing-critical and security infrastructure
protected=0
case "$rel_path" in
    app/api/events/route.ts)           protected=1 ;;
    app/api/admin/*)                   protected=1 ;;
    lib/attribution-tokens.ts)         protected=1 ;;
    lib/rate-limit.ts)                 protected=1 ;;
    lib/supabase-admin.ts)             protected=1 ;;
    lib/validation.ts)                 protected=1 ;;
    middleware.ts)                      protected=1 ;;
    .claude/settings.json)             protected=1 ;;
    .claude/hooks/*)                   protected=1 ;;
esac

if (( protected )); then
    jq -n --arg file "$rel_path" '{
        "decision": "block",
        "reason": ("🚨 BLOCKED: " + $file + " is a protected production file.\n\nThis file is billing-critical or security infrastructure. Modifying it could break event tracking, authentication, or rate limiting.\n\nIf the user explicitly asked to modify this file, ask for confirmation first:\n\"This is a protected production file. Are you sure you want to modify it?\"\n\nSee CLAUDE.md \"Don'\''t Touch\" section for the full list.")
    }'
    exit 0
fi

# Not protected — allow
exit 0
