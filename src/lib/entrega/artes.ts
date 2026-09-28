





import type { ArteDoItem } from './progresso'


export interface LinhaDeArte {
  id: string
  brief: unknown
  
  ultimaVersao?: { variacoes?: unknown; veredito?: unknown } | null
}


export function slotDaArte(brief: unknown): number | null {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) return null
  const n = (brief as { planoIndex?: unknown }).planoIndex
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : null
}


export function artifactDaArte(versao: LinhaDeArte['ultimaVersao']): string | undefined {
  const vars = Array.isArray(versao?.variacoes) ? (versao.variacoes as Array<Record<string, unknown>>) : []
  if (!vars.length) return undefined
  const escolhida = (versao?.veredito as { escolhida?: unknown } | undefined)?.escolhida
  if (typeof escolhida === 'number' && escolhida >= 0 && escolhida < vars.length) {
    const id = vars[escolhida]?.artifactId
    if (typeof id === 'string' && id) return id
  }
  for (const v of vars) {
    if (typeof v?.artifactId === 'string' && v.artifactId) return v.artifactId
  }
  return undefined
}


export function indexarArtesPorSlot(linhas: LinhaDeArte[]): Record<number, ArteDoItem> {
  const out: Record<number, ArteDoItem> = {}
  for (const l of linhas ?? []) {
    const slot = slotDaArte(l.brief)
    if (slot === null) continue
    const artifactId = artifactDaArte(l.ultimaVersao)
    out[slot] = { criativoId: l.id, ...(artifactId ? { artifactId } : {}) }
  }
  return out
}
