'use client'

// Fires a profile_view analytics event on mount — once per page load.
// Rendered as a sibling to server components in page.tsx so it runs client-side
// without affecting the server-rendered layout.

import { useEffect } from 'react'
import { fireProfileEvent } from '@/lib/profile-events'

interface ProfileViewTrackerProps {
  slug: string
}

export function ProfileViewTracker({ slug }: ProfileViewTrackerProps) {
  useEffect(() => {
    fireProfileEvent('profile_view', slug)
  }, [slug])

  return null
}
