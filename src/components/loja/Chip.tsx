import type { CSSProperties, ReactNode } from 'react'




export { TOOL_LABELS, rotuloDeTool } from '@/lib/loja/rotulosDeTools'

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 11.5,
  fontWeight: 500,
  lineHeight: 1.4,
  color: 'var(--text-secondary)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 99,
  padding: '3px 10px',
  whiteSpace: 'nowrap',
}


export function Chip({ children }: { children: ReactNode }) {
  return <span style={chipStyle}>{children}</span>
}
