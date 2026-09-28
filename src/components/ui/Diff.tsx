import type { CSSProperties } from 'react'
import { parseParaExibicao, type DiffLine } from '@/lib/diff'





const SIGN: Record<DiffLine['kind'], string> = {
  add: '+',
  del: '-',
  context: '',
  hunk: '',
  header: '',
}

function lineStyle(kind: DiffLine['kind']): CSSProperties {
  switch (kind) {
    case 'add':
      return {
        background: 'color-mix(in srgb, var(--approve) 12%, transparent)',
        color: 'color-mix(in srgb, var(--approve) 78%, var(--text-primary))',
      }
    case 'del':
      return {
        background: 'color-mix(in srgb, var(--reject) 12%, transparent)',
        color: 'color-mix(in srgb, var(--reject) 78%, var(--text-primary))',
      }
    case 'hunk':
      return {
        background: 'transparent',
        color: 'var(--text-tertiary)',
      }
    case 'header':
      return {
        background: 'transparent',
        color: 'var(--text-tertiary)',
        fontWeight: 500,
      }
    default:
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
      }
  }
}


function gutterColor(kind: DiffLine['kind']): string {
  if (kind === 'add') return 'color-mix(in srgb, var(--approve) 92%, var(--text-primary))'
  if (kind === 'del') return 'color-mix(in srgb, var(--reject) 92%, var(--text-primary))'
  return 'var(--text-tertiary)'
}

interface DiffProps {
  
  source: string
  
  label?: string
}

export function Diff({ source, label = 'Diff da mudança no cérebro' }: DiffProps) {
  
  
  const lines = parseParaExibicao(source)

  return (
    <div
      role="figure"
      aria-label={label}
      style={{
        overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--bg-base)',
        fontFamily:
          'ui-monospace, "SF Mono", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
        fontSize: 12.5,
        lineHeight: 1.65,
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: '8px 0',
          overflowX: 'auto',
          
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {lines.map((line, i) => {
          const ls = lineStyle(line.kind)
          const isMeta = line.kind === 'hunk' || line.kind === 'header'
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0,
                paddingRight: 14,
                ...ls,
              }}
            >
              {}
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: 26,
                  textAlign: 'center',
                  userSelect: 'none',
                  color: gutterColor(line.kind),
                  opacity: SIGN[line.kind] ? 0.95 : 0.4,
                }}
              >
                {SIGN[line.kind]}
              </span>
              {}
              <span
                style={{
                  whiteSpace: 'pre',
                  fontStyle: isMeta ? 'normal' : undefined,
                  letterSpacing: isMeta ? '0.01em' : undefined,
                }}
              >
                {isMeta ? line.raw : line.text || ' '}
              </span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}
