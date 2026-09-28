'use client'


import { useId } from 'react'

export interface ArestaView {
  
  key: string
  d: string
  
  pulso: boolean
}

export function OrgConnectors({
  arestas,
  width,
  height,
}: {
  arestas: ArestaView[]
  width: number
  height: number
}) {
  const gradId = 'org-grad-' + useId().replace(/:/g, '')
  if (width <= 0 || height <= 0 || arestas.length === 0) return null
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        {}
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={width}
          y2={height}
        >
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      {arestas.map((a) => (
        <g key={a.key}>
          <path d={a.d} fill="none" stroke="var(--border-hairline)" strokeWidth={1} />
          {a.pulso && (
            <path
              d={a.d}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.9}
              className="org-aresta-pulso"
            />
          )}
        </g>
      ))}
    </svg>
  )
}
