# Native iOS and Android App (Wrapper) Implementation Plan

Created: 2026-10-02
Agent: Claude Code
Status: PENDING
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Hara Vital runs as an installable iOS and Android app that shows the live site exactly as it looks today. Logged-in pros get push notifications for new reviews and blog decisions, and they can delete their account from inside the app. The website keeps working unchanged for everyone else.

## Out of Scope

- **/admin in the app.** Admin stays web-only. The app does not link to it, and nothing is done to make it work well on a phone.
- **Rebuilding screens in native code** (React Native, Swift, Kotlin). Every screen is the existing Next.js page.
- **A static or offline copy of the site.** The app loads https://haravital.app. Only the "Sin conexión" page ships inside the app.
- **Universal links / App Links.** Links in emails (for example the set-password link) open in the phone's browser, not the app. The pro then logs in inside the app. Listed under Deferred Ideas.
- **Native share sheet, haptics, native status bar styling beyond a matching color.** These were offered and not picked.
- **Push for visitors, or for WhatsApp contact clicks.** Push is only for logged-in pros, and only for the two chosen events.
- **Store submission itself.** No store accounts exist yet. The plan ends with signed builds running on simulators and devices, plus a written submission checklist.
- **In-app purchases.** Destacado is charged by the admin outside the app (`app/admin/professionals/components/DestacadoPaymentModal.tsx`). The app shows no prices for Hara's own plans, so Apple's purchase rules do not apply.

## Approach

**Chosen:** A Capacitor shell that loads the production site through `server.url`. The shell lives in its own folder, `/Users/belenmontoya/Desktop/repos/hara-app`, with its own `package.json`, `capacitor.config.ts`, and the generated `ios/` and `android/` projects. Two small native plugins are added: Firebase Messaging for push, and the Capacitor bridge for detecting the app. Everything else is the existing Next.js code in this repo.

**Why:** The site depends on server features at runtime: API routes, `middleware.ts` session handling, server actions (`app/actions/create-lead.ts`), Supabase SSR cookies, and the Vercel crons. A static export would break all of them. Loading the live site keeps 100% of the code and design, and every web deploy updates the app without a store release. The cost is that the app needs internet, and Apple reviews wrappers strictly. Push notifications and account deletion are the native value we add to pass that review.

## Context for Implementer

**Two folders, two phases (decided 2026-10-05).** The user is in the middle of a redesign in this repo, with many uncommitted changes. So the work is split:

- **Phase A, now, in `hara-app/`:** Tasks 1 and 2, plus the native half of Task 8. These never touch the `hara` repo.
- **Phase B, after the redesign is committed and deployed, in `hara/`:** Tasks 3 to 7, plus the docs half of Task 8. Do not start Phase B while `git status` in `hara` still shows the redesign as uncommitted. The screenshot checks in Task 3 must compare against the final design.

Where a task needs a Capacitor package on both sides, install the same version in both folders. The native code comes from `hara-app`. The JavaScript the website calls comes from the `hara` package.

The app is the live website inside a native WebView. Any web change ships to the app on the next Vercel deploy. Native changes (config, plugins, icons, permission strings) need a new store build. Because the WebView's origin is still `https://haravital.app`, cookies, Supabase auth, the Google Maps API key referrer restriction, and `navigator.sendBeacon('/api/events')` all behave the same as in Safari or Chrome. Every native-only code path on the web side must be guarded with `Capacitor.isNativePlatform()` so the normal website does nothing new. The app appends `HaraVitalApp` to the user agent, so server logs and analytics can tell app traffic apart.

## Runtime Environment

- **Web:** `npm run dev` on port 3000. Health check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` returns 200.
- **App against local dev:** set `CAP_SERVER_URL=http://<your-LAN-IP>:3000` (iOS) or `http://10.0.2.2:3000` (Android emulator), then run `npx cap sync` inside `hara-app/` and run from Xcode or Android Studio. Without the variable the app loads `https://haravital.app`.
- **Toolchain on this machine (checked 2026-10-02):** Node 24.7, Xcode 16.2. No Android SDK and no CocoaPods are installed. Android Studio must be installed before the Android parts of Tasks 1 to 3 can be verified. Capacitor's iOS template uses Swift Package Manager, so CocoaPods is not needed.

## Assumptions

- The bundle / application id is `com.greenbit.hara` (confirmed 2026-10-05; already registered for iOS and Android in the Firebase project `haraapp-f8bcb`). It can never change once published. Tasks 1, 6 and 8 depend on this.
- Firebase project `haraapp-f8bcb` exists (set up 2026-10-05). `GoogleService-Info.plist`, `google-services.json` and a service-account key were downloaded to the user's Downloads folder. An Apple APNs key (.p8) is needed in Firebase for iOS push, and that requires the Apple Developer account. Until then, iOS push can only be checked up to "permission prompt shows and registration is attempted". Tasks 5 and 6 depend on this.
- Professionals hidden from the directory use `status = 'paused'` (`app/page.tsx:21` lists only `status = 'active'`; allowed values are in `migrations/011_pro_resubmit_cooldown.sql:54`). Task 7 depends on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Apple rejects the app as "just a website" (guideline 4.2) | Medium | High | Ship push for pros, in-app account deletion, and a bundled offline page. The submission checklist (Task 8) gives the reviewer a demo pro login and explains the push feature. |
| `target="_blank"` links (WhatsApp in `ContactButton.tsx:95`, Instagram, Maps) do nothing or open inside the app with no way back | Medium | High (WhatsApp contact is the core conversion) | Task 3 tests each link type on a real simulator. Any link that does not open the system app gets routed through a single guarded handler. |
| Design shifts inside the app (notch overlap, status bar color, font loading) | Medium | High (user requirement) | The WebView keeps the safe-area insets the way Safari does: we do not add `viewport-fit=cover`. Task 3 compares app screenshots against the web at the same width. The existing `npm run test:visual` suite must stay green, which proves the web is untouched. |
| Deleting a professional row fails, because `migrations/001_schema.sql:145` references `professionals(id)` without cascade | High if hard-deleted | Medium | Task 7 does not hard-delete. It deletes the login, hides the profile, and clears contact fields. |
| Push sends slow down the review and blog API responses | Low | Medium | Sends run fire-and-forget (`.catch(() => {})`), the same pattern as the existing email calls in `app/api/admin/blog/[id]/route.ts:142`. |

## E2E Test Scenarios

### TS-001: Website unchanged
**Priority:** Critical
**Preconditions:** dev server running, no app involved
**Mapped Tasks:** Task 1, Task 3, Task 6, Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run `npm run test:visual` | All existing visual baselines pass with zero diff |
| 2 | Navigate to `/`, `/p/<any active slug>`, `/blog` in Chrome | Pages render as before. Console shows no Capacitor or push errors |
| 3 | Log in at `/pro/login` as a test pro and open `/pro/perfil` | No notification permission prompt appears in the browser |

### TS-002: App loads the site with identical design
**Priority:** Critical
**Preconditions:** iOS simulator (iPhone 15) and Android emulator, app built from Task 1
**Mapped Tasks:** Task 1, Task 2, Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch the app | Splash with the isotipo, then the home page (almanac design) |
| 2 | Screenshot `/` with `xcrun simctl io booted screenshot`, and the same page in Chrome at 393px width | Same layout, fonts and colors. Content is not under the notch or the home indicator |
| 3 | Open a profile and tap "Contactar por WhatsApp" | WhatsApp (or wa.me in the system browser) opens outside the app. The event is recorded in `/api/events` |
| 4 | Tap an email link and the Instagram link on `/que-es-hara` | The mail app and Instagram/browser open outside the app |

### TS-003: Offline screen
**Priority:** High
**Preconditions:** app installed
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Turn on airplane mode and launch the app | The bundled "Sin conexión" page shows in brand colors, with a "Reintentar" button |
| 2 | Turn the network back on and tap "Reintentar" | The home page loads |

### TS-004: Pro receives a push for a new review
**Priority:** Critical
**Preconditions:** Firebase configured, Android emulator with Google Play services (or a real device), test pro account
**Mapped Tasks:** Task 4, Task 5, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In the app, log in as the test pro, land on `/pro/perfil` | System notification permission prompt appears. Accepting it creates a row in `push_tokens` |
| 2 | From a browser, submit a review on that pro's `/p/<slug>` | Within a few seconds the device shows "Recibiste una nueva reseña" |
| 3 | Tap the notification | The app opens on `/p/<slug>` |

### TS-005: Pro deletes their account
**Priority:** Critical
**Preconditions:** a disposable test pro, logged in (app or web)
**Mapped Tasks:** Task 7

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to the bottom of `/pro/perfil` and tap "Eliminar mi cuenta" | A confirmation asks to type or confirm, with clear consequences in Spanish |
| 2 | Confirm | Redirected to `/` and logged out. `/pro/perfil` now redirects to `/pro/login` |
| 3 | Visit the pro's old `/p/<slug>` and search the home directory | The profile is no longer listed. Logging in with the old password fails |

## Progress Tracking

- [ ] Task 1: Capacitor shell that loads the live site, with offline page
- [ ] Task 2: App icon, splash, colors and permission strings
- [ ] Task 3: Make links, uploads and location behave natively
- [ ] Task 4: Store pro push tokens
- [ ] Task 5: Send push on new review and blog decision
- [ ] Task 6: Register for push inside the app
- [ ] Task 7: "Eliminar mi cuenta" for pros
- [ ] Task 8: Release builds, docs and store checklist

**Total Tasks:** 8 | **Completed:** 0 | **Remaining:** 8

## Implementation Tasks

### Task 1: Capacitor shell that loads the live site, with offline page

**Objective:** Add Capacitor and generate the iOS and Android projects. The app opens `https://haravital.app` (or `CAP_SERVER_URL` in development) and shows a bundled "Sin conexión" page when the site cannot load. Verified by TS-002 step 1 and TS-003.

**Phase:** A. All paths are relative to `/Users/belenmontoya/Desktop/repos/hara-app/`.

**Files:**

- Create: `package.json` (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`; scripts `sync`, `ios`, `android`)
- Create: `capacitor.config.ts`
- Create: `www/index.html`, `www/offline.html`
- Create: `ios/` and `android/` (generated by `npx cap add ios` and `npx cap add android`)
- Create: `.gitignore` (`node_modules/`, `ios/App/Pods/`, `ios/DerivedData/`, `android/.gradle/`, `android/build/`, `android/app/build/`, `android/local.properties`, `android/app/release/`, `*.keystore`, `*.jks`)
- Create: `README.md` (what the folder is, how to run it, and a pointer to this plan)

**Key Decisions / Notes:**

- `hara-app` gets its own git repo (`git init`). Ask the user before the first commit and before creating any GitHub remote.
- Install the current stable Capacitor major. Check it with `npm view @capacitor/core version` and keep all `@capacitor/*` packages on the same major.
- `capacitor.config.ts`: `appId: 'com.greenbit.hara'`, `appName: 'Hara Vital'`, `webDir: 'www'`, `server.url: process.env.CAP_SERVER_URL ?? 'https://haravital.app'`, `server.cleartext` only when the URL starts with `http://`, `server.errorPath: 'offline.html'`, `appendUserAgent: 'HaraVitalApp'`, `backgroundColor: '#FBF7F2'`. Confirm `errorPath` and `appendUserAgent` against the installed version's config types before relying on them.
- `server.allowNavigation` stays limited to `haravital.app`, so every other host opens outside the app.
- `offline.html` is plain HTML with inline CSS. It copies the token values from `hara/app/globals.css` (`#FBF7F2` background, `#1F1A24` text, `#4B2BBF` button) because Tailwind is not available inside the bundle. The copy is Argentine Spanish: "Sin conexión", "Revisá tu conexión a internet y probá de nuevo.", button "Reintentar". The button does `location.href = '<server url>'`.
- Nothing in the `hara` repo changes in this task.

**Definition of Done:**

- [ ] `npx cap sync` finishes with no errors
- [ ] The iOS simulator app opens the home page of `https://haravital.app`
- [ ] With the network off, the app shows `offline.html`, and "Reintentar" loads the site once the network is back
- [ ] `git status` in the `hara` repo is the same as before this task
- [ ] Verify: `npx cap doctor && npx cap sync`, then build and run on the iOS simulator

### Task 2: App icon, splash, colors and permission strings

**Objective:** Give the app its brand icon and launch screen, a background and status-bar color that match the site, and the permission texts iOS and Android require for photo upload, camera and location. Without these, the existing upload and "near me" features crash or are blocked inside the app. Verified by TS-002 steps 1 and 2.

**Phase:** A. All paths are relative to `hara-app/`.

**Files:**

- Create: `assets/icon.png`, `assets/splash.png` (made from `hara/public/assets/logo/isotipo.png`, centered on `#FBF7F2`)
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `package.json` (devDependency `@capacitor/assets`)

**Key Decisions / Notes:**

- Generate every icon and splash size with `npx @capacitor/assets generate --assetPath assets`. Do not hand-crop.
- iOS `Info.plist` strings, in Spanish: `NSPhotoLibraryUsageDescription` ("Para subir tu foto de perfil."), `NSCameraUsageDescription` ("Para sacarte una foto de perfil."), `NSLocationWhenInUseUsageDescription` ("Para mostrarte profesionales cerca tuyo."). The file inputs are in `app/registro/RegistroForm.tsx:548` and `app/blog/escribir/EscribirForm.tsx:262`. Geolocation is in `app/profesionales/components/LocationFilter.tsx:42`.
- Android: `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`. `INTERNET` is already in the template.
- The status bar and the WebView background use `#FBF7F2`, so there is no white flash or band above the header.

**Definition of Done:**

- [ ] The home screen shows the Hara isotipo icon on iOS and Android
- [ ] The launch screen shows the isotipo on `#FBF7F2`, with no white flash before the home page
- [ ] Choosing a profile photo in the `/registro` form opens the photo picker inside the app, and the permission dialog shows the Spanish text
- [ ] Verify: `npx cap sync`, then build and run on the iOS simulator. Screenshot with `xcrun simctl io booted screenshot`

### Task 3: Make links, uploads and location behave natively

**Objective:** Test every outward link and device feature inside the app, and fix only what does not work. WhatsApp, `mailto:`, Instagram and Google Maps links must open in the system apps. Uploads and "near me" must work. The design must match the web screenshot. Verified by TS-002 steps 2 to 4.

**Phase:** B (after the redesign is committed and deployed). All paths are relative to the `hara` repo.

**Files:**

- Modify: `package.json` (add `@capacitor/core`, same version as in `hara-app`)
- Create: `lib/native.ts` (`isNativeApp()` wrapper around `Capacitor.isNativePlatform()`, safe to call during SSR)
- Create: `app/components/NativeBridge.tsx` (client component, renders nothing; only acts when `isNativeApp()` is true)
- Modify: `app/layout.tsx` (render `<NativeBridge />` once in `<body>`)
- Test: `app/components/NativeBridge.test.tsx`

**Key Decisions / Notes:**

- Test first, on the simulator, the links found during planning: `app/components/ContactButton.tsx:95` (`wa.me`, `target="_blank"`), `app/p/[slug]/components/ProfileContact.tsx:69` and `:84`, `app/p/[slug]/components/ProfileLocation.tsx:39`, `app/que-es-hara/page.tsx:287` and `:290`, `app/pro/perfil/page.tsx:57`, and blog content links rewritten by `lib/sanitize.ts:32`.
- If `target="_blank"` or non-http schemes do nothing inside the WebView, add one document-level click listener in `NativeBridge` that catches `<a>` clicks to other hosts or to `mailto:` / `tel:`, and opens them with `@capacitor/app-launcher` (or `@capacitor/browser` for https). It must not call `preventDefault` before `ContactButton`'s `sendBeacon` has run. Use a listener in the bubble phase, after React's handler.
- Do not touch `ContactButton.tsx` or any page component. The fix lives only in `NativeBridge`, so the web code paths stay identical.
- Safe areas: keep the default WebView insets. Do not add `viewport-fit=cover`. If Android shows content behind the status bar (edge-to-edge), fix it in the native project (`MainActivity` or `capacitor.config.ts` `android` options), not in the CSS.
- Unit test (one class): `NativeBridge` does nothing when `isNativeApp()` is false; when true, a click on an external `<a>` calls the launcher with that URL, and a click on a same-site link does not.

**Definition of Done:**

- [ ] Each link listed above opens in the correct system app on the iOS simulator and the Android emulator
- [ ] A WhatsApp tap still records a `whatsapp_click` event (checked in the `events` table or the `/api/events` server log)
- [ ] Screenshots of `/`, `/p/<slug>`, `/blog` and `/pro/perfil` in the app match Chrome at the same width
- [ ] `npm run test:visual` passes with no baseline changes
- [ ] Verify: `npx vitest run app/components/NativeBridge.test.tsx && npm run test:visual`

### Task 4: Store pro push tokens

**Objective:** Add a `push_tokens` table and an authenticated `/api/pro/push-token` endpoint that saves or removes the device token for the logged-in pro. One device belongs to one pro at a time, so if another pro logs in on the same phone the token moves to them.

**Phase:** B (after the redesign is committed and deployed). All paths are relative to the `hara` repo.

**Files:**

- Create: `migrations/023_push_tokens.sql`
- Create: `app/api/pro/push-token/route.ts` (`POST` upsert, `DELETE` remove)
- Test: `app/api/pro/push-token/route.test.ts`
- Modify: `FINAL_SPEC.md` (schema and API sections)

**Key Decisions / Notes:**

- Table: `id uuid pk default gen_random_uuid()`, `professional_id uuid not null references professionals(id) on delete cascade`, `token text not null unique`, `platform text not null check (platform in ('ios','android'))`, `created_at`, `last_seen_at timestamptz default now()`. Index on `professional_id`. Enable RLS with no policies, so only the service role can access it. Include a rollback comment, in the same style as `migrations/022_professional_user_id.sql`.
- Resolve the pro the same way `app/pro/perfil/page.tsx:13` does: `createClient()` then `auth.getUser()`, then `supabaseAdmin.from('professionals').select('id').eq('user_id', user.id).maybeSingle()`. Return 401 with no user and 404 with no professional.
- Upsert with `onConflict: 'token'`, updating `professional_id`, `platform`, and `last_seen_at`.
- Validate input: `token` is a non-empty string of at most 4096 chars, and `platform` is `ios` or `android`; otherwise 400. Log errors with `logError` from `lib/monitoring.ts`.
- `/api/pro/` is already protected by `middleware.ts`. Follow the test style of `app/api/pro/profile/route.test.ts`.
- Tests cover: 401 without a session, 400 for a bad platform, the upsert payload contains the right `professional_id` and `platform` (assert the written row, not only the status), and `DELETE` only removes the caller's own token.

**Definition of Done:**

- [ ] Migration applied in Supabase. `push_tokens` exists with RLS enabled
- [ ] `POST /api/pro/push-token` as a logged-in pro creates or moves the row; without a session it returns 401
- [ ] `DELETE` removes only a token that belongs to the caller
- [ ] Verify: `npx vitest run app/api/pro/push-token/route.test.ts`

### Task 5: Send push on new review and blog decision

**Objective:** Add `lib/push.ts`, which sends a notification to every device of a professional through Firebase Cloud Messaging (HTTP v1), and call it in the same places the emails are sent today: new review (both review routes) and blog post approved or rejected. If Firebase is not configured, it logs once and does nothing. Verified by TS-004 step 2.

**Phase:** B (after the redesign is committed and deployed). All paths are relative to the `hara` repo.

**Files:**

- Create: `lib/push.ts`
- Test: `lib/push.test.ts`
- Modify: `app/api/reviews/submit/route.ts`, `app/api/reviews/direct/route.ts`, `app/api/admin/blog/[id]/route.ts`
- Modify: `lib/env.ts` (optional `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Modify: `app/api/reviews/submit/route.test.ts`, `app/api/reviews/direct/route.test.ts` (mock `lib/push`)

**Key Decisions / Notes:**

- Use `jose` (already a dependency) to sign the Google service-account JWT and swap it for an access token at `https://oauth2.googleapis.com/token`. Then `POST https://fcm.googleapis.com/v1/projects/{id}/messages:send`. Cache the access token in module scope until about one minute before it expires, because this runs on request paths. Confirm the request and response shapes with the Firebase docs (context7) before writing them.
- `sendPushToProfessional(professionalId, { title, body, url })` loads tokens from `push_tokens`, sends one message per token with `data.url`, and deletes tokens that FCM reports as `UNREGISTERED` or `INVALID_ARGUMENT`.
- Messages (Spanish): review: title "Recibiste una nueva reseña", body "Entrá para verla en tu perfil.", url `/p/<slug>`. Blog approved: "Tu nota fue publicada", url `/blog/<slug>`. Blog rejected: "Tu nota necesita cambios", url `/pro/perfil`.
- Reviews: read the `submit_review` function in `migrations/006_reviews_collection.sql` to see whether it returns `professional_id`. If it does not, look the professional up by the returned review id. The direct route already has `professional_slug` (`app/api/reviews/direct/route.ts:24`).
- Blog: only send when the post has a `professional_id` (`migrations/021_blog_posts.sql:36`) and under the same condition the email uses (`app/api/admin/blog/[id]/route.ts:141`). Every call is fire-and-forget with `.catch(() => {})`.
- `lib/push.test.ts` (one class) covers: the payload sent to FCM contains the right token, title, body and `data.url`; an `UNREGISTERED` response deletes that token and only that token; missing env vars means no fetch call; a professional with no tokens means no fetch call.

**Definition of Done:**

- [ ] A review submitted through either route calls `sendPushToProfessional` with that review's professional and the right Spanish text
- [ ] Approving or rejecting a pro-authored blog post sends the matching push; editorial posts send none
- [ ] With Firebase env vars unset, all three routes behave exactly as before
- [ ] Verify: `npx vitest run lib/push.test.ts app/api/reviews app/api/blog && npm run test:integration`

### Task 6: Register for push inside the app

**Objective:** When a logged-in pro opens `/pro/perfil` inside the app, ask for notification permission once, get the device token, and send it to `/api/pro/push-token`. Tapping a notification opens its `url` inside the app. On the website this does nothing. Verified by TS-001 step 3 and TS-004 steps 1 and 3.

**Phase:** B. Touches both folders, as marked below.

**Files:**

- Modify: `hara-app/package.json` (add `@capacitor-firebase/messaging` and its `firebase` peer dependency at the version it requires, then `npx cap sync`)
- Modify: `hara/package.json` (add the same `@capacitor-firebase/messaging` version, so the website can call the plugin)
- Create: `hara/app/pro/perfil/PushRegistration.tsx` (client component, renders nothing)
- Modify: `app/pro/perfil/page.tsx` (render `<PushRegistration />` only when `pro` exists)
- Modify: `app/components/NativeBridge.tsx` (listener for notification taps, so taps work on any page)
- Add: `hara-app/ios/App/App/GoogleService-Info.plist`, `hara-app/android/app/google-services.json` (the user moves them from Downloads; see Key Decisions)
- Modify: `hara-app/ios/` (Push Notifications and Background Modes capabilities), `hara-app/android/` (`google-services` Gradle plugin)
- Test: `app/pro/perfil/PushRegistration.test.tsx`

**Key Decisions / Notes:**

- Use `@capacitor-firebase/messaging` instead of `@capacitor/push-notifications`, because on iOS the core plugin returns an APNs token and not an FCM token, and Task 5 sends only through FCM. Follow the plugin's README for the iOS capability (Push Notifications + Background Modes > Remote notifications) and the Android `google-services` Gradle setup.
- `PushRegistration`: if `!isNativeApp()`, return. Otherwise call `checkPermissions()`. Only call `requestPermissions()` when the state is `prompt`. On `granted`, `getToken()` and `POST /api/pro/push-token` with `Capacitor.getPlatform()`. Run once per mount; no retries loop.
- Android 13 and newer need the `POST_NOTIFICATIONS` permission in `AndroidManifest.xml`. Check that the plugin adds it; if it does not, add it.
- Notification tap: in `NativeBridge`, add the `notificationActionPerformed` listener. Only navigate when `data.url` starts with `/`, so a push can never send the WebView to another site.
- Firebase config files hold public client ids, not secrets. They are safe to commit, but ask the user before the first commit. The service-account key from Task 5 is a secret and goes only in Vercel env vars.
- Tests (one class): does nothing on web (no plugin calls, no fetch); on native with `granted`, posts the token and platform; with `denied`, posts nothing. Mock `@capacitor/core` and the plugin.

**Definition of Done:**

- [ ] On Android, logging in and opening `/pro/perfil` shows the permission prompt once, and a `push_tokens` row appears
- [ ] Tapping a test notification with `url: '/p/<slug>'` opens that page in the app
- [ ] In Chrome on the website, `/pro/perfil` shows no prompt and makes no request to `/api/pro/push-token`
- [ ] Verify: `npx vitest run app/pro/perfil/PushRegistration.test.tsx`, then TS-004 on the Android emulator

### Task 7: "Eliminar mi cuenta" for pros

**Objective:** Add a small "Eliminar mi cuenta" text link at the bottom of `/pro/perfil` with a confirmation step. Confirming deletes the pro's login, hides their profile, clears their contact details, removes their push tokens, emails the admin, and logs them out. This is required by Apple because accounts can be created inside the app, and it also ships on the web. Verified by TS-005.

**Phase:** B (after the redesign is committed and deployed). All paths are relative to the `hara` repo.

**Files:**

- Create: `app/api/pro/account/route.ts` (`DELETE`)
- Test: `app/api/pro/account/route.test.ts`
- Create: `app/pro/perfil/DeleteAccount.tsx` (link plus confirmation using `app/components/ui/Modal`)
- Modify: `app/pro/perfil/page.tsx` (render it under the form)
- Modify: `lib/email.ts` (`notifyAccountDeleted`, following the shape of `notifyProfessionalRejected` at `lib/email.ts:347`)
- Modify: `app/privacidad/page.tsx` (one sentence saying pros can delete their account from their profile)

**Key Decisions / Notes:**

- Do not hard-delete the `professionals` row: `migrations/001_schema.sql:145` references it without cascade, so the delete would fail. Instead: set `status = 'paused'`, set `whatsapp`, `instagram`, `profile_image_url` to null, `user_id` to null, delete from `push_tokens`, then `supabaseAdmin.auth.admin.deleteUser(user.id)`. Check which of these columns are NOT NULL in `migrations/001_schema.sql` before writing the update.
- Order matters. Update the row first, then delete the auth user. If the auth delete fails, return 500 and log it; the profile is already hidden, which is the safe side.
- After success, the client calls `supabase.auth.signOut()` from `lib/supabase/client.ts` and does `router.replace('/')`.
- Copy: link "Eliminar mi cuenta". Modal title "¿Eliminar tu cuenta?", body "Tu perfil deja de aparecer en Hara Vital y no vas a poder volver a entrar con este email. Esta acción no se puede deshacer.", buttons "Cancelar" and "Sí, eliminar". The link uses `text-muted text-sm underline`, so the page looks the same apart from one quiet line at the end.
- Tests (one class) assert the written row (status `paused`, contact fields null, `user_id` null), that `deleteUser` is called with the caller's id, 401 without a session, and that a failing `deleteUser` returns 500 after the row was hidden.

**Definition of Done:**

- [ ] Deleting a disposable test pro hides them from `/` and `/p/<slug>`, and their old password no longer logs in
- [ ] The admin receives the "cuenta eliminada" email
- [ ] The rest of `/pro/perfil` looks unchanged (screenshot comparison)
- [ ] Verify: `npx vitest run app/api/pro/account/route.test.ts`, then TS-005 in the browser

### Task 8: Release builds, docs and store checklist

**Objective:** Produce signed release builds for both platforms, and write down everything needed to publish once the store accounts exist: signing, versions, store listing text, screenshots, privacy answers and the reviewer notes. Update the project docs so the app is described everywhere the web is.

**Phase:** Native half (signing, versions, `hara-app/README.md`) in Phase A. Docs half in the `hara` repo in Phase B.

**Files:**

- Modify: `hara-app/README.md` (local run, release steps, store checklist)
- Create: `hara/docs/MOBILE_APP.md` (short page: how the app relates to the site, which web code is app-only, pointer to `hara-app`)
- Modify: `CLAUDE.md` (stack, project structure, commands)
- Modify: `README.md`, `PRODUCT.md` (surfaces), `.claude/plans/main.md` (tracking)
- Modify: `hara-app/android/app/build.gradle`, `hara-app/ios/App/App.xcodeproj` (version 1.0.0, build 1)

**Key Decisions / Notes:**

- Android: generate an upload keystore. Store it and its passwords outside the repo, and record where in `hara-app/README.md`. Build an `.aab` with `./gradlew bundleRelease`.
- iOS: an archive needs a signing team. Without an Apple Developer account, the checklist covers it, and the plan only proves a simulator build.
- Store checklist contents: create the Apple Developer ($99/year) and Google Play ($25 once) accounts; upload the APNs key to Firebase; privacy policy URL `https://haravital.app/privacidad`; App Store privacy labels (email, name, photos, coarse location, device token); a demo pro account for the App Review notes; text explaining push and account deletion as the native features; Google Play Data Safety form.
- Docs sync: mention the `hara-app` folder, `lib/push.ts`, `lib/native.ts`, the new API routes and the `push_tokens` table in `CLAUDE.md` and `FINAL_SPEC.md`.

**Definition of Done:**

- [ ] `cd hara-app/android && ./gradlew bundleRelease` produces a signed `.aab`
- [ ] The iOS release configuration builds for the simulator with `xcodebuild`
- [ ] `hara-app/README.md` lets someone new run the app locally and submit to both stores without asking
- [ ] `git status --short` shows no untracked files
- [ ] Verify: `npm run build && npm run lint && npm test && npm run test:visual`

## Open Questions

- The Firebase project, the service-account key, and later the APNs key must come from the user. Tasks 5 and 6 can be written and unit-tested without them, but TS-004 needs them.

## Deferred Ideas

- Universal links / App Links, so emailed links (set-password, review requests) open inside the app.
- Native share sheet, haptics, and a richer native status bar.
- Push for WhatsApp contact clicks ("Alguien te quiere contactar").
- Push for visitors (for example, "tus recomendaciones están listas" for concierge requests).
