// Component test setup — runs before each component test file
// Sets up jest-dom matchers and mocks Next.js browser APIs

import React from 'react'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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
