# Production Readiness Checklist (Historical — Week 4 Snapshot)

**Status at snapshot:** 🟢 **READY FOR PRODUCTION** (Week 4 PQL-only product, Jan 2026)
**Snapshot Date:** 2026-01-06

> **Note (2026-04):** This checklist reflects readiness for the original PQL-only lead marketplace (pre-pivot). For current product context see [`PRODUCT.md`](./PRODUCT.md). Current activation/launch readiness for the post-pivot directory + concierge product lives in [`docs/prd/2026-04-27-phase-0-activation.md`](./docs/prd/2026-04-27-phase-0-activation.md). The infrastructure validated below (build, tests, RLS, monitoring hooks) carries forward; the product surface has expanded.

---

## ✅ Core Requirements (Complete)

### Build & Tests
- ✅ Production build succeeds (`npm run build`)
- ✅ All integration tests pass (12/12)
- ✅ No TypeScript errors
- ✅ No deprecation warnings
- ✅ Environment validation in place

### Code Quality
- ✅ Components ≤440 lines
- ✅ Functions ≤50 lines (hooks)
- ✅ No magic numbers (all extracted to constants)
- ✅ Type-safe throughout (proper guards)
- ✅ Error boundaries implemented
- ✅ Clean code (no unused CSS/components)

### Performance
- ✅ Images optimized (Next.js Image component)
- ✅ Expected 70-85% file size reduction
- ✅ Responsive image variants
- ✅ Clean CSS (unused gradient code removed)

### Documentation
- ✅ Comprehensive README.md
- ✅ Code quality audit completed
- ✅ Implementation plans documented
- ✅ All components documented with JSDoc

---

## 🟡 Optional Enhancements (For Future Sprints)

The following items are **optional improvements** that can be implemented post-launch based on business priorities:

### 1. Error Monitoring (Sentry Integration)

**Status:** ⚠️ Placeholder Ready
**Priority:** Medium
**Effort:** 1 hour

**Current State:**
- Error boundaries catch and display errors
- Console logging in place
- Error digests generated
- TODO comments ready for Sentry integration

**Implementation:**
```bash
# 1. Install Sentry
npm install @sentry/nextjs

# 2. Initialize Sentry
npx @sentry/wizard -i nextjs

# 3. Update error boundaries
# app/error.tsx and app/r/[tracking_code]/error.tsx
# Uncomment Sentry.captureException(error) calls

# 4. Add environment variable
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
```

**Files to modify:**
- `app/error.tsx` (line 13)
- `app/r/[tracking_code]/error.tsx` (line 13)

---

### 2. DDoS Protection Strategy

**Status:** ✅ Documented
**Priority:** Medium (production-dependent)
**Effort:** 2 hours + infrastructure setup

**Current Protection:**
- ✅ Upstash Redis rate limiting (10 req/min on /api/events)
- ✅ Rate limiting on public endpoints (30 req/5min on /api/public/recommendations)
- ✅ IP-based rate limiting

**Recommended Additions for High-Traffic Production:**

**A. Cloudflare Integration** (Recommended)
```
- Enable Cloudflare proxy
- Configure rate limiting rules
- Enable DDoS protection (automatic)
- Set up Web Application Firewall (WAF)
- Cost: Free tier available
```

**B. Vercel Enterprise Features**
```
- DDoS mitigation (automatic on Enterprise)
- Advanced rate limiting
- Attack Challenge Mode
- Cost: Enterprise plan required
```

**C. Application-Level Hardening**
```typescript
// lib/rate-limit-advanced.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Aggressive rate limiting for public endpoints
export const aggressiveLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:aggressive',
})

// Per-endpoint limits
export const endpointLimits = {
  '/api/events': { requests: 10, window: '1 m' },
  '/api/public/recommendations': { requests: 30, window: '5 m' },
  '/api/admin/*': { requests: 100, window: '1 m' }, // After Clerk auth
}
```

**Implementation Priority:**
- ⚠️ **Now (Free):** Cloudflare proxy + basic rules
- Later (Paid): Vercel Enterprise or advanced WAF rules
- Monitor: Set up alerts for unusual traffic patterns

---

### 3. Code Splitting Optimization

**Status:** ⚠️ Next.js Automatic (Sufficient)
**Priority:** Low
**Effort:** 1 hour

**Current State:**
- ✅ Next.js automatic code splitting enabled
- ✅ Route-based splitting (each route is a separate bundle)
- ✅ Dynamic imports for Next.js Image

**Manual Optimizations (Optional):**
```typescript
// Example: Lazy load BottomSheet component
import dynamic from 'next/dynamic'

const BottomSheet = dynamic(
  () => import('./components/BottomSheet').then(mod => ({ default: mod.BottomSheet })),
  { loading: () => <p>Cargando...</p> }
)
```

**When to implement:**
- If BottomSheet grows >200 lines
- If initial page load exceeds 2 seconds
- If Lighthouse score drops below 90

**Current Performance:**
- /r route: 9.93 kB JS (acceptable)
- First Load JS: 97.2 kB (good)
- No immediate optimization needed

---

### 4. Test Coverage Improvements

**Status:** ✅ Core Coverage Complete
**Priority:** Low
**Effort:** 2 hours

**Current Coverage:**
- ✅ 12/12 integration tests passing
- ✅ Admin match creation API
- ✅ Event tracking API
- ✅ PQL billing logic
- ✅ Rate limiting
- ✅ Authentication gating

**Gaps (Non-Critical):**
- ⚠️ No unit tests for custom hooks
- ⚠️ No E2E tests for complete user journey (seed data dependent)
- ⚠️ No visual regression tests

**Recommendations:**
```typescript
// Example: Unit test for useSwipeGesture
// __tests__/unit/hooks/useSwipeGesture.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture } from '@/app/r/[tracking_code]/hooks/useSwipeGesture'

describe('useSwipeGesture', () => {
  it('should navigate to next card on left swipe', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() =>
      useSwipeGesture({ currentIndex: 0, maxIndex: 2, onNavigate })
    )

    // Simulate swipe gesture
    act(() => {
      result.current.handleTouchStart({ touches: [{ clientX: 100 }] } as any)
      result.current.handleTouchMove({ touches: [{ clientX: 20 }] } as any)
      result.current.handleTouchEnd()
    })

    expect(onNavigate).toHaveBeenCalledWith(1)
  })
})
```

**Implementation Priority:**
- Monitor production errors first
- Add tests for areas with bugs
- Not needed before launch

---

### 5. Tailwind CSS Purge Configuration

**Status:** ✅ Already Optimized (Tailwind v4)
**Priority:** ❌ Not Needed
**Effort:** 0 hours

**Tailwind v4 Benefits:**
- ✅ Automatic CSS purging (no configuration needed)
- ✅ Only used classes included in build
- ✅ Lightning-fast compilation
- ✅ Smaller bundle sizes by default

**Verification:**
```bash
# Check production CSS size
npm run build
# Look for CSS file size in output
# Should be < 50KB (excellent)
```

**No action required** - Tailwind v4 handles this automatically.

---

### 6. CI/CD Lockfile Verification

**Status:** ⚠️ Needs Setup
**Priority:** Medium (prevents dependency drift)
**Effort:** 30 minutes

**Recommendation:** Add GitHub Actions workflow

**Implementation:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies (verify lockfile)
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test:integration
```

**Benefits:**
- Catches lockfile drift
- Ensures reproducible builds
- Prevents "works on my machine" issues
- Uses `npm ci` instead of `npm install` (strict)

---

### 7. Accessibility Improvements

**Status:** ✅ WCAG AA Basics Complete
**Priority:** Low (for WCAG AAA)
**Effort:** 1-2 hours

**Current Implementation:**
- ✅ ARIA labels on interactive regions
- ✅ ARIA modal on BottomSheet
- ✅ Semantic HTML throughout
- ✅ Keyboard navigation (via browser defaults)

**Future Enhancements (WCAG AAA):**
- Focus management (trap focus in modals)
- Skip navigation links
- Screen reader announcements for swipe actions
- High contrast mode support

**Implementation Example:**
```typescript
// Focus trap for BottomSheet
import { useEffect, useRef } from 'react'

function useF

ocusTrap() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    firstElement?.focus()

    // Trap focus within modal
    // ... implementation
  }, [])

  return ref
}
```

---

### 8. Performance Monitoring

**Status:** ⚠️ Basic Metrics Only
**Priority:** Medium
**Effort:** 2 hours

**Current State:**
- Next.js built-in analytics (basic)
- Console logging

**Recommended:**
```bash
# Add Vercel Analytics (free)
npm install @vercel/analytics

# app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Metrics to Track:**
- Core Web Vitals (LCP, FID, CLS)
- API response times
- Error rates
- User flows (recommendation views, contacts initiated)

---

## 🚀 Pre-Launch Checklist

Before deploying to production:

### Environment
- [ ] All environment variables set in Vercel
- [ ] `NODE_ENV=production` configured
- [ ] Clerk authentication keys configured
- [ ] Upstash Redis connected
- [ ] Supabase production database ready

### Security
- [ ] Admin routes gated (test with `REQUIRE_ADMIN_AUTH=true`)
- [ ] Rate limiting verified
- [ ] CORS configured (if needed)
- [ ] Environment validation enabled

### Performance
- [ ] Lighthouse score > 90
- [ ] Images optimized
- [ ] Build size < 100KB first load JS
- [ ] API response times < 500ms

### Monitoring
- [ ] Error tracking (Sentry or console monitoring)
- [ ] Analytics enabled (Vercel Analytics)
- [ ] Uptime monitoring configured
- [ ] Log aggregation set up

### Content
- [ ] SEO meta tags verified
- [ ] Open Graph images set
- [ ] 404 page customized
- [ ] Spanish copy reviewed

---

## 📊 Production Metrics Targets

### Performance
- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1
- **TTFB:** < 800ms

### Reliability
- **Uptime:** > 99.9%
- **Error rate:** < 0.1%
- **API success rate:** > 99.5%

### User Experience
- **Page load:** < 3s on 3G
- **Time to interactive:** < 5s
- **Build size:** < 100KB

---

## 🔄 Post-Launch Monitoring (First 48 Hours)

### Critical Metrics:
1. **Error rates** (check Sentry/logs every 4 hours)
2. **API failures** (monitor 500 responses)
3. **Rate limit hits** (check if legitimate users blocked)
4. **Performance** (Core Web Vitals in Vercel Analytics)

### Action Items:
- Set up alerts for error spikes
- Monitor Supabase query performance
- Review user feedback channels
- Check for unexpected traffic patterns

---

## 📝 Summary

**Production Readiness:** 🟢 **95% Complete**

**Ready to deploy:**
- ✅ All core functionality working
- ✅ Tests passing
- ✅ Error handling in place
- ✅ Performance optimized
- ✅ Security measures active

**Optional enhancements:**
- Sentry integration (1 hour)
- CI/CD workflow (30 min)
- Advanced DDoS protection (infrastructure-dependent)
- Additional test coverage (2 hours)
- WCAG AAA compliance (2 hours)

**Recommendation:** **Deploy now** and implement optional enhancements based on production metrics and business priorities.

---

**Questions or issues? See README.md for troubleshooting and support.**
