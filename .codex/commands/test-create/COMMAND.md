---
name: test-create
description: Generate Vitest/Playwright tests for a component, hook, utility, or API route
author: hara
arguments:
  - name: target
    description: Path to the file needing tests (e.g., app/r/[tracking_code]/hooks/useSwipeGesture.ts)
---

# Test Create Command

1. Read the target file to understand:
   - Type (component, hook, utility, API)
   - Inputs/outputs and edge cases
   - Dependencies or mocks required

2. Use the templates below to scaffold the suite, then tailor assertions to real behavior.

## React Component Template
```ts
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '{path}';

describe('ComponentName', () => {
  it('renders required props', () => {
    render(<ComponentName prop={value} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const onAction = vi.fn();
    render(<ComponentName onAction={onAction} />);
    await fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

## Custom Hook Template
```ts
import { renderHook, act } from '@testing-library/react';
import { useHookName } from '{path}';

describe('useHookName', () => {
  it('returns default values', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.value).toBe(defaultValue);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useHookName());
    act(() => {
      result.current.update(newValue);
    });
    expect(result.current.value).toBe(newValue);
  });
});
```

## Utility Template
```ts
import { describe, it, expect } from 'vitest';
import { fn } from '{path}';

describe('fn', () => {
  it('handles valid input', () => {
    expect(fn(valid)).toEqual(result);
  });

  it('handles edge cases', () => {
    expect(fn(null)).toBeNull();
  });
});
```

## API Route Template
```ts
describe('API: /api/{endpoint}', () => {
  it('returns 200 for valid payload', async () => {
    const res = await fetch(...);
    expect(res.status).toBe(200);
  });

  it('rejects invalid payload', async () => {
    const res = await fetch(...);
    expect(res.status).toBe(400);
  });
});
```

## Test Placement
- Integration tests: `__tests__/integration/{feature}.test.ts`
- E2E tests: `__tests__/e2e/{feature}.spec.ts`
- Unit tests: alongside source or in `__tests__/unit/`

After scaffolding, run `npm run test:integration` (or relevant suite) to validate.
