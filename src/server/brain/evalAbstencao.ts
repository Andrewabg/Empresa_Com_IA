


export type VeredictoAbstencao = 'abstencao' | 'inventou' | 'respondeu'

export interface CasoAbstencao {
  pergunta: string
  
  contexto: string
  resposta: string
}


const PADROES_ABSTENCAO: readonly RegExp[] = [
  /\bn[ãa]o\s+(tenho|sei|encontrei|consta|localizei|achei|vejo|há|tem)\b/i,
  /\bn[ãa]o\s+est[áa]\s+(no|na|nos|nas|registrad)/i,
  /\bsem\s+(registro|informa[çc][ãa]o|dado)\b/i,
  /\bn[ãa]o\s+consigo\s+(confirmar|dizer|precisar)\b/i,
  /\b(me\s+)?confirma\b|\bvoc[êe]\s+pode\s+(confirmar|me\s+dizer)\b|\bqual\s+[ée]\b.*\?/i,
  /\bprecis(o|aria)\s+que\s+voc[êe]\b/i,
]


const RE_ESPECIFICO = /R\$\s?[\d.,]+|\d+\s?%|\b\d{2,}(?:[.,]\d+)?\b/g


export function especificosDe(texto: string): string[] {
  const achados = (texto ?? '').match(RE_ESPECIFICO) ?? []
  return achados.map((s) => s.replace(/[^\d,.]/g, '').replace(/[.,]$/, '')).filter(Boolean)
}


export function inventouEspecifico(resposta: string, contexto: string): boolean {
  const noContexto = new Set(especificosDe(contexto).map((s) => s.replace(/[.,]/g, '')))
  return especificosDe(resposta)
    .map((s) => s.replace(/[.,]/g, ''))
    .some((n) => !noContexto.has(n))
}


export function ehAbstencao(resposta: string): boolean {
  return PADROES_ABSTENCAO.some((re) => re.test(resposta ?? ''))
}


export function semExemplos(texto: string): string {
  return (texto ?? '')
    .replace(/\((?:ex|p\.?\s?ex|por exemplo)[.:][^)]*\)/gi, ' ')
    .replace(/(?:^|[\s—-])(?:ex|p\.?\s?ex|por exemplo)[.:].*$/gim, ' ')
}


const RE_CHUTE =
  /\b(?:gira(?:ndo)?\s+em\s+torno\s+de|em\s+torno\s+de|cerca\s+de|aproximadamente|por\s+volta\s+de|estimo|deve\s+ser|provavelmente|algo\s+como|uns|umas)\s*(?:R\$\s?[\d.,]+|\d+\s?%|\d{2,})/i


export function classificarAbstencao(caso: CasoAbstencao): VeredictoAbstencao {
  const limpa = semExemplos(caso.resposta)
  const forasteiro = inventouEspecifico(limpa, caso.contexto)
  if (ehAbstencao(caso.resposta)) {
    return forasteiro && RE_CHUTE.test(limpa) ? 'inventou' : 'abstencao'
  }
  return forasteiro ? 'inventou' : 'respondeu'
}

export interface MetricasAbstencao {
  casos: number
  abstencoes: number
  invencoes: number
  respondeu: number
  taxaAbstencao: number
  taxaInvencao: number
  
  inventadas: string[]
}

export function metricasAbstencao(casos: readonly CasoAbstencao[]): MetricasAbstencao {
  const vereditos = casos.map((c) => ({ c, v: classificarAbstencao(c) }))
  const abstencoes = vereditos.filter((x) => x.v === 'abstencao').length
  const invencoes = vereditos.filter((x) => x.v === 'inventou')
  const total = casos.length
  return {
    casos: total,
    abstencoes,
    invencoes: invencoes.length,
    respondeu: vereditos.filter((x) => x.v === 'respondeu').length,
    taxaAbstencao: total ? abstencoes / total : 0,
    taxaInvencao: total ? invencoes.length / total : 0,
    inventadas: invencoes.map((x) => x.c.pergunta),
  }
}

export function formatarMetricasAbstencao(m: MetricasAbstencao): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const linhas = [
    `casos=${m.casos}  abstenção=${pct(m.taxaAbstencao)}  invenção=${pct(m.taxaInvencao)}  respondeu-sem-abster=${m.respondeu}`,
  ]
  if (m.inventadas.length) linhas.push('-- INVENTOU --', ...m.inventadas.map((p) => `  ${p}`))
  return linhas.join('\n')
}
