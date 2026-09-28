
import type { DirecaoArte } from '@/lib/design/direcaoArte'

export interface DesignGap { id: string; label: string; seed: string }

const GAPS: { id: string; label: string; seed: string; ok: (d: DirecaoArte) => boolean }[] = [
  { id: 'estilo', label: 'Estilo fotográfico', seed: 'Como as fotos da marca devem parecer — clean e minimalista, quente e humano, escuro e premium?', ok: (d) => !!d.estiloFotografico?.trim() },
  { id: 'paleta', label: 'Cores da marca', seed: 'Quais as cores da marca? (se tiver os códigos hex, melhor ainda)', ok: (d) => !!d.paleta?.length },
  { id: 'mood', label: 'Clima (mood)', seed: 'Que sensação as imagens devem passar — energia, calma, sofisticação, proximidade?', ok: (d) => !!d.mood?.trim() },
]

export interface DesignCoverage { cobertos: string[]; faltando: DesignGap[]; minDone: boolean }

export function designCoverage(d: DirecaoArte): DesignCoverage {
  const cobertos: string[] = []
  const faltando: DesignGap[] = []
  for (const g of GAPS) {
    if (g.ok(d)) cobertos.push(g.id)
    else faltando.push({ id: g.id, label: g.label, seed: g.seed })
  }
  return { cobertos, faltando, minDone: faltando.length === 0 }
}


export function temDirecaoDeArte(d: DirecaoArte): boolean {
  return designCoverage(d).cobertos.length > 0
}
