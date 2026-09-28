
import { serverDb } from '@/server/supabase'
import { enqueueCandidate } from '@/brain/curator/candidates'
import { recordEvent } from '@/data/events'
import { agregarUsoPromovivel } from '@/data/sinalDeUso'
import { hashDoConteudo } from '@/lib/memory/origemDaCandidata'
import { ORIGENS_PROMOVIVEIS } from '@/lib/memory/origemDoEpisodico'
import { diaDoSinal } from '@/lib/memory/sinalDeUso'
import { fusoDoDonoMemoizado } from '@/server/config/fusoDoDonoMemo'
import {
  IDADE_MAXIMA_DIAS,
  MIN_CONSULTAS,
  MIN_DIAS,
  MIN_SINAIS,
  TETO_POR_VARREDURA,
  escolherParaPromover,
  medidaDoAgregado,
  type AgregadoDeUso,
} from '@/lib/memory/promocaoPorUso'


export const FONTE_PROMOCAO = 'promocao_por_uso'


export const LOTE_DA_AGREGACAO = TETO_POR_VARREDURA * 5

export interface ResultadoDaPromocao {
  
  examinados: number
  
  promovidos: number
  
  jaPromovidos: number
  
  medido: boolean
}


export function resultadoVazioDaPromocao(): ResultadoDaPromocao {
  return { examinados: 0, promovidos: 0, jaPromovidos: 0, medido: false }
}

export interface PromocaoDeps {
  agregar?: typeof agregarUsoPromovivel
  
  jaPromovidos?: (ids: string[]) => Promise<Set<string>>
  enfileirar?: (c: Record<string, unknown>) => Promise<{ error?: { message: string } | null }>
  registrarEvento?: typeof recordEvent
  getTz?: () => Promise<string>
  now?: () => number
}


export function interpretarPromovidos(
  resposta: { data?: { source_ref?: unknown }[] | null; error?: { message?: string } | null },
): Set<string> {
  if (resposta.error) {
    console.warn('[promocaoPorUso] leitura de já promovidos falhou; rodada pulada:', resposta.error.message)
    throw new Error('promocaoPorUso: não foi possível conferir o que já foi promovido')
  }
  const fora = new Set<string>()
  for (const linha of resposta.data ?? []) {
    const ref = linha?.source_ref
    if (typeof ref === 'string' && ref) fora.add(ref)
  }
  return fora
}


async function jaPromovidosPadrao(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  return interpretarPromovidos(
    await serverDb()
      .from('memory_candidates')
      .select('source_ref')
      .eq('source_type', FONTE_PROMOCAO)
      .in('source_ref', ids),
  )
}


export async function runPromocaoPorUso(deps: PromocaoDeps = {}): Promise<ResultadoDaPromocao> {
  const agregar = deps.agregar ?? agregarUsoPromovivel
  const jaPromovidos = deps.jaPromovidos ?? jaPromovidosPadrao
  const enfileirar =
    deps.enfileirar ?? (async (c: Record<string, unknown>) => enqueueCandidate(serverDb(), c))
  const registrarEvento = deps.registrarEvento ?? recordEvent
  const agoraMs = (deps.now ?? Date.now)()

  try {
    const tz = await (deps.getTz ?? fusoDoDonoMemoizado)()
    const agoraIso = new Date(agoraMs).toISOString()
    const hojeLocal = diaDoSinal(agoraIso, tz)
    const desdeIso = new Date(agoraMs - IDADE_MAXIMA_DIAS * 86_400_000).toISOString()

    const agregados: AgregadoDeUso[] = await agregar({
      origens: ORIGENS_PROMOVIVEIS,
      desdeIso,
      minSinais: MIN_SINAIS,
      minConsultas: MIN_CONSULTAS,
      minDias: MIN_DIAS,
      limite: LOTE_DA_AGREGACAO,
    })
    if (!agregados.length) return { examinados: 0, promovidos: 0, jaPromovidos: 0, medido: true }

    const porId = new Map(agregados.map((a) => [a.alvo_id, a]))
    const escolhidos = escolherParaPromover(
      agregados.map((a) => medidaDoAgregado(a, agoraIso, hojeLocal)),
    )
    const vistos = await jaPromovidos(escolhidos.map((m) => m.alvoId))

    let promovidos = 0
    let pulados = 0
    const idsPromovidos: string[] = []
    for (const m of escolhidos) {
      if (vistos.has(m.alvoId)) { pulados++; continue }
      const agregado = porId.get(m.alvoId)
      const texto = (agregado?.resumo ?? '').trim()
      if (!texto) continue
      try {
        const { error } = await enfileirar({
          source_type: FONTE_PROMOCAO,
          source_ref: m.alvoId,
          raw_content: texto,
          suggested_type: 'episodic',
          author_agent: 'jarvis',
          status: 'pending',
          
          
          
          origin_class: 'agente',
          content_hash: hashDoConteudo(texto),
        })
        if (error) {
          console.warn('[promocaoPorUso] enfileirar falhou (segue):', error.message)
          continue
        }
        promovidos++
        idsPromovidos.push(m.alvoId)
      } catch (e) {
        console.warn('[promocaoPorUso] enfileirar falhou (segue):', e)
      }
    }

    if (promovidos > 0) {
      try {
        await registrarEvento({
          
          
          
          id: `promocao:${hojeLocal}:${hashDoConteudo(idsPromovidos.join(','))}`,
          type: 'memory',
          label:
            promovidos === 1
              ? 'Uma memória que você voltou a consultar entrou na fila para virar permanente'
              : `${promovidos} memórias que você voltou a consultar entraram na fila para virar permanentes`,
          agent: 'jarvis',
        })
      } catch (e) {
        console.warn('[promocaoPorUso] evento fail-open:', e)
      }
    }

    return { examinados: agregados.length, promovidos, jaPromovidos: pulados, medido: true }
  } catch (e) {
    console.warn('[promocaoPorUso] braço fail-open:', e)
    return resultadoVazioDaPromocao()
  }
}
