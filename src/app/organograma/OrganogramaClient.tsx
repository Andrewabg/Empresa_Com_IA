'use client'


import { DEFAULT_BRANDING } from '@/lib/branding'
import type { ArvorePlano } from '@/lib/maestro-view'
import { resumoOrg, type OrgNodeUI } from '@/lib/organograma/orgView'
import { OrgChart } from '@/components/organograma/OrgChart'
import { PlanosVivos } from '@/components/organograma/PlanosVivos'

interface OrganogramaClientProps {
  tree: OrgNodeUI[]
  planos: ArvorePlano[]
  orquestrando: string[]
  nomesPorId: Record<string, string>
  
  assistantName?: string
}

export function OrganogramaClient({
  tree,
  planos,
  orquestrando,
  nomesPorId,
  assistantName = DEFAULT_BRANDING.assistantName,
}: OrganogramaClientProps) {
  const resumo = resumoOrg(tree)
  return (
    <div style={{ maxWidth: 1760, margin: '0 auto', padding: '28px clamp(24px, 3vw, 44px) 64px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 40,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Organograma</h1>
          <p style={{ color: 'var(--text-tertiary)' }}>
            Sua empresa, viva — quem responde a quem, agora.
          </p>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {resumo.pessoas} {resumo.pessoas === 1 ? 'pessoa' : 'pessoas'}
          {resumo.trabalhando > 0 && ` · ${resumo.trabalhando} trabalhando agora`}
        </span>
      </header>

      {tree.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)' }}>
          Nenhum agente ainda. Peça ao {assistantName} para contratar o primeiro.
        </p>
      ) : (
        <OrgChart tree={tree} orquestrando={orquestrando} />
      )}

      <PlanosVivos planos={planos} nomesPorId={nomesPorId} />
    </div>
  )
}
