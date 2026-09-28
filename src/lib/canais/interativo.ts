






export const LIM = {
  BOTOES_MAX: 3,
  BOTAO_TITULO: 20,
  BOTAO_ID: 256,
  CORPO: 1024,
  RODAPE: 60,
  LISTA_LINHAS_TOTAL: 10,
  LISTA_SECOES_MAX: 10,
  LINHA_TITULO: 24,
  LINHA_DESCRICAO: 72,
  LISTA_BOTAO: 20,
  SECAO_TITULO: 24,
} as const

export type Interativo =
  | { tipo: 'botoes'; corpo: string; rodape?: string; botoes: Array<{ id: string; titulo: string }> }
  | {
      tipo: 'lista'; corpo: string; rodape?: string; botao: string
      secoes: Array<{ titulo: string; linhas: Array<{ id: string; titulo: string; descricao?: string }> }>
    }

export type ValidacaoInterativo =
  | { ok: true; valor: Interativo }
  | { ok: false; erros: string[] }

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const corta = (s: string, n: number): string => (s.length > n ? s.slice(0, n).trimEnd() : s)


export function idDoTitulo(titulo: string, indice: number): string {
  let h = 0x811c9dc5
  for (let i = 0; i < titulo.length; i++) {
    h ^= titulo.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `op_${indice}_${h.toString(36)}`
}


export function interativoParaTexto(i: Interativo): string {
  const linhas = i.tipo === 'botoes'
    ? i.botoes.map((b) => b.titulo)
    : i.secoes.flatMap((s) => s.linhas.map((l) => (l.descricao ? `${l.titulo} — ${l.descricao}` : l.titulo)))
  const numeradas = linhas.map((t, n) => `${n + 1}. ${t}`)
  return [i.corpo, '', ...numeradas, ...(i.rodape ? ['', i.rodape] : [])].join('\n').trim()
}


export function validarInterativo(bruto: unknown): ValidacaoInterativo {
  const erros: string[] = []
  if (!bruto || typeof bruto !== 'object') return { ok: false, erros: ['Payload inválido.'] }
  const b = bruto as Record<string, unknown>

  const corpo = corta(texto(b.corpo), LIM.CORPO)
  if (!corpo) erros.push('O corpo da mensagem é obrigatório.')
  if (texto(b.corpo).length > LIM.CORPO) {
    
    erros.push(`O corpo passa de ${LIM.CORPO} caracteres — escreva mais curto ou responda em texto.`)
  }
  const rodape = corta(texto(b.rodape), LIM.RODAPE) || undefined

  if (b.tipo === 'botoes') {
    const brutos = Array.isArray(b.botoes) ? b.botoes : []
    if (brutos.length === 0) erros.push('Nenhum botão.')
    if (brutos.length > LIM.BOTOES_MAX) {
      erros.push(`O WhatsApp aceita no máximo ${LIM.BOTOES_MAX} botões — use uma lista ou reduza as opções.`)
    }
    const botoes = brutos.slice(0, LIM.BOTOES_MAX).map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>
      const titulo = corta(texto(o.titulo), LIM.BOTAO_TITULO)
      if (!titulo) erros.push(`O botão ${i + 1} está sem texto.`)
      return { id: corta(texto(o.id), LIM.BOTAO_ID) || idDoTitulo(titulo, i), titulo }
    })
    
    if (new Set(botoes.map((x) => x.id)).size !== botoes.length) erros.push('Dois botões com o mesmo identificador.')
    if (erros.length) return { ok: false, erros }
    return { ok: true, valor: { tipo: 'botoes', corpo, botoes, ...(rodape ? { rodape } : {}) } }
  }

  if (b.tipo === 'lista') {
    const botao = corta(texto(b.botao), LIM.LISTA_BOTAO) || 'Ver opções'
    const brutas = Array.isArray(b.secoes) ? b.secoes : []
    if (brutas.length === 0) erros.push('Nenhuma seção na lista.')
    if (brutas.length > LIM.LISTA_SECOES_MAX) erros.push(`No máximo ${LIM.LISTA_SECOES_MAX} seções.`)

    let total = 0
    const secoes = brutas.slice(0, LIM.LISTA_SECOES_MAX).map((s, si) => {
      const o = (s ?? {}) as Record<string, unknown>
      const linhasBrutas = Array.isArray(o.linhas) ? o.linhas : []
      const linhas = linhasBrutas.map((l, li) => {
        const x = (l ?? {}) as Record<string, unknown>
        const titulo = corta(texto(x.titulo), LIM.LINHA_TITULO)
        if (!titulo) erros.push(`A opção ${li + 1} da seção ${si + 1} está sem texto.`)
        const descricao = corta(texto(x.descricao), LIM.LINHA_DESCRICAO) || undefined
        total += 1
        return {
          id: corta(texto(x.id), LIM.BOTAO_ID) || idDoTitulo(titulo, total),
          titulo,
          ...(descricao ? { descricao } : {}),
        }
      })
      return { titulo: corta(texto(o.titulo), LIM.SECAO_TITULO), linhas }
    })
    if (total === 0) erros.push('Nenhuma opção na lista.')
    if (total > LIM.LISTA_LINHAS_TOTAL) {
      erros.push(`O WhatsApp aceita no máximo ${LIM.LISTA_LINHAS_TOTAL} opções somando todas as seções.`)
    }
    const ids = secoes.flatMap((s) => s.linhas.map((l) => l.id))
    if (new Set(ids).size !== ids.length) erros.push('Duas opções com o mesmo identificador.')
    if (erros.length) return { ok: false, erros }
    return { ok: true, valor: { tipo: 'lista', corpo, botao, secoes, ...(rodape ? { rodape } : {}) } }
  }

  return { ok: false, erros: ['Tipo inválido: use "botoes" ou "lista".'] }
}
