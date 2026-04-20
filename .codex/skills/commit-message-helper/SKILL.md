---
name: commit-message-helper
description: Helps write conventional commit messages following Hará Match standards. Triggers on "commit", "ready to commit", "push".
---

# Commit Message Helper

## Conventional Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Required: Type

| Type | When to use |
|------|------------|
| `feat` | New feature or user-facing change |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring (no behavior change) |
| `style` | Formatting, whitespace (no code change) |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependencies |
| `perf` | Performance improvement |
| `revert` | Revert previous commit |

### Optional: Scope

Use the area of the codebase affected:

| Scope | Files |
|-------|-------|
| `ui` | `app/components/`, `app/globals.css` |
| `recommendations` | `app/r/[tracking_code]/` |
| `registration` | `app/profesionales/` |
| `profile` | `app/p/[slug]/` |
| `admin` | `app/admin/` |
| `api` | `app/api/` |
| `lib` | `lib/` |
| `tests` | `__tests__/` |

### Rules

1. **Imperative mood**: "add feature" not "added feature" or "adds feature"
2. **Lowercase**: Start description with lowercase
3. **No period**: Don't end the description with a period
4. **≤ 72 characters**: Keep the first line short
5. **Body for context**: Use the body to explain _why_, not _what_

### Examples

```
feat(recommendations): add swipe hint animation on first visit

fix(registration): validate WhatsApp number requires + prefix

refactor(ui): extract CardSkeleton into separate component

docs: update TODO.md with email feature requirements

chore: add test artifacts to .gitignore

perf(recommendations): lazy load BottomSheet component
```

### Multi-line Example

```
feat(registration): add email confirmation on professional signup

Send confirmation email via Resend after successful DB insert.
Email includes review timeline and contact info.
Failures are logged but don't block registration.

Closes #12
```
