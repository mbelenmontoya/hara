---
description: Strict TypeScript patterns — no any, proper type guards, null safety
globs: app/**/*.ts, app/**/*.tsx, lib/**/*.ts
---

# TypeScript Rules

## ZERO `any` Policy

| Scenario | Wrong | Correct |
|----------|-------|---------|
| Unknown data | `any` | `unknown` |
| Dynamic objects | `any` | `Record<string, unknown>` |
| Arrays of unknowns | `any[]` | `unknown[]` |
| Function params | `(data: any)` | `(data: unknown)` + type guard |
| API response | `any` | Define interface or use `unknown` |
| Temporary bypass | `as any` | Fix the type or use `as unknown as T` |

```typescript
// ❌ WRONG
function process(data: any) {
  return data.value;
}

// ✅ Use unknown + type guard
function process(data: unknown) {
  if (isValidData(data)) return data.value;
  throw new Error('Invalid data');
}
```

## Type Guard Patterns

```typescript
// Basic type guard
function isProfessional(data: unknown): data is Professional {
  return typeof data === 'object' && data !== null && 'slug' in data && 'full_name' in data;
}

// Discriminated union
type ApiResult = { success: true; data: Professional } | { success: false; error: string };

function handleResult(result: ApiResult) {
  if (result.success) return result.data;
  throw new Error(result.error);
}
```

## Null Safety

```typescript
// Optional chaining + nullish coalescing
const name = professional?.full_name ?? 'Profesional';

// Early return narrows type
function getFirstName(rec: Recommendation | null): string {
  if (!rec) return '';
  return rec.professional.name?.split(' ')[0] || '';
}

// Handle find() returning undefined
const current = recommendations.find(r => r.rank === 1);
const name = current?.professional.name ?? 'Unknown';
```

## Utility Types Cheat Sheet

| Utility | Use For |
|---------|---------|
| `Partial<T>` | Optional properties for updates |
| `Pick<T, K>` | Select specific properties |
| `Omit<T, K>` | Exclude specific properties |
| `Record<K, V>` | Objects with typed keys/values |
| `ReturnType<typeof fn>` | Extract function return type |
| `NonNullable<T>` | Remove null/undefined |

## Exception: Test Files Only

In `.test.ts` and `.spec.ts` files, limited `any` is permitted:

```typescript
// ✅ Permitted in tests with ESLint disable + justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockResponse = { data: {} } as any; // Test mock - exact typing not critical
```
