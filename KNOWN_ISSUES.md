# Known Issues

**Last Updated:** 2026-01-07

---

## 1. Backdrop-Filter Blur Delay on Card Swipe

**Location:** `/r/[tracking_code]` - Card deck swipe interaction
**Severity:** Visual Polish (not blocking)
**Status:** Documented - Chrome browser limitation

### Description

When swiping between cards, there's a 1-2 second delay where:
1. Card scales/expands into position
2. Backdrop-filter blur activates after scaling completes
3. User briefly sees transparent card (faint white) before blur appears

### Root Cause

This is a **known Chrome/Chromium bug** when combining:
- `backdrop-filter: blur()`
- `transform: scale()` animations
- On the same element

Chrome recalculates the expensive backdrop-filter when the transform changes, causing the visible delay.

**Browser Bug Reports:**
- [Chromium Issue #1194050](https://bugs.chromium.org/p/chromium/issues/detail?id=1194050)
- [Tailwind Issue #4001](https://github.com/tailwindlabs/tailwindcss/issues/4001)

### Attempted Fixes

**❌ Tried:**
- `will-change: backdrop-filter` - No improvement
- `transform: translateZ(0)` - No improvement
- Separating blur onto non-scaling layer - Added complexity, still delayed
- Transition only specific properties (not `all`) - No improvement

**Why they didn't work:**
Chrome's rendering engine couples backdrop-filter recalculation with any transform change on parent or child elements.

### Possible Solutions (For Future)

**Option A: Wait for Browser Fix**
- Interop 2025 initiative includes backdrop-filter improvements
- May be resolved in future Chrome versions
- **Effort:** 0 (wait)
- **Timeline:** Unknown

**Option B: Remove Scale Animation**
- Keep backdrop-filter
- Remove scale effect from card peek/swipe
- Cards translate only (no scaling)
- **Effort:** 30 min
- **Impact:** Less depth perception

**Option C: Use Static Blur (Fake It)**
- Pre-render blurred version of background
- Swap images instead of using backdrop-filter
- **Effort:** 2 hours
- **Impact:** Not truly responsive to background changes

**Option D: Remove Backdrop-Filter**
- Use solid background color (no blur)
- Lose glass morphism effect
- **Effort:** 5 min
- **Impact:** Less premium feel

### Recommendation

**Keep as-is for now.** The delay is noticeable but:
- Glass effect looks premium when visible
- Issue is temporary (1-2 seconds)
- Doesn't break functionality
- May be fixed by browsers in future

Monitor: If users complain, implement Option B (remove scale).

---

## References

- [Chrome Backdrop-Filter Bug Fix](https://www.angularfix.com/2022/05/how-to-fix-css-backdrop-filter-blur.html)
- [Backdrop-Filter Performance Issues](https://github.com/shadcn-ui/ui/issues/327)
- [CSS Backdrop-Filter MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
