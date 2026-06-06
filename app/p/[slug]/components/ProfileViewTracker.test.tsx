import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProfileViewTracker } from './ProfileViewTracker'

const mockFireProfileEvent = vi.fn()
vi.mock('@/lib/profile-events', () => ({
  fireProfileEvent: (...args: unknown[]) => mockFireProfileEvent(...args),
}))

describe('ProfileViewTracker', () => {
  it('fires profile_view event on mount with the given slug', () => {
    render(<ProfileViewTracker slug="silvia-ferrer" />)
    expect(mockFireProfileEvent).toHaveBeenCalledWith('profile_view', 'silvia-ferrer')
    expect(mockFireProfileEvent).toHaveBeenCalledTimes(1)
  })

  it('renders nothing visible', () => {
    const { container } = render(<ProfileViewTracker slug="test-slug" />)
    expect(container.firstChild).toBeNull()
  })
})
