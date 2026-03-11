# Claude Code — Hará Match Tooling Reference

Everything Claude Code has available in this project. If something is missing here, it doesn't exist.

---

## Slash Commands

| Command | What it does |
|---------|-------------|
| `/start-session` | Load plan file, get context, brief on next steps |
| `/end-session` | Update plan file with progress and next steps |
| `/pr-prep "changes"` | Build + lint + test + generate PR description |
| `/audit [path]` | File size + complexity check against hara thresholds |
| `/bug-hunt` | Structured bug investigation workflow |
| `/feature-start` | Feature kickoff — find reuse, plan, scaffold |
| `/test-create` | Scaffold Vitest/Playwright tests |

---

## Agents

| Agent | Trigger | What it does |
|-------|---------|-------------|
| `complexity-watchdog` | `/audit` or after large code changes | File size + function length audit (440/50 thresholds) |
| `code-reviewer` | `/pr-prep` or PR review | Type safety, Tailwind tokens, Spanish copy, no console.log |
| `documentation-architect` | After significant changes | Creates/updates documentation |

---

## Skills (Auto-Activating)

Skills load automatically when Claude detects matching keywords. No action needed.

| Skill | Triggers on | What it does |
|-------|-------------|-------------|
| `step-by-step-execution` | "fix", "build", "implement", "refactor" | Structured planning → incremental execution → validation |
| `code-reuse-enforcer` | "create component", "add feature", "build" | USE → IMPROVE → ADD check before new code |
| `commit-message-helper` | Committing | Conventional commit format for hara |
| `doc-sync-enforcer` | Committing/pushing | Ensures docs match code changes |
| `tailwind-design-system` | UI work, styling, components | Hara's design tokens, liquid-glass, animations |
| `supabase-patterns` | Database, API, auth, events | Service-role pattern, RLS, attribution tokens |
| `accessibility-patterns` | Accessibility, ARIA, a11y | Focus traps, screen reader, WCAG patterns |

---

## Path-Scoped Rules (Auto-Loaded)

Rules load automatically when Claude touches files matching the glob.

| Rule | Glob | What it provides |
|------|------|-----------------|
| `typescript` | `app/**/*.tsx, app/**/*.ts, lib/**/*.ts` | No `any`, proper type guards, strict types |
| `api-routes` | `app/api/**/*` | Supabase service-role patterns, rate limiting, locked file warnings |
| `tailwind-tokens` | `app/**/*.tsx, app/globals.css` | Use design tokens, no hardcoded px/hex/colors |
| `component-standards` | `app/**/*.tsx` | ≤440 lines, functions ≤50, Spanish copy, liquid-glass patterns |

---

## Hooks (Automatic)

Hooks fire on Claude Code events. Users don't interact with them directly.

| Hook | Event | What it does |
|------|-------|-------------|
| `file-size-warning` | PostToolUse (Edit/Write) | Warns when files exceed 440 lines |
| `protected-files-guard` | PreToolUse (Edit/Write) | Blocks edits to locked backend files |
| `console-log-detector` | PostToolUse (Edit/Write) | Detects `console.log` — use `monitoring.ts` instead |

---

## Implementation Status

All tooling is complete and operational.

| Category | Status | Count |
|----------|--------|-------|
| CLAUDE.md | ✅ | Project guide |
| Rules | ✅ | 4 path-scoped rules |
| Skills | ✅ | 7 skills (4 core + 3 hara-specific) |
| Commands | ✅ | 5 slash commands |
| Agents | ✅ | 3 specialized agents |
| Hooks | ✅ | 3 automatic hooks |
| TODO/DONE | ✅ | Consolidated task tracking |
