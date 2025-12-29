# Deprecated Documents

**Current Source of Truth:** FINAL_SPEC.md

---

## Superseded Documents (Do Not Use)

The following documents are **deprecated** and should not be referenced:

| Document | Deprecated Date | Reason |
|----------|----------------|--------|
| ARCHITECTURE_ANALYSIS.md | 2025-12-27 | Initial draft, had multiple approaches (not single path) |
| PRODUCTION_REQUIREMENTS.md | 2025-12-27 | Merged into FINAL_SPEC.md |
| SECURITY_FIXES.md | 2025-12-27 | Merged into FINAL_SPEC.md |
| FINAL_ARCHITECTURE.md | 2025-12-27 | Had P0 blockers (no signed tokens, PostgREST bypass) |
| FINAL_ARCHITECTURE_v2.md | 2025-12-27 | Had tracking_code mismatch, hard-coded partitions |
| FINAL_ARCHITECTURE_v3.md | 2025-12-27 | Superseded by FINAL_SPEC.md (consolidated) |
| OPERATIONAL_PLAN.md | 2025-12-27 | Had python3 dependencies, UNIQUE constraint violations |
| OPERATIONAL_PLAN_v2.md | 2025-12-27 | Had 1-professional seed (violates UNIQUE constraints) |
| CHANGES_SUMMARY.md | 2025-12-27 | Partial changes only |
| CHANGES_SUMMARY_v2.md | 2025-12-27 | Partial changes only |

---

## Why Documents Were Deprecated

**ARCHITECTURE_ANALYSIS.md:** Proposed 3 different tech stacks (Next.js vs Rails vs Cloudflare). We chose Next.js + Supabase. The analysis is historical context only.

**v1/v2 Architecture Docs:** Iteratively fixed security holes:
- v1: No signed attribution tokens
- v2: Added tokens, but had tracking_code NULL mismatch, hard-coded partition dates
- v3: Fixed all issues, then consolidated into FINAL_SPEC.md

**OPERATIONAL_PLAN v1/v2:** Had runability issues:
- v1: No QA seed script
- v2: Seed created 1 professional (violates UNIQUE constraint on match_recommendations)
- v3: Fixed to create 3 distinct professionals

---

## Current Documentation (v3)

**Use these only:**

1. **FINAL_SPEC.md** - Single source of truth (schema, code, security)
2. **IMPLEMENTATION_PLAN.md** - 4-week timeline with deliverables
3. **SELF_QA_RULES.md** - 7 validation rules (PASS/FAIL)
4. **CRITICAL_PATCHES_v3.md** - Detailed explanations of v3 fixes (reference only)

---

## Migration Path

If you started with deprecated documents:

1. **Delete deprecated files** (or move to /docs/archive/)
2. **Use FINAL_SPEC.md** as reference for all implementation
3. **Run `tsx scripts/qa-seed.ts`** to generate test data
4. **Validate with SELF_QA_RULES.md** (all 7 rules must pass)

---

**Use FINAL_SPEC.md only. All other architecture docs are deprecated.**
