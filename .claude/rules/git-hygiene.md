# Git Hygiene

## ⛔ Zero Untracked Files Policy

Every file that exists in the working tree must be either **committed** or **listed in `.gitignore`**. Untracked files (`??` in `git status`) are forbidden — they are invisible to Vercel and any other deployment environment and cause builds to fail when committed code imports them.

### After Any Code Change

Before marking work complete, run `git status --short`. If `??` lines appear:

1. **Commit them** — if the file is needed by the app (component, hook, util, migration, config).
2. **Add to `.gitignore`** — if the file must never be deployed (local env overrides, personal notes, generated artifacts).
3. **Delete them** — if the file was created by mistake and is no longer needed.

**There is no acceptable fourth option.** Do not leave untracked files in the working tree.

### When Creating New Files

Any time a new file is created:

1. If it is imported or referenced by any other committed file → it **must** be staged in the same logical batch of changes.
2. If it is a local-only file (e.g. `.env.local`, scratch notes) → add it to `.gitignore` immediately.

### Deployment Rule

Vercel (and CI) build from git history only. A file that exists only on disk is invisible to deployments. A committed file that imports an untracked file will break every build until the dependency is committed.

## Pre-Completion Checklist

Before any commit, push, or "done" claim:

- [ ] `git status --short` shows zero `??` lines
- [ ] All new files referenced by committed code are staged
- [ ] Purely local files are in `.gitignore`
