import type { AgentTools, ToolFlag } from './types'
import { TOOL_DEFS } from './types'
import { Toggle } from './parts'
import { AVISO_QUEM_CONECTA_E_O_DONO } from '@/lib/agentes/somenteDono'






export function titleCaseFallback(slug: string) {
  return slug.split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}



export function PoderesCard({ tools, onChange, pendingConnect, pendingEnable, toolkitNames, isDono }: {
  tools: AgentTools
  onChange: (key: ToolFlag, v: boolean) => void
  
  pendingConnect?: string[]
  
  pendingEnable?: string[]
  
  toolkitNames?: Record<string, string>
  
  isDono: boolean
}) {
  const nameFor = (slug: string) => toolkitNames?.[slug] ?? titleCaseFallback(slug)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pendingConnect && pendingConnect.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 10px',
          borderRadius: 'var(--radius-sm)', background: 'rgb(214 158 46 / 0.08)',
          border: '1px solid rgb(214 158 46 / 0.22)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span aria-hidden style={{ color: 'rgb(214 158 46)' }}>⚠</span>
          <span>Precisa conectar: {pendingConnect.map(nameFor).join(', ')}</span>
          {isDono
            ? <a href="/config" style={{ color: 'rgb(214 158 46)', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>Ativar em /config →</a>
            : <span>{AVISO_QUEM_CONECTA_E_O_DONO}</span>}
        </div>
      )}
      {pendingEnable && pendingEnable.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 10px',
          borderRadius: 'var(--radius-sm)', background: 'rgb(214 158 46 / 0.08)',
          border: '1px solid rgb(214 158 46 / 0.22)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span aria-hidden style={{ color: 'rgb(214 158 46)' }}>⚠</span>
          <span>{pendingEnable.map(nameFor).join(', ')}: conectado, mas desligado nos Poderes deste agente. Ligue &quot;Ações externas&quot; abaixo.</span>
        </div>
      )}
      {TOOL_DEFS.map((t) => (
        <Toggle
          key={t.key}
          id={`agent-tool-${t.key}`}
          label={t.label}
          help={t.help}
          checked={tools[t.key] ?? false}
          onChange={(v) => onChange(t.key, v)}
        />
      ))}
    </div>
  )
}
