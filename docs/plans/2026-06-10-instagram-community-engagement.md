# Instagram Community Engagement Skill Implementation Plan

Created: 2026-06-10
Author: belu.montoya@dialpad.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** A Claude skill (`/ig-engage`) that runs as a continuous conversational session — navigating Instagram hashtag pages via Chrome DevTools MCP, reading post captions, generating contextual Argentine Spanish comments with Claude, getting per-comment approval (Y/S/Q), posting approved comments at human pace, and stopping automatically at the daily limit or on user command.

## Out of Scope

- Likes, follows, unfollows, DMs, Story interactions — comment-only by design
- Scheduled/cron runs — the skill is manually started by the user
- Analytics beyond the local log file
- Any comment that promotes or mentions Hara Vital's account
- Multi-account support

## Approach

**Chosen:** Greenfield Claude skill (`ig-engage`) + JSON config/log files in `scripts/`
**Why:** The Chrome DevTools MCP provides all browser interaction primitives needed; a SKILL.md file gives Claude step-by-step instructions for the loop; JSON files in `scripts/` (an existing directory) keep config and state co-located with other project scripts without polluting `app/` or `lib/`.

## Context for Implementer

The skill is markdown instructions that Claude follows during a live session — not executable code. Chrome DevTools MCP requires Chrome to be running with the Instagram tab already open and logged in; the skill verifies this at startup via `list_pages`. During the interval wait step the skill runs a Bash `sleep` command, which blocks the Claude Code session for the configured duration — this is intentional. The user can press Ctrl+C in their terminal to interrupt the sleep and end the session early.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Instagram DOM changes break caption/comment selectors | Medium | High | Skill uses `take_snapshot` (a11y tree, more stable than CSS classes) as primary selector strategy, with `evaluate_script` as fallback. If selectors break, skill logs the failure and skips the post rather than crashing. |
| User hits daily limit without realising | Low | Medium | Warning banner at `warning_threshold` (default 25), hard stop at `daily_limit` (default 50), both values visible in startup summary. |

## Progress Tracking

- [x] Task 1: Config + log JSON schema files
- [x] Task 2: ig-engage skill SKILL.md

## Implementation Tasks

---

### Task 1: Config and log JSON schema files

**Objective:** Create two JSON files in `scripts/` — `instagram-engage.config.json` (user-editable settings: hashtag list, interval range, daily limit, warning threshold) and `instagram-engage.log.json` (daily session state: count of comments posted today, list of visited post URLs for dedup). These files are the only state boundary between skill invocations.

**Files:**

- Create: `scripts/instagram-engage.config.json`
- Create: `scripts/instagram-engage.log.json`

**Key Decisions / Notes:**

- Config fields: `hashtags` (string array), `min_interval_min` (int, default 12), `max_interval_min` (int, default 60), `daily_limit` (int, default 50), `warning_threshold` (int, default 25)
- Log structure: top-level `sessions` array; each entry has `date` (YYYY-MM-DD), `daily_count` (int), `comments` (array of `{post_url, hashtag, comment_text, posted_at, skipped}`)
- The skill reads today's session entry by matching `date` to current date; if none exists it starts a fresh entry
- Hashtags in config are plain strings without `#` or URL encoding — the skill handles URL encoding on navigation (`encodeURIComponent`)
- Example hashtags for config (user replaces with their actual targets): `["reiki", "bienestarholistico", "terapiasalternativas", "meditacion", "saludmental"]`

**Definition of Done:**

- [ ] `scripts/instagram-engage.config.json` exists and is valid JSON matching the schema above
- [ ] `scripts/instagram-engage.log.json` exists with `{"sessions": []}` as initial state
- [ ] Both files are listed in `.gitignore` (log file contains session history; config may contain personal hashtag strategy — neither should be committed)
- [ ] Verify: `node -e "require('./scripts/instagram-engage.config.json'); require('./scripts/instagram-engage.log.json'); console.log('OK')"` exits 0

---

### Task 2: ig-engage skill SKILL.md

**Objective:** Create `.claude/skills/ig-engage/SKILL.md` — the full skill that Claude Code executes when the user invokes `/ig-engage`. The skill runs a continuous engagement loop: reads config, validates Chrome/Instagram state, then repeatedly picks a post from a configured hashtag, reads its caption, generates a contextual comment, asks for user approval, posts or skips, waits a randomized interval, and repeats until the daily limit or user quit.

**Files:**

- Create: `.claude/skills/ig-engage/SKILL.md`

**Key Decisions / Notes:**

- Skill frontmatter: `name: ig-engage`, `description: "Hara Vital Instagram community engagement — continuous session that comments on hashtag posts at human pace"`, `trigger: "ig-engage, instagram engage, instagram community"`
- **Startup sequence** (runs once per invocation):
  1. Read `scripts/instagram-engage.config.json` with `Read` tool
  2. `list_pages` to verify an Instagram tab exists; if not, print instructions and wait for user to open it then respond
  3. Read `scripts/instagram-engage.log.json` with `Read` tool; find today's session entry (match `date`); if none, initialize `daily_count = 0` and `visited_posts = []`
  4. Print startup banner: config summary, daily count so far, hashtags in rotation
- **Loop anchor** — the skill must mark the loop top with `⛔ LOOP ANCHOR — return here after every cycle`
- **Post selection within a cycle**:
  1. Pick next hashtag round-robin (track current index in-session)
  2. `navigate_page` to `https://www.instagram.com/explore/tags/<encodeURIComponent(hashtag)>/`
  3. `wait_for` text that confirms the page loaded (e.g., the hashtag name in the heading)
  4. `take_snapshot` to get the a11y tree; extract `/p/` links from the snapshot text
  5. Separate links into "recent" pool (first items listed, which Instagram shows in chronological order) and "top" pool (items highlighted at the top of the page)
  6. Filter out any URL already in `visited_posts`
  7. Pick one URL: bias toward recent (roughly 3 out of every 5 cycles picks recent, 2 pick top — track with a simple counter mod 5)
  8. If no unvisited posts remain on this hashtag page, move to the next hashtag
- **Caption extraction**:
  1. `navigate_page` to the post URL
  2. `wait_for` page load
  3. `take_snapshot` — the a11y tree will include the caption text as a block of text following the username
  4. If caption is not clear from snapshot: `evaluate_script` with `() => { const spans = document.querySelectorAll('article span'); return Array.from(spans).map(s => s.innerText).filter(t => t.length > 30).join(' '); }` to extract longer text blocks
  5. Truncate to first 400 characters for the generation prompt (longer captions are padded into prompt)
- **Comment generation** — Claude generates inline (no sub-agent needed):
  - Prompt: "Based on this Instagram post caption: '[caption]'. Write ONE warm, genuine comment in Argentine Spanish (informal, using 'vos'). Rules: 1-2 sentences max. Reference something specific from the caption. No hashtags. No emojis unless one fits naturally. No promotional content, no mentions of any account or website. Sound like a real person engaging with the community, not a brand."
  - Generate silently, then surface to the user for review
- **Approval display**:
  ```
  ─────────────────────────────────────────
  📍 Hashtag: #<hashtag>
  📝 Caption: <first 200 chars of caption>...
  💬 Comment: <generated comment>
  📊 Today: <daily_count>/<daily_limit> (<warning if >warning_threshold>)
  ─────────────────────────────────────────
  ```
  Use `AskUserQuestion` with options: "Post it" (Y), "Skip this post" (S), "End session" (Q)
- **If Post (Y)**:
  1. `take_snapshot` to locate the comment input field (look for textarea with placeholder text about adding a comment)
  2. `click` the comment input
  3. `type_text` with the generated comment
  4. Press Enter via `type_text` with `submitKey: "Enter"` OR find and click the Post button via snapshot
  5. `wait_for` confirmation the comment appeared (wait for own comment text to appear on page, or wait 3 seconds as fallback)
  6. Append `{post_url, hashtag, comment_text, posted_at: now, skipped: false}` to today's session in the log
  7. Increment `daily_count`
  8. If `daily_count >= warning_threshold && daily_count < daily_limit`: print `⚠️ WARNING: X comments posted today — past the safe zone (20–30/day). Detection risk increases. Continue? (Y/Q)` via `AskUserQuestion`; if Q → go to exit sequence
  9. If `daily_count >= daily_limit`: print "Daily limit reached. Session ending." → go to exit sequence
  10. Add `post_url` to `visited_posts`
- **If Skip (S)**:
  1. Add `post_url` to `visited_posts`
  2. Append `{post_url, hashtag, comment_text: null, posted_at: now, skipped: true}` to log
  3. Proceed to interval wait
- **If End session (Q)**: go to exit sequence immediately
- **Interval wait** (after Post or Skip, before returning to loop anchor):
  1. Calculate random interval: `Bash` with `echo $((RANDOM % ((max_interval_min - min_interval_min) * 60 + 1) + min_interval_min * 60))`
  2. Print "⏳ Next cycle in ~X min. Press Ctrl+C to stop early."
  3. `Bash` with `sleep <interval_seconds>` (blocks the session — intentional)
  4. After sleep returns, save log file (Write), then return to loop anchor
- **Exit sequence**:
  1. Write updated log to `scripts/instagram-engage.log.json`
  2. Print session summary: comments posted, posts skipped, hashtags covered, duration
  3. Skill ends

**Definition of Done:**

- [ ] `.claude/skills/ig-engage/SKILL.md` exists and is valid markdown with correct frontmatter
- [ ] Invoking `/ig-engage` in Claude Code starts the skill and prints the startup banner with config values
- [ ] When no Instagram tab is open in Chrome, the skill detects this and prompts the user to open it
- [ ] The skill navigates to a configured hashtag page, extracts at least one post URL, and generates a draft comment from the caption
- [ ] `AskUserQuestion` approval flow works: Y posts and increments counter, S skips without posting, Q exits with session summary
- [ ] Warning banner appears when daily_count crosses warning_threshold
- [ ] After a full cycle (Y or S), the log file is updated with the new entry
- [ ] Session summary on exit shows accurate comment count and hashtags visited
- [ ] Verify: manually invoke `/ig-engage` with Chrome open on `instagram.com`, complete one full cycle (Y for one post, Q to exit), confirm log file updated at `scripts/instagram-engage.log.json`
