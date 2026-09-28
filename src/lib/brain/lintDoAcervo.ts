
import { deriveId } from '@/lib/brain-frontmatter'

export interface AchadoDoLint {
  severidade: 'alta' | 'media'
  tipo: 'id-divergente' | 'escopo-vazio' | 'fora-do-indice' | 'orfa-no-indice'
  alvo: string
  explicacao: string
}

export interface EntradaDoLint {
  notasNoGit: string[]
  notasNoIndice: { id: string; path: string }[]
  
  escoposPorAgente: { agente: string; escopos: string[]; contratadoEm: string }[]
  
  agoraMs: number
}


const CARENCIA_ESCOPO_VAZIO_MS = 24 * 60 * 60 * 1000

export function lintDoAcervo(e: EntradaDoLint): AchadoDoLint[] {
  const achados: AchadoDoLint[] = []
  const gitSet = new Set(e.notasNoGit)
  const indicePaths = e.notasNoIndice.map((n) => n.path)
  const indiceSet = new Set(indicePaths)

  for (const n of [...e.notasNoIndice].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    if (n.id !== deriveId(n.path)) {
      achados.push({
        severidade: 'alta', tipo: 'id-divergente', alvo: n.path,
        explicacao: `A nota "${n.path}" está com identificação fora do padrão. Enquanto isso não for corrigido, toda atualização dela vai parar na sua fila de aprovações em vez de ser guardada sozinha.`,
      })
    }
  }

  for (const { agente, escopos, contratadoEm } of [...e.escoposPorAgente].sort((a, b) => (a.agente < b.agente ? -1 : 1))) {
    const norm = escopos.map((s) => s.trim().toLowerCase()).filter(Boolean)
    if (!norm.length) continue 
    const casa = indicePaths.some((p) => norm.some((s) => p.toLowerCase().startsWith(s)))
    if (casa) continue
    const idadeMs = e.agoraMs - Date.parse(contratadoEm)
    if (idadeMs < CARENCIA_ESCOPO_VAZIO_MS) continue 
    achados.push({
      severidade: 'alta', tipo: 'escopo-vazio', alvo: agente,
      explicacao: `O funcionário "${agente}" está configurado para ler uma pasta que não existe no seu Cérebro. Hoje ele responde como se a empresa não tivesse memória nenhuma.`,
    })
  }

  for (const p of [...e.notasNoGit].sort()) {
    if (!indiceSet.has(p)) {
      achados.push({
        severidade: 'media', tipo: 'fora-do-indice', alvo: p,
        explicacao: `A nota "${p}" está guardada mas ainda não entrou na busca. Normalmente isso se resolve sozinho na próxima passada.`,
      })
    }
  }

  for (const p of [...indicePaths].sort()) {
    if (!gitSet.has(p)) {
      achados.push({
        severidade: 'media', tipo: 'orfa-no-indice', alvo: p,
        explicacao: `A busca ainda lista "${p}", que não está mais guardada. Normalmente isso se resolve sozinho na próxima passada.`,
      })
    }
  }

  return achados
}


export const CHAVE_LINT_ALTAS_AVISADAS = 'cerebro_lint_altas_avisadas'


export interface ResumoAltasDoLint {
  altas: number
  primeiros: string[]
}


export function resumoDoLint(r: ResumoAltasDoLint): { titulo: string; corpo: string } | null {
  if (!r.altas || !r.primeiros.length) return null
  const titulo = r.altas === 1
    ? 'Um problema no seu Cérebro está travando algo, e não vai se resolver sozinho'
    : `${r.altas} problemas no seu Cérebro estão travando algo, e não vão se resolver sozinhos`
  return { titulo, corpo: r.primeiros.join(' ') }
}


export function deveAvisarLintAltas(altas: number, jaAvisadas: number | null): boolean {
  if (!Number.isFinite(altas) || altas <= 0) return false
  const base = Number.isFinite(jaAvisadas as number) && (jaAvisadas as number) > 0 ? (jaAvisadas as number) : 0
  return altas > base
}


export function deveResincronizarLintAltas(altas: number, jaAvisadas: number | null): boolean {
  if (!Number.isFinite(altas) || altas < 0) return false
  const base = Number.isFinite(jaAvisadas as number) && (jaAvisadas as number) > 0 ? (jaAvisadas as number) : 0
  return altas < base
}


export type AcaoDoAvisoDoLint = 'nada' | 'resincronizar' | 'avisar'


export function acaoDoAvisoDoLint(altas: number, jaAvisadas: number | null): AcaoDoAvisoDoLint {
  if (deveResincronizarLintAltas(altas, jaAvisadas)) return 'resincronizar'
  if (deveAvisarLintAltas(altas, jaAvisadas)) return 'avisar'
  return 'nada'
}


function digestFnv1a(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}


export const TIPO_AVISO_LINT_ACERVO = 'lint_acervo'


export function chaveDeDedupDoLint(r: ResumoAltasDoLint): string {
  return `${TIPO_AVISO_LINT_ACERVO}:${r.altas}:${digestFnv1a(r.primeiros.join('\u0000'))}`
}


export const CHAVE_LINT_ULTIMO_RESUMO = 'cerebro_lint_ultimo_resumo'


export const VALIDADE_DO_RESUMO_MS = 7 * 24 * 60 * 60 * 1000

export interface ResumoGravadoDoLint {
  altas: number
  primeiros: string[]
  
  emIso: string
}


export function serializarResumoDoLint(r: ResumoAltasDoLint, emIso: string): string {
  return JSON.stringify({ altas: r.altas, primeiros: r.primeiros, em: emIso })
}


export function lerResumoDoLintGravado(bruto: string | null | undefined): ResumoGravadoDoLint | null {
  if (!bruto || !bruto.trim()) return null
  let o: unknown
  try { o = JSON.parse(bruto) } catch { return null }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null
  const r = o as { altas?: unknown; primeiros?: unknown; em?: unknown }
  if (typeof r.altas !== 'number' || !Number.isFinite(r.altas) || r.altas < 0) return null
  if (!Array.isArray(r.primeiros) || r.primeiros.some((p) => typeof p !== 'string')) return null
  if (typeof r.em !== 'string' || !r.em.trim()) return null
  return { altas: r.altas, primeiros: r.primeiros as string[], emIso: r.em }
}


export function avisoDoLintNoPainel(
  bruto: string | null | undefined,
  agoraMs: number,
): { titulo: string; corpo: string } | null {
  const gravado = lerResumoDoLintGravado(bruto)
  if (!gravado) return null
  const em = Date.parse(gravado.emIso)
  if (!Number.isFinite(em)) return null
  if (agoraMs - em > VALIDADE_DO_RESUMO_MS) return null
  return resumoDoLint(gravado)
}
