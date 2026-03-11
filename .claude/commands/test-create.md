---
description: Generate tests for a component, hook, or utility
argument-hint: "Path to file needing tests - e.g., 'app/r/[tracking_code]/hooks/useSwipeGesture.ts'"
---

## Target File

Target: $ARGUMENTS

First, read the target file to understand what needs testing:

1. Identify file type: React component, custom hook, utility function, or API route
2. Read the file to understand its structure
3. Identify testable elements

## Test Generation

### For React Components (`.tsx`)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '{path}';

describe('ComponentName', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ComponentName {...requiredProps} />);
      expect(screen.getByTestId('...')).toBeInTheDocument();
    });

    it('renders with required props', () => {
      render(<ComponentName prop1={value1} />);
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles click events', async () => {
      const onClick = vi.fn();
      render(<ComponentName onClick={onClick} />);

      await fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Conditional Rendering', () => {
    it('shows loading state', () => { /* ... */ });
    it('shows error state', () => { /* ... */ });
    it('shows empty state', () => { /* ... */ });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => { /* ... */ });
    it('supports keyboard navigation', () => { /* ... */ });
  });
});
```

### For Custom Hooks (`.ts`)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHookName } from '{path}';

describe('useHookName', () => {
  describe('Initialization', () => {
    it('returns expected interface', () => {
      const { result } = renderHook(() => useHookName());

      expect(result.current).toHaveProperty('property1');
      expect(result.current).toHaveProperty('method1');
    });

    it('starts with default values', () => {
      const { result } = renderHook(() => useHookName());
      expect(result.current.value).toBe(defaultValue);
    });
  });

  describe('State Updates', () => {
    it('updates state correctly', () => {
      const { result } = renderHook(() => useHookName());

      act(() => {
        result.current.updateMethod(newValue);
      });

      expect(result.current.value).toBe(newValue);
    });
  });

  describe('Cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => useHookName());
      unmount();
      // Verify cleanup happened
    });
  });
});
```

### For Utility Functions (`lib/*.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from '{path}';

describe('functionName', () => {
  it('returns correct result for valid input', () => {
    expect(functionName(validInput)).toBe(expected);
  });

  it('handles edge cases', () => {
    expect(functionName('')).toBe(expectedEmpty);
    expect(functionName(null)).toBe(expectedNull);
  });

  it('throws on invalid input', () => {
    expect(() => functionName(invalid)).toThrow();
  });
});
```

### For API Routes (`app/api/**/route.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API: /api/{endpoint}', () => {
  it('returns 200 for valid request', async () => {
    const res = await fetch(`${BASE_URL}/api/{endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success', true);
  });

  it('returns 400 for invalid input', async () => {
    const res = await fetch(`${BASE_URL}/api/{endpoint}`, {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
    });

    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    // Send requests exceeding rate limit
  });
});
```

## Test File Location

Place test files following hara's existing pattern:

- Integration tests: `__tests__/integration/{feature}.test.ts`
- E2E tests: `__tests__/e2e/{feature}.spec.ts`
- Unit tests: Co-located next to source file or in `__tests__/unit/`

## After Generation

1. Review generated tests — adjust values to match actual code
2. Run tests: `npm run test:integration`
3. Check for missing edge cases
4. Add to test suite
