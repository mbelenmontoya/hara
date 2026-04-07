// Skeleton loader for recommendation cards
// Shows while data is loading - matches card layout

'use client'

import { PageBackground } from '@/app/components/ui/PageBackground'

export function CardSkeleton() {
  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="pt-6 px-6 pb-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-surface-2 rounded-3xl" />
        {/* Name and specialty */}
        <div className="flex-1">
          <div className="h-5 bg-surface-2 rounded-lg w-32 mb-2" />
          <div className="h-4 bg-surface-2 rounded-lg w-20" />
        </div>
      </div>

      {/* Badge skeleton */}
      <div className="px-6 pb-3">
        <div className="h-6 bg-surface-2 rounded-full w-36" />
      </div>

      {/* Content skeleton */}
      <div className="px-6 pb-4 space-y-3">
        <div className="h-4 bg-surface-2 rounded-lg w-full" />
        <div className="h-4 bg-surface-2 rounded-lg w-5/6" />
        <div className="h-4 bg-surface-2 rounded-lg w-4/6" />
      </div>

      {/* Button skeleton */}
      <div className="px-6 pb-6">
        <div className="h-14 bg-surface-2 rounded-full w-full" />
      </div>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <PageBackground />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start pt-12 px-4">
        {/* Progress indicator skeleton */}
        <div className="flex gap-2 mb-8">
          <div className="w-8 h-1.5 bg-surface-2 rounded-full" />
          <div className="w-8 h-1.5 bg-surface-2 rounded-full" />
          <div className="w-8 h-1.5 bg-surface-2 rounded-full" />
        </div>

        {/* Card skeleton */}
        <div className="w-full max-w-md">
          <CardSkeleton />
        </div>

        {/* Subtle loading text */}
        <p className="text-sm text-muted mt-6 animate-pulse">
          Buscando profesionales...
        </p>
      </div>
    </div>
  )
}
