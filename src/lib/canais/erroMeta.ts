




export type AcaoFalha =
  | 'retry'                 
  | 'backoff'               
  | 'dead'                  
  | 'exige_template'        
  | 'contato_inalcancavel'  
  | 'avisar_dono'           

export interface ClassificacaoErro {
  codigo: number | null
  retryable: boolean
  
  retryAfterMs: number | null
  acao: AcaoFalha
  
  legenda: string
}


export const BACKOFF_PADRAO_MS = 60_000


export const LEGENDA_PRAZO_ESTOURADO =
  'O envio demorou demais e foi interrompido. Vamos re-tentar automaticamente.'


const PROMESSAS_DE_RETENTATIVA = [
  'Vamos re-tentar automaticamente.',
  'O envio será re-tentado sozinho.',
]


export const AVISO_NAO_SAI_POR_CONTA = 'Esta parte não vai sair por conta própria: mande você mesmo pelo painel.'


export function legendaSemRetentativa(legenda: string): string {
  let saida = legenda
  for (const promessa of PROMESSAS_DE_RETENTATIVA) {
    if (saida.includes(promessa)) saida = saida.replace(promessa, AVISO_NAO_SAI_POR_CONTA)
  }
  return saida
}


export function ehPrazoEstourado(err: unknown): boolean {
  const nome = (err as { name?: unknown } | null)?.name
  return nome === 'TimeoutError' || nome === 'AbortError'
}


export function classificarFalhaDeTransporte(err: unknown): ClassificacaoErro {
  if (ehPrazoEstourado(err)) {
    return { codigo: null, retryable: true, retryAfterMs: null, acao: 'retry', legenda: LEGENDA_PRAZO_ESTOURADO }
  }
  return classificarErroMeta({ mensagem: err instanceof Error ? err.message : String(err) })
}



const FALLBACK_TRANSITORIO = 'Falha temporária ao enviar. Vamos re-tentar automaticamente.'
const FALLBACK_PERMANENTE = 'A Meta recusou o envio e re-tentar não resolve.'

interface Regra { acao: AcaoFalha; legenda: string }


const REGRAS: Record<number, Regra> = {
  131047: { acao: 'exige_template', legenda: 'Passaram mais de 24h desde a última mensagem do cliente. Só um template aprovado reabre a conversa.' },
  131026: { acao: 'contato_inalcancavel', legenda: 'O WhatsApp não conseguiu entregar: o número pode não ter WhatsApp ou não aceita este tipo de mensagem.' },
  133010: { acao: 'contato_inalcancavel', legenda: 'Número não registrado no WhatsApp.' },
  130429: { acao: 'backoff', legenda: 'Limite de envio da Meta atingido. O envio será re-tentado sozinho.' },
  131048: { acao: 'avisar_dono', legenda: 'A Meta barrou o envio por suspeita de spam. A qualidade do número caiu: pare de disparar e revise o conteúdo.' },
  131049: { acao: 'avisar_dono', legenda: 'A Meta limitou mensagens de marketing para este cliente hoje. Não insista com ele agora.' },
  368: { acao: 'avisar_dono', legenda: 'O número foi bloqueado temporariamente por violação de política da Meta. Não envie mais nada até resolver.' },
  131031: { acao: 'avisar_dono', legenda: 'A conta do WhatsApp Business foi restringida ou bloqueada pela Meta.' },
  131042: { acao: 'avisar_dono', legenda: 'Problema de pagamento na conta da Meta: o envio fica suspenso até regularizar o método de cobrança.' },
  190: { acao: 'dead', legenda: 'A conexão com a Meta expirou ou foi revogada. Reconecte o canal no /config.' },
  100: { acao: 'dead', legenda: 'A Meta recusou a requisição por parâmetro inválido.' },

  
  
  
  
  
  551: { acao: 'contato_inalcancavel', legenda: 'Esta pessoa não pode receber mensagens da sua conta agora. Ela pode ter bloqueado o perfil ou restringido quem lhe manda mensagem.' },
}


const REGRAS_SUB: Record<number, Regra> = {
  2534014: { acao: 'dead', legenda: 'Passaram mais de sete dias desde o comentário, e a resposta no direct não alcança mais essa pessoa.' },
  2534022: { acao: 'dead', legenda: 'O Instagram já recebeu uma resposta no direct para este comentário. Cada comentário aceita apenas uma.' },
  2534023: { acao: 'dead', legenda: 'O Instagram já recebeu uma resposta no direct para este comentário. Cada comentário aceita apenas uma.' },
  2534048: { acao: 'dead', legenda: 'A Meta ainda não liberou sua conta para enviar mais de uma mensagem por comentário. A primeira sai normal; as seguintes só depois que ela aprovar seu aplicativo. Até lá, deixe a automação com uma mensagem só.' },
}


export const LEGENDAS_DAS_TABELAS: readonly string[] = [
  ...Object.values(REGRAS).map((r) => r.legenda),
  ...Object.values(REGRAS_SUB).map((r) => r.legenda),
]


function segundosDoHeader(header?: string | null): number | null {
  if (!header) return null
  const n = Number(header.trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 1000)
}

export function classificarErroMeta(input: {
  codigo?: number | null
  
  subcodigo?: number | null
  httpStatus?: number | null
  retryAfterHeader?: string | null
  mensagem?: string | null
}): ClassificacaoErro {
  const codigo = typeof input.codigo === 'number' && Number.isFinite(input.codigo) ? input.codigo : null
  const mensagem = (input.mensagem ?? '').trim()
  const http = typeof input.httpStatus === 'number' && Number.isFinite(input.httpStatus) ? input.httpStatus : null

  const sub = typeof input.subcodigo === 'number' && Number.isFinite(input.subcodigo) ? input.subcodigo : null

  const regra: Regra | undefined =
    
    (sub !== null ? REGRAS_SUB[sub] : undefined) ??
    (codigo !== null ? REGRAS[codigo] : undefined) ??
    
    (http === 429 ? REGRAS[130429] : undefined)

  if (regra) {
    const backoff = regra.acao === 'backoff'
    return {
      codigo,
      retryable: backoff,
      retryAfterMs: backoff ? (segundosDoHeader(input.retryAfterHeader) ?? BACKOFF_PADRAO_MS) : null,
      acao: regra.acao,
      legenda: regra.legenda,
    }
  }

  
  
  
  const transitorio = http === null || http >= 500
  const sufixo = mensagem ? ` (${mensagem})` : ''
  return {
    codigo,
    retryable: transitorio,
    retryAfterMs: null,
    acao: transitorio ? 'retry' : 'dead',
    legenda: `${transitorio ? FALLBACK_TRANSITORIO : FALLBACK_PERMANENTE}${sufixo}`,
  }
}


export function legendaTemMensagemCrua(legenda: string): boolean {
  return legenda.startsWith(FALLBACK_TRANSITORIO) || legenda.startsWith(FALLBACK_PERMANENTE)
}
