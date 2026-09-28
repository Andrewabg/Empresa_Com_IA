'use client'

import type { Agent, SaveState } from './types'
import { Card } from './parts'
import { VOZES, TIMBRES, vozInfo, VOZ_NAO_FALA, escolhaDeVoz, valorDoSelect, descricaoDaVozGuardada, type EscolhaDeVoz } from '@/lib/voicePalette'

const ROTULO: Record<string, string> = { masculina: 'Masculinas', feminina: 'Femininas', neutra: 'Neutras' }


export function VozCard({
  agent, save, onChange,
}: {
  agent: Agent
  save: SaveState
  onChange: (escolha: EscolhaDeVoz) => void
}) {
  const info = vozInfo(agent.voice)
  const muda = agent.voz_desligada ?? false
  return (
    <Card label="Voz" style={{ minWidth: 0, flex: '0 0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <select
          aria-label={`Voz de ${agent.name}`}
          value={valorDoSelect(agent.voice, muda)}
          onChange={(e) => onChange(escolhaDeVoz(e.target.value))}
          disabled={save.kind === 'saving'}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
            padding: '9px 11px', cursor: save.kind === 'saving' ? 'wait' : 'pointer', outline: 'none',
          }}
        >
          <option value="">Automática</option>
          <option value={VOZ_NAO_FALA}>Não fala (só texto)</option>
          {TIMBRES.map((t) => (
            <optgroup key={t} label={ROTULO[t]}>
              {VOZES.filter((v) => v.timbre === t).map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
          {muda
            ? descricaoDaVozGuardada(agent.voice)
            : info ? `${info.timbre} · ${info.descricao}` : 'Escolhida automaticamente pelo sistema.'}
        </span>
        {save.kind === 'saved' && <span style={{ fontSize: 12, color: 'var(--approve)' }}>✓ salvo</span>}
        {save.kind === 'error' && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{save.text}</span>}
      </div>
    </Card>
  )
}
