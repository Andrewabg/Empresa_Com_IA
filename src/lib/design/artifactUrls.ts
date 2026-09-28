
import type { CriativoView } from './types'
import { SUFIXO_ARTE_FINAL, sufixoDoConceito } from './legendaDaArte'


export function coletarArtifactIds(criativos: CriativoView[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of criativos) {
    for (const v of c.variacoes) {
      if (v.artifactId && !seen.has(v.artifactId)) { seen.add(v.artifactId); out.push(v.artifactId) }
    }
  }
  return out
}


export function montarInitialUrls(
  pares: { artifactId: string }[],
  assinadas: ({ signedUrl: string | null } | undefined)[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < pares.length; i++) {
    const url = assinadas[i]?.signedUrl
    if (url) out[pares[i].artifactId] = url
  }
  return out
}


export interface ArteAbrivel {
  id: string; title: string; kind: 'imagem'; content: null
  conversation_id: null; task_id: null; agent_id: string
  storage_ref: null; summary: null; status: string; version: number; parent_id: null
  created_at: string
}


export function artesAbriveis(criativos: CriativoView[]): ArteAbrivel[] {
  const seen = new Set<string>()
  const out: ArteAbrivel[] = []
  const push = (id: string, title: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push({
      id, title, kind: 'imagem', content: null,
      conversation_id: null, task_id: null, agent_id: 'designer',
      storage_ref: null, summary: null, status: 'pronto', version: 1, parent_id: null,
      created_at: '',
    })
  }
  for (const c of criativos) {
    const titulo = c.titulo || 'Peça sem título'
    for (const v of c.variacoes) {
      if (v.final) push(v.artifactId, `${titulo}${SUFIXO_ARTE_FINAL}`)
    }
    for (const v of c.variacoes) {
      if (!v.final) push(v.artifactId, v.conceito ? `${titulo}${sufixoDoConceito(v.conceito)}` : titulo)
    }
  }
  return out
}
