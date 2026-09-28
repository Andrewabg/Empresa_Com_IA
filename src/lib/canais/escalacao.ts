









const SENSIVEL = /(reembols|estorn|chargeback|cancel|process(o|ar|ando)|advogad|jur[íi]dic|procon|reclame aqui|fraude|cobran[çc]a indevida)/i
export function topicoSensivel(texto: string): boolean {
  return SENSIVEL.test(texto ?? '')
}


const PEDIU_HUMANO = new RegExp(
  [
    
    '\\b(quero|queria|gostaria|preciso|pode(ria)?|posso|me)\\b[^.?!]{0,40}\\b(falar|conversar|atendimento|atendente|humano|pessoa real|gente de verdade|supervisor|gerente)\\b',
    
    '\\b(me (passa|transfere|transfira|conecta)|transfer(e|ir)|chama(r)? (um|uma|o|a) (humano|atendente|supervisor|gerente))\\b',
    
    '\\b(atendimento humano|atendente humano|falar com humano|falar com uma pessoa|falar com alguém|falar com alguem)\\b',
  ].join('|'),
  'i',
)


const FALSO_POSITIVO = /pessoa (f[íi]sica|jur[íi]dica)/i

export function pediuHumano(texto: string): boolean {
  const t = texto ?? ''
  if (!t.trim()) return false
  if (FALSO_POSITIVO.test(t) && !/\b(atendente|humano|supervisor|gerente)\b/i.test(t.replace(FALSO_POSITIVO, ''))) {
    return false
  }
  return PEDIU_HUMANO.test(t)
}


const IRRITADO = /(absurd|inaceit[áa]vel|p[ée]ssim|horr[íi]vel|revoltad|indignad|palha[çc]ada|vergonha|nunca mais|processar voc|procon|n[ãa]o aguento)/i
const INSATISFEITO = /(demora|demorand|de novo|outra vez|j[áa] falei|j[áa] disse|n[ãa]o resolve|n[ãa]o resolveu|cansei|complicad)/i

export type Sentimento = 'neutro' | 'insatisfeito' | 'irritado'

export function sentimentoDoCliente(textos: string[]): Sentimento {
  const junto = textos.join(' \n ')
  if (IRRITADO.test(junto)) return 'irritado'
  if (INSATISFEITO.test(junto)) return 'insatisfeito'
  return 'neutro'
}

export interface SinalTurno { autor: 'contato' | 'agente' | 'operador'; texto: string }


function chave(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


function repetido(a: string, b: string): boolean {
  const x = chave(a)
  const y = chave(b)
  if (x.length < 12 || y.length < 12) return false
  return x === y || x.includes(y) || y.includes(x)
}


export function turnosImprodutivos(historico: SinalTurno[], janela = 8): number {
  const recentes = historico.slice(-janela)
  const doAgente = recentes.filter((s) => s.autor === 'agente').map((s) => s.texto)
  const doCliente = recentes.filter((s) => s.autor === 'contato').map((s) => s.texto)

  const conta = (falas: string[]): number => {
    let n = 0
    for (let i = falas.length - 1; i > 0; i--) {
      if (!repetido(falas[i], falas[i - 1])) break
      n += 1
    }
    return n
  }
  return Math.max(conta(doAgente), conta(doCliente))
}

export type GatilhoEscalacao = 'pedido_explicito' | 'loop_improdutivo' | 'frustracao' | null


export function gatilhoEscalacao(
  historico: SinalTurno[],
  cfg: { tetoImprodutivos?: number } = {},
): GatilhoEscalacao {
  const teto = cfg.tetoImprodutivos ?? 2
  const doCliente = historico.filter((s) => s.autor === 'contato').map((s) => s.texto)
  if (!doCliente.length) return null

  const ultima = doCliente[doCliente.length - 1]
  if (pediuHumano(ultima)) return 'pedido_explicito'
  
  
  
  if (sentimentoDoCliente([ultima]) === 'irritado') return 'frustracao'
  if (turnosImprodutivos(historico) >= teto) return 'loop_improdutivo'
  return null
}


export const AVISO_ESCALACAO = 'Um momento — vou te passar para alguém do nosso time. 🙏'
