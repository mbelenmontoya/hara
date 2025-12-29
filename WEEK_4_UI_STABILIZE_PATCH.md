# WEEK_4_UI_STABILIZE_PATCH.md

## Context
- Repository: Next.js App Router at `/app` (repo root)
- Problem: http://localhost:3000/ returns 404
- Root cause: Missing `app/page.tsx`
- Secondary issue: Tailwind CSS not applying

---

## Minimal Files Required

**Create:**
1. `app/page.tsx`
2. `postcss.config.cjs`

**Verify exists (do NOT edit if already correct):**
3. `app/layout.tsx`
4. `app/globals.css`
5. `tailwind.config.ts`

---

## Edits Allowed

**None.** Only CREATE the two files above if they don't exist.

If `app/layout.tsx` already imports `./globals.css`, leave it alone.

---

## Plan (Do exactly in this order)

### Step 1: Create `app/page.tsx`
**Path:** `/app/page.tsx`

**Content requirements:**
- Export default function HomePage
- Single `<div>` with Tailwind classes: `min-h-screen`, `flex`, `items-center`, `justify-center`, `bg-gray-50`
- One `<h1>` with text "Hará Match" and classes: `text-4xl`, `font-bold`, `text-gray-900`, `mb-4`
- One `<a>` link to `/admin/leads` with text "Admin Portal" and classes: `text-blue-600`, `hover:underline`
- Keep it under 20 lines total
- NO imports except React types (if needed)

### Step 2: Create `postcss.config.cjs`
**Path:** `/postcss.config.cjs` (repo root)

**Content requirements:**
- CommonJS module export (`.cjs` extension required because package.json has `"type": "module"`)
- Export object with `plugins` property
- Plugins: `{ tailwindcss: {}, autoprefixer: {} }`
- Exactly 5 lines

### Step 3: Verify `app/layout.tsx` (DO NOT EDIT)
**Path:** `/app/layout.tsx`

**Must contain:**
- Import statement: `import './globals.css'`
- If missing, this is a blocker—report it

### Step 4: Verify `app/globals.css` (DO NOT EDIT)
**Path:** `/app/globals.css`

**Must contain:**
- `@tailwind base;`
- `@tailwind components;`
- `@tailwind utilities;`
- If missing, this is a blocker—report it

### Step 5: Verify `tailwind.config.ts` (DO NOT EDIT)
**Path:** `/tailwind.config.ts`

**Must contain:**
- `content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', ...]`
- If missing correct glob, this is a blocker—report it

---

## Acceptance Criteria

**Visual:**
1. Navigate to http://localhost:3000/
2. See "Hará Match" heading with large, bold, dark text
3. See light gray background
4. See blue "Admin Portal" link
5. Link is styled (not plain browser default)

**Route check:**
- GET http://localhost:3000/ returns 200 (not 404)

---

## What You Must NOT Touch

**Forbidden (will cause regression):**
- ANY file in `__tests__/`
- `package.json`
- `middleware.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- ANY file in `app/api/`
- ANY file in `app/admin/`
- ANY file in `app/r/`
- ANY file in `app/p/`
- ANY file in `app/components/`
- `next.config.mjs`
- `.gitignore`
- `tsconfig.json`

**Do NOT:**
- Run tests
- Modify test files
- Create debug/health endpoints
- Delete files
- Rename files
- Redesign pages beyond proving Tailwind works

---

## Execution Instruction

Create the 2 files in Steps 1-2.
Verify existence of files in Steps 3-5 (report if missing, do NOT edit).
Stop.
