// Component test setup — runs before each component test file
// Sets up jest-dom matchers and mocks Next.js browser APIs

import React from 'react'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Node 26 defines localStorage as an experimental global that is undefined
// without --localstorage-file, shadowing jsdom's implementation.
// Provide a stateful in-memory shim so test code can read/write/clear it.
const _lsStore = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => _lsStore.get(k) ?? null,
  setItem:    (k: string, v: string) => { _lsStore.set(k, v) },
  removeItem: (k: string) => { _lsStore.delete(k) },
  clear:      () => { _lsStore.clear() },
  get length() { return _lsStore.size },
  key:        (i: number) => Array.from(_lsStore.keys())[i] ?? null,
})

// Mock next/navigation — components use these hooks but they need a router context
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next/image — render a plain <img> (React element, not DOM node)
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}))

// Mock next/link — render a plain <a> (React element, not DOM node)
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', { href: href as string, ...props }, children),
}))

