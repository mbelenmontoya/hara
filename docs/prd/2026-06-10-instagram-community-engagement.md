# Instagram Community Engagement Skill

Created: 2026-06-10
Author: belu.montoya@dialpad.com
Agent: Claude Code
Category: Infrastructure
Status: Draft
Research: Standard

## Problem Statement

Hara Vital needs organic Instagram reach but lacks the time to manually engage with the holistic wellness community throughout the day. Consistent, genuine commenting on relevant hashtag posts is one of the highest-signal engagement behaviors recognized by Instagram's algorithm — it drives hashtag visibility, explore page placement, and feed prioritization. The goal is a tool that runs as an attended continuous session, gradually posting contextually relevant comments on community posts at a human pace, so Hara Vital's account is seen as an active community participant rather than a broadcast account.

## Core User Flows

### Flow 1: Starting a session

1. User invokes the skill with optional hashtag overrides: `/ig-engage` or `/ig-engage #reiki #bienestarholístico`
2. Skill reads config file (`instagram-engage.config.json`) for defaults: hashtag list, interval range, daily limit, warning threshold
3. Skill confirms Chrome is reachable via DevTools MCP and Instagram is loaded and logged in
4. Session begins — skill prints current config summary and starts the engagement loop
5. User sees: daily counter (0), estimated pace, and instructions to quit (Q + Enter)

### Flow 2: Comment cycle (repeats throughout session)

1. Skill selects a hashtag from the configured list (rotates round-robin)
2. Navigates to the hashtag page via Chrome DevTools MCP
3. Selects posts: 3 most recent + 2 top posts — skips any post already commented on in this session or today's log
4. Picks one post from the selection (randomized)
5. Reads the post caption via page evaluation
6. Generates a contextual, warm comment using Claude — in Spanish, in Hara Vital's voice, no promotional language, no hashtags, no account mentions
7. Displays to the user:
   ```
   ─────────────────────────────────────
   📸 Post caption: [first 200 chars of caption]
   💬 Proposed comment: [generated comment]
   Daily count: 12/30  |  Next cycle in: ~24 min
   ─────────────────────────────────────
   Press Y + Enter to post, or wait 3 min to auto-skip
   ```
8. User presses Y → skill posts the comment via Chrome DevTools MCP, increments daily counter
9. No response within 3 minutes → skill auto-skips this post (does not post), prints "⏭ Skipped — next cycle in X min"
10. Either way, skill waits a randomized interval before next cycle, then repeats

### Flow 3: Warning threshold reached

1. Daily counter hits the warning threshold (default: 25)
2. Skill pauses the loop and prints a visible warning:
   ```
   ⚠️  WARNING: 25 comments posted today
   You're past the recommended safe zone (20–30/day).
   Detection risk increases from here.
   Continue? (Y to keep going, Q to stop for today)
   ```
3. User confirms Y → loop resumes with same behavior
4. User presses Q → session ends, log is saved

### Flow 4: Ending a session

1. User presses Q + Enter at any point between cycles (not mid-post)
2. Skill finishes any in-progress wait, then exits cleanly
3. Prints session summary: hashtags used, total comments posted, posts skipped, time elapsed
4. Appends session to the run log file (`instagram-engage.log.json`)
5. Hard stop also triggers automatically if daily counter reaches the configured max (default: 50)

## Scope

### In Scope

- Claude skill `/ig-engage` (or invoked as a Claude Code skill file)
- Chrome DevTools MCP integration for browser control: navigation, caption reading, comment posting
- Claude-powered comment generation: contextual, Spanish, non-promotional, community-first tone
- Post selection logic: 3 recent + 2 top per hashtag, dedup against today's session log
- Randomized interval between cycles (configurable range, e.g., 12–60 min, averaging ~2–3/hour)
- Draft approval with 3-minute auto-skip timeout
- Daily counter with configurable warning threshold (default: 25) and hard stop (default: 50)
- Config file (`instagram-engage.config.json`) for hashtags, intervals, limits
- Run log file (`instagram-engage.log.json`) for dedup and session history
- Session summary on exit

### Explicitly Out of Scope

- Likes, follows, unfollows, DMs, or Story interactions — comment-only to reduce risk surface
- Automated cron / scheduled runs — this is an attended skill, user starts it manually
- Analytics dashboard or engagement tracking beyond the local log
- Any comment that mentions, links to, or otherwise promotes Hara Vital's Instagram handle
- Multi-account support
- Mobile or API-based approach — browser-only via Chrome DevTools MCP
- Automatic hashtag discovery — user configures hashtags explicitly

## Technical Context

- **Browser control:** Chrome DevTools MCP (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) — requires Chrome running and Instagram loaded/logged in. The skill navigates pages, evaluates JS to extract captions, fills comment inputs, and clicks submit.
- **Comment generation:** Claude (claude-sonnet-4-6 or equivalent) via skill context — prompt includes post caption, Hara Vital brand voice guidelines, explicit instruction to write in Argentine Spanish, be warm and genuine, avoid promotional language.
- **Session state:** In-memory during the skill run; persisted to `instagram-engage.log.json` on exit for cross-session dedup.
- **Config file location:** `scripts/instagram-engage.config.json` — read on skill start, not hot-reloaded.
- **Timing:** `setTimeout`-style waits within the skill loop; intervals randomized from `min_interval_min` to `max_interval_min` configured values.
- **Detection mitigations built into the design:**
  - Randomized intervals (never fixed timing)
  - Low volume per hour (1–5 comments)
  - Unique Claude-generated comments per post (no repetition)
  - Real Chrome session with user already authenticated (not headless)
  - Comments only — no follow/unfollow spikes
  - Session dedup prevents commenting on the same post twice

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Continuous skill vs. cron | Continuous attended skill | A long session with natural pauses looks like a human browsing on and off — cron bursts look like a machine. Better detection profile. |
| Approval model | Y to post, auto-skip on 3-min timeout | Lets the user stay in control without blocking the session when they step away. Never posts without explicit yes. |
| Comment-only (no likes/follows) | Yes | Each additional action type multiplies detection surface and ToS exposure. Comments alone drive the algorithm signal we're after. |
| Volume target | 1–5/hour, warn at 25/day, hard stop at 50 | Research confirmed 200/day is the technical max, but community consensus puts "safe" at 20–30. Warning at 25 keeps the user informed; hard stop at 50 is a conservative safety net. |
| Post selection | 3 recent + 2 top per hashtag | Recent posts get seen by authors who are actively watching; top posts provide visibility. Mix maximizes both reciprocal engagement and reach exposure. |
| Language & tone | Argentine Spanish, warm, non-promotional | Hara Vital's voice is Argentine informal. Promotional comments risk being reported as spam — genuine community participation is the stated goal. |
| Architecture | Chrome DevTools MCP | No API credentials needed, works with existing logged-in session, no separate Node.js process required, native to the Claude Code toolchain. |

## Research Findings

- **Algorithm premise confirmed:** Comments are the highest-signal engagement type. Consistent community commenting drives hashtag visibility, explore page placement, and feed prioritization.
- **Detection risk is real but manageable at this scale:** Browser-based automation carries a 70–85% detection rate for heavy automation tools. A personal tool doing 5–10 contextual comments/hour with randomized timing and unique Claude-generated content is a fundamentally different threat model.
- **Safe limits (comments):** ~200/day technical max; 20–30/day recommended for safety; minimum 20–30 seconds between actions; total combined actions ~500/day.
- **What triggers detection:** fixed timing intervals, burst activity, identical comment text, unusual session patterns. All four are addressed by this design.
- **What reduces detection:** real authenticated browser session, low volume, unique content per post, human-paced randomized intervals.
