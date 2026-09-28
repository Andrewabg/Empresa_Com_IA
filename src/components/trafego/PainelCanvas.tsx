'use client'


import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import type { PainelBloco, MetricShape } from '@/lib/trafego/types'
import { KpiBlock } from './KpiTile'
import { TimeseriesBlock } from './TimeseriesBlock'
import { FunnelBlock } from './FunnelBlock'
import { CampaignTable } from './CampaignTable'
import { RecommendationCard } from './RecommendationCard'
import { NoteBlock } from './NoteBlock'
import { GoalsPacingBlock } from './GoalsPacingBlock'
import { ComparisonBlock } from './ComparisonBlock'
import { CreativesBlock } from './CreativesBlock'
import { AudiencesBlock } from './AudiencesBlock'
import { HealthBlock } from './HealthBlock'
import { DrilldownBlock } from './DrilldownBlock'
import { PlanoAcaoBlock } from './PlanoAcaoBlock'
import { HistoricoBlock } from './HistoricoBlock'


export interface SeriePonto {
  date: string
  value: number
}


export interface PainelBlocoComDados extends PainelBloco {
  metrics?: MetricShape
  series?: SeriePonto[]
}

interface PainelCanvasProps {
  blocos: PainelBlocoComDados[]
  
  onMarcarFeito?: (id: string, status: 'active' | 'done') => void
  
  onDrillCampanha?: (campaignId: string) => void
  
  onPedirCopy?: (blocoId: string) => void
  
  pedindoId?: string | null
  
  onPedirCriativo?: (blocoId: string) => void
  
  pedindoCriativoId?: string | null
}

export function PainelCanvas({ blocos, onMarcarFeito, onDrillCampanha, onPedirCopy, pedindoId, onPedirCriativo, pedindoCriativoId }: PainelCanvasProps) {
  const reducedMotion = useReducedMotion() ?? false

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 'clamp(16px, 2.5vw, 28px)',
      }}
    >
      <AnimatePresence initial={false}>
        {blocos.map((bloco) => (
          <motion.div
            key={bloco.id}
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
          >
            <BlocoDispatch bloco={bloco} onMarcarFeito={onMarcarFeito} onDrillCampanha={onDrillCampanha} onPedirCopy={onPedirCopy} pedindoId={pedindoId} onPedirCriativo={onPedirCriativo} pedindoCriativoId={pedindoCriativoId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}


function BlocoDispatch({
  bloco,
  onMarcarFeito,
  onDrillCampanha,
  onPedirCopy,
  pedindoId,
  onPedirCriativo,
  pedindoCriativoId,
}: {
  bloco: PainelBlocoComDados
  onMarcarFeito?: (id: string, status: 'active' | 'done') => void
  onDrillCampanha?: (campaignId: string) => void
  onPedirCopy?: (blocoId: string) => void
  pedindoId?: string | null
  onPedirCriativo?: (blocoId: string) => void
  pedindoCriativoId?: string | null
}) {
  switch (bloco.type) {
    case 'kpi':
      return <KpiBlock bloco={bloco} />
    case 'timeseries':
      return <TimeseriesBlock bloco={bloco} />
    case 'funnel':
      return <FunnelBlock bloco={bloco} />
    case 'table':
      return <CampaignTable bloco={bloco} onDrill={onDrillCampanha} />
    case 'recommendation':
      return <RecommendationCard bloco={bloco} onMarcarFeito={onMarcarFeito} onPedirCopy={onPedirCopy} pedindo={pedindoId === bloco.id} onPedirCriativo={onPedirCriativo} pedindoCriativo={pedindoCriativoId === bloco.id} />
    case 'note':
      return <NoteBlock bloco={bloco} />
    case 'goals':
      return <GoalsPacingBlock bloco={bloco} />
    case 'comparison':
      return <ComparisonBlock bloco={bloco} />
    case 'creatives':
      return <CreativesBlock bloco={bloco} />
    case 'audiences':
      return <AudiencesBlock bloco={bloco} />
    case 'health':
      return <HealthBlock bloco={bloco} />
    case 'drilldown':
      return <DrilldownBlock bloco={bloco} />
    case 'plano':
      return <PlanoAcaoBlock bloco={bloco} />
    case 'historico':
      return <HistoricoBlock bloco={bloco} />
    default:
      
      return null
  }
}
