'use client'

import { useReducedMotion } from '@/lib/motion'
import type { CSSProperties } from 'react'

interface SkeletonProps {
  
  width?: number | string
  
  height?: number | string
  
  radius?: number | string
  
  circle?: boolean
  className?: string
  style?: CSSProperties
}


export function Skeleton({
  width = '100%',
  height = 14,
  radius,
  circle = false,
  className,
  style,
}: SkeletonProps) {
  const reducedMotion = useReducedMotion() ?? false
  const size = circle ? height : undefined

  return (
    <span
      aria-hidden
      className={className}
      data-skeleton
      style={{
        display: 'block',
        width: circle ? size : width,
        height,
        borderRadius: circle ? '50%' : (radius ?? 'var(--radius-sm)'),
        
        background: 'var(--surface-elevated)',
        position: 'relative',
        overflow: 'hidden',
        
        opacity: reducedMotion ? 0.6 : 1,
        ...style,
      }}
    >
      {}
      {!reducedMotion && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translateX(-100%)',
            background:
              'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.05) 50%, transparent 100%)',
            animation: 'awave-shimmer 1.4s ease-in-out infinite',
          }}
        />
      )}
    </span>
  )
}


export function SkeletonText({
  lines = 3,
  gap = 9,
  lineHeight = 13,
}: {
  lines?: number
  gap?: number
  lineHeight?: number
}) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? '62%' : '100%'}
        />
      ))}
    </span>
  )
}
