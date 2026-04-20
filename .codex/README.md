# Codex Tooling — Hará Match

This directory mirrors the existing `.claude/` tooling so Codex sessions have the same commands, skills, agents, rules, and hooks without touching the Claude setup. Nothing here replaces `.claude/`; both folders should evolve together.

## Structure

```
.codex/
├── commands/              # Command definitions and helper scripts
├── skills/                # Auto-activating skills (step-by-step, Tailwind, etc.)
├── agents/                # Specialized agents (complexity watchdog, code reviewer, docs)
├── rules/                 # Path-scoped rules (TypeScript, Tailwind tokens, API routes)
├── hooks/                 # CLI hooks (file size, console.log, protected files)
├── settings.json          # Registers hooks for Codex CLI
└── README.md
```

Automation lives in `scripts/codex/` (e.g., `audit.mjs`, `pr-prep.mjs`). Invoke them directly from the repo root.

## Usage Notes
- Codex does not auto-register repo command docs from `.codex/commands/*/COMMAND.md`. Those files are workflow sources that must be routed through a skill.
- Session commands are routed through `tooling-registry`. Use `/start-session`, `start session`, `/end-session`, or `end session` in chat and the registry should load the matching command doc.
- Skills and command docs match the content in `.claude/`, just rewritten for Codex.
- Hooks run automatically after edits to flag file size and console.logs, and before edits to protect locked backend files.
- Keep both `.claude/` and `.codex/` updated whenever workflows change so either assistant can follow the same playbooks.
