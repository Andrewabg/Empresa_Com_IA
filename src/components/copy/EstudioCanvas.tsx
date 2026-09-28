'use client'


import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import type { PecaView } from '@/lib/estudio/types'
import { PecaCard, type EdicaoDaCopy } from './PecaCard'
import { EsteiraPipeline } from './EsteiraPipeline'

interface EstudioCanvasProps {
  pecas: PecaView[]
  
  pecaFocadaId: string | null
  
  onFocar: (id: string) => void
  onAprovar?: (id: string) => void
  onArquivar?: (id: string) => void
  onRevisar?: (id: string) => void
  
  onMarcarNoAr?: (id: string) => void
  onAtualizarPerf?: (id: string) => void
  onDesvincular?: (id: string) => void
  
  onPedirArte?: (id: string) => void
  pedindoArte?: string | null
  
  edicao?: EdicaoDaCopy
}

export function EstudioCanvas({
  pecas,
  pecaFocadaId,
  onFocar,
  onAprovar,
  onArquivar,
  onRevisar,
  onMarcarNoAr,
  onAtualizarPerf,
  onDesvincular,
  onPedirArte,
  pedindoArte,
  edicao,
}: EstudioCanvasProps) {
  const reducedMotion = useReducedMotion() ?? false

  
  const grande =
    pecas.find((p) => p.id === pecaFocadaId) ??
    pecas.find((p) => p.status !== 'arquivada') ??
    pecas[0]

  
  
  if (!grande) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 'clamp(16px, 2.5vw, 28px)',
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={grande.id}
          layout={!reducedMotion}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={reducedMotion ? { duration: 0 } : springPreset}
        >
          <PecaCard
            peca={grande}
            focada
            onAprovar={onAprovar}
            onArquivar={onArquivar}
            onRevisar={onRevisar}
            onMarcarNoAr={onMarcarNoAr}
            onAtualizarPerf={onAtualizarPerf}
            onDesvincular={onDesvincular}
            onPedirArte={onPedirArte}
            pedindoArte={pedindoArte}
            edicao={edicao}
          />
        </motion.div>
      </AnimatePresence>

      <EsteiraPipeline pecas={pecas} focadaId={grande.id} onFocar={onFocar} />
    </div>
  )
}
