



import type { GatilhoEscalacao, Sentimento, SinalTurno } from './escalacao'
import { sentimentoDoCliente } from './escalacao'
import { encurtarTitulo } from '@/lib/encurtarTitulo'


export const CAP_ULTIMAS = 6

export const CAP_ITENS = 6
const CAP_TEXTO = 220

export interface DossieHandoff {
  gatilho: GatilhoEscalacao | 'tool'
  motivo: string
  
  resumo: string
  sabemos: string[]
  falta: string[]
  sentimento: Sentimento
  
  tentativas: number
  ultimas: Array<{ autor: string; texto: string }>
  em: string
}

const MOTIVO_PADRAO: Record<string, string> = {
  pedido_explicito: 'O cliente pediu para falar com uma pessoa.',
  loop_improdutivo: 'A conversa travou — o agente repetiu a mesma resposta sem avançar.',
  frustracao: 'O cliente demonstrou irritação.',
  tool: 'O agente decidiu passar para o time.',
}


const corta = (s: string, n = CAP_TEXTO) => encurtarTitulo(s, n)
const limpo = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim()


function perguntasSemResposta(historico: SinalTurno[]): string[] {
  const out: string[] = []
  for (let i = 0; i < historico.length; i++) {
    const s = historico[i]
    if (s.autor === 'contato') continue
    const perguntas = limpo(s.texto).split(/(?<=\?)\s+/).filter((f) => f.includes('?'))
    if (!perguntas.length) continue
    
    const respostaDepois = historico.slice(i + 1).find((x) => x.autor === 'contato')
    if (!respostaDepois || !limpo(respostaDepois.texto)) out.push(...perguntas.map((p) => corta(limpo(p), 120)))
  }
  return out
}

export function montarDossie(input: {
  historico: SinalTurno[]
  
  ficha: { perfil: Readonly<Record<string, unknown>> | object; aprendizados: ReadonlyArray<{ texto: string }> }
  gatilho: GatilhoEscalacao | 'tool'
  motivo: string
  agora: string
  
  resumo?: string
  sabemos?: string[]
  falta?: string[]
}): DossieHandoff {
  const historico = input.historico ?? []
  const doCliente = historico.filter((s) => s.autor === 'contato').map((s) => limpo(s.texto)).filter(Boolean)

  const motivo = limpo(input.motivo) || MOTIVO_PADRAO[String(input.gatilho)] || 'Escalado para o time.'
  
  
  const resumo = corta(limpo(input.resumo ?? '') || doCliente[0] || motivo, 160)

  
  const daFicha = [
    ...Object.entries(input.ficha?.perfil ?? {})
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
      .map(([k, v]) => `${k}: ${String(v)}`),
    ...(input.ficha?.aprendizados ?? []).map((a) => limpo(a.texto)).filter(Boolean),
  ]
  const sabemos = dedup([...daFicha, ...(input.sabemos ?? []).map(limpo).filter(Boolean)]).slice(0, CAP_ITENS)
  const falta = dedup([...(input.falta ?? []).map(limpo).filter(Boolean), ...perguntasSemResposta(historico)]).slice(0, CAP_ITENS)

  return {
    gatilho: input.gatilho,
    motivo,
    resumo,
    sabemos,
    falta,
    sentimento: sentimentoDoCliente(doCliente.slice(-3)),
    tentativas: historico.filter((s) => s.autor === 'agente').length,
    ultimas: historico.slice(-CAP_ULTIMAS).map((s) => ({ autor: s.autor, texto: corta(limpo(s.texto)) })),
    em: input.agora,
  }
}

function dedup(itens: string[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const i of itens) {
    const k = i.toLowerCase()
    if (vistos.has(k)) continue
    vistos.add(k)
    out.push(i)
  }
  return out
}
