







import { neutralizarCerca } from '@/lib/cercaDoPrompt'
import type { SwipeView } from '@/lib/estudio/types'

const norm = (s: string): string => (s ?? '').trim().toLowerCase()


export const MAX_CONTEUDO_DO_SWIPE = 700


export function selecionarSwipesDaCampanha(
  swipes: SwipeView[], canais: string[], n: number,
): SwipeView[] {
  if (!swipes.length || n <= 0) return []
  const alvos = new Set(canais.map(norm).filter(Boolean))
  if (!alvos.size) return swipes.slice(0, n)
  const casa = (sw: SwipeView) => (sw.tags ?? []).some((t) => alvos.has(norm(t)))
  const primarios = swipes.filter(casa)
  const secundarios = swipes.filter((sw) => !casa(sw))
  return [...primarios, ...secundarios].slice(0, n)
}

export function selecionarSwipes(
  swipes: SwipeView[], formato: string, n: number, canal?: string,
): SwipeView[] {
  if (!swipes.length || n <= 0) return []
  const alvos = new Set([norm(formato), norm(canal ?? '')].filter(Boolean))
  const casa = (sw: SwipeView) => (sw.tags ?? []).some((t) => alvos.has(norm(t)))
  if (!alvos.size) return swipes.slice(0, n)
  const primarios = swipes.filter(casa)
  const secundarios = swipes.filter((sw) => !casa(sw))
  return [...primarios, ...secundarios].slice(0, n)
}


export function renderSwipesParaPrompt(swipes: SwipeView[]): string {
  const blocos = (swipes ?? []).map((s) => {
    const d = s.desmontagem ?? {}
    const partes = [d.porqueFunciona, d.gancho ? `gancho: ${d.gancho}` : '', d.gatilhos?.length ? `gatilhos: ${d.gatilhos.join(', ')}` : '']
      .filter(Boolean).join('. ')
    const conteudo = neutralizarCerca((s.conteudo ?? '').replace(/\s+/g, ' ').trim()).slice(0, MAX_CONTEUDO_DO_SWIPE)
    const cabecalho = `- ${neutralizarCerca(s.titulo ?? '')}${partes ? `: ${neutralizarCerca(partes)}` : ''}`
    return conteudo ? `${cabecalho}\n  «swipe»${conteudo}«/swipe»` : cabecalho
  })
  return blocos.join('\n')
}
