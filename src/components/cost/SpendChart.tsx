'use client'

import { useId } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import {
  buildAreaPath,
  buildLinePath,
  niceTicks,
  scaleLinear,
  seriesToPoints,
  maxOf,
  fmtAxis,
} from '@/lib/chart'
import type { MockCostPoint } from '@/mock/types'

interface SpendChartProps {
  series: MockCostPoint[]
}


const VW = 720 
const VH = 220 
const PAD = { top: 16, right: 8, bottom: 26, left: 44 }
const PLOT_W = VW - PAD.left - PAD.right
const PLOT_H = VH - PAD.top - PAD.bottom


function xTickIndices(n: number): number[] {
  if (n <= 1) return n === 1 ? [0] : []
  if (n === 2) return [0, 1]
  return [0, Math.floor((n - 1) / 2), n - 1]
}


function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}


export function SpendChart({ series }: SpendChartProps) {
  const reduced = useReducedMotion() ?? false
  const uid = useId().replace(/:/g, '')
  const gradId = `wave-fill-${uid}`
  const strokeId = `wave-stroke-${uid}`
  const clipId = `plot-clip-${uid}`

  const values = series.map((p) => p.usd)
  const dataMax = maxOf(values)
  const ticks = niceTicks(dataMax, 4)
  const axisMax = ticks[ticks.length - 1] || 1 

  const areaD = buildAreaPath(values, PLOT_W, PLOT_H, axisMax)
  const lineD = buildLinePath(values, PLOT_W, PLOT_H, axisMax)
  const pts = seriesToPoints(values, PLOT_W, PLOT_H, axisMax)
  const lastPt = pts[pts.length - 1]

  const xIdx = xTickIndices(series.length)

  const empty = series.length === 0

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        role="img"
        aria-label="Gasto diário ao longo do tempo"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          {}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wave-from)" stopOpacity="0.26" />
            <stop offset="55%" stopColor="var(--wave-to)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--wave-to)" stopOpacity="0" />
          </linearGradient>
          {}
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--wave-from)" />
            <stop offset="100%" stopColor="var(--wave-to)" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {}
        <g>
          {ticks.map((t) => {
            const y = PAD.top + scaleLinear(t, [0, axisMax], [PLOT_H, 0])
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={VW - PAD.right}
                  y2={y}
                  stroke="var(--border-hairline)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD.left - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{
                    fill: 'var(--text-tertiary)',
                    fontSize: 11,
                    fontFamily: 'var(--font-ui)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtAxis(t)}
                </text>
              </g>
            )
          })}
        </g>

        {!empty && (
          <g transform={`translate(${PAD.left} ${PAD.top})`}>
            {}
            <g clipPath={`url(#${clipId})`}>
              <motion.path
                d={areaD}
                fill={`url(#${gradId})`}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 0.15, ease: 'easeOut' }}
              />
            </g>
            <motion.path
              d={lineD}
              fill="none"
              stroke={`url(#${strokeId})`}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.85, ease: 'easeInOut' }}
            />
            {}
            {lastPt && (
              <motion.circle
                cx={lastPt.x}
                cy={lastPt.y}
                r={3}
                fill="var(--bg-base)"
                stroke="var(--wave-to)"
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.3, delay: 0.7, ease: 'easeOut' }}
              />
            )}
          </g>
        )}

        {}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={VW - PAD.right}
          y2={PAD.top + PLOT_H}
          stroke="var(--border-hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {xIdx.map((i) => {
          const p = pts[i]
          if (!p) return null
          const x = PAD.left + p.x
          return (
            <text
              key={i}
              x={x}
              y={PAD.top + PLOT_H + 16}
              textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
              style={{
                fill: 'var(--text-tertiary)',
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {shortDate(series[i].date)}
            </text>
          )
        })}
      </svg>
    </figure>
  )
}
