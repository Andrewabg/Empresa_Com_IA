














import type { FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { slugFato } from '@/lib/memory/fichaEmpresa'
import { normalizarTexto, palavrasDe } from './texto'
import { slotSuficiente } from './slots'
import type { OnboardingSession, Slot } from './types'





export interface CoberturaNucleo {
  
  respondidos: number
  
  comProfundidade: number
  total: number
  
  taxa: number
}

const RESPONDIDO: Slot['status'][] = ['coberto', 'pendente_commit']


export function coberturaDoNucleo(session: OnboardingSession): CoberturaNucleo {
  const nucleo = session.slots.filter((s) => s.nucleo)
  const respondidos = nucleo.filter((s) => RESPONDIDO.includes(s.status))
  const comProfundidade = respondidos.filter((s) => slotSuficiente(s))
  return {
    respondidos: respondidos.length,
    comProfundidade: comProfundidade.length,
    total: nucleo.length,
    taxa: nucleo.length ? comProfundidade.length / nucleo.length : 0,
  }
}






const VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'que', 'qual',
  'quais', 'quanto', 'quantos', 'como', 'onde', 'quem', 'por', 'para', 'pra', 'com', 'sem',
  'em', 'no', 'na', 'nos', 'nas', 'seu', 'sua', 'seus', 'suas', 'me', 'te', 'voce', 'vc',
  'e', 'eh', 'ser', 'ter', 'tem', 'faz', 'fazer', 'sobre', 'mais', 'ja', 'entao', 'isso',
])


function termos(texto: string): Set<string> {
  return new Set(palavrasDe(normalizarTexto(texto)).filter((p) => p.length >= 3 && !VAZIAS.has(p)))
}


export function ehRepergunta(
  pergunta: string,
  fatos: readonly FatoEmpresa[],
  opts: { limiar?: number } = {},
): boolean {
  const limiar = opts.limiar ?? 0.75
  const naPergunta = termos(pergunta)
  if (naPergunta.size === 0) return false
  return fatos.some((f) => {
    if (!(f.valor ?? '').trim()) return false 
    const doRotulo = termos(f.rotulo)
    if (doRotulo.size === 0) return false
    let batidas = 0
    for (const t of doRotulo) if (naPergunta.has(t)) batidas++
    return batidas / doRotulo.size >= limiar
  })
}


export function taxaDeRepergunta(perguntas: readonly string[], fatos: readonly FatoEmpresa[]): number {
  if (perguntas.length === 0) return 0
  return perguntas.filter((p) => ehRepergunta(p, fatos)).length / perguntas.length
}





export interface DeltaFicha {
  
  sobreviveram: number
  
  perdidos: string[]
  
  atualizados: string[]
  
  novos: string[]
  
  taxaSobrevivencia: number
}


export function compararFichas(antes: readonly FatoEmpresa[], depois: readonly FatoEmpresa[]): DeltaFicha {
  const idDe = (f: FatoEmpresa) => f.id || slugFato(f.rotulo)
  const mapaDepois = new Map(depois.map((f) => [idDe(f), f]))
  const idsAntes = new Set(antes.map(idDe))

  const perdidos: string[] = []
  const atualizados: string[] = []
  let sobreviveram = 0
  for (const f of antes) {
    const id = idDe(f)
    const novo = mapaDepois.get(id)
    if (!novo) { perdidos.push(id); continue }
    sobreviveram++
    if (novo.valor !== f.valor) atualizados.push(id)
  }
  const novos = depois.map(idDe).filter((id) => !idsAntes.has(id))

  return {
    sobreviveram,
    perdidos,
    atualizados,
    novos,
    taxaSobrevivencia: antes.length ? sobreviveram / antes.length : 1,
  }
}






export function formatarMetricasEntrevista(m: {
  cobertura?: CoberturaNucleo
  repergunta?: number
  delta?: DeltaFicha
}): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const linhas: string[] = []
  if (m.cobertura) {
    linhas.push(
      `cobertura do núcleo: ${m.cobertura.comProfundidade}/${m.cobertura.total} com profundidade ` +
        `(${m.cobertura.respondidos}/${m.cobertura.total} respondidos) = ${pct(m.cobertura.taxa)}`,
    )
  }
  if (m.repergunta !== undefined) linhas.push(`taxa de re-pergunta: ${pct(m.repergunta)} (menor é melhor)`)
  if (m.delta) {
    linhas.push(
      `Ficha: ${pct(m.delta.taxaSobrevivencia)} sobreviveram · ${m.delta.atualizados.length} atualizados · ` +
        `${m.delta.novos.length} novos · ${m.delta.perdidos.length} PERDIDOS${m.delta.perdidos.length ? ` (${m.delta.perdidos.join(', ')})` : ''}`,
    )
  }
  return linhas.join('\n')
}
