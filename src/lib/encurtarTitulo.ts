








const RETICENCIAS = '…'


const RE_PONTUACAO_FINAL = /[\s,;:.\-–—/|]+$/


const FRONTEIRA_MINIMA = 0.6


const RE_SURROGATE_ALTO_NO_FIM = /[\ud800-\udbff]$/


export function encurtarTitulo(texto: string, max: number): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (max <= 0) return ''
  if (limpo.length <= max) return limpo
  if (max === 1) return RETICENCIAS

  
  const orcamento = max - RETICENCIAS.length
  const janela = limpo.slice(0, orcamento)
  const ultimoEspaco = janela.lastIndexOf(' ')
  const naPalavra = ultimoEspaco > 0 && ultimoEspaco >= Math.floor(orcamento * FRONTEIRA_MINIMA)
  const base = (naPalavra ? janela.slice(0, ultimoEspaco) : janela).replace(RE_SURROGATE_ALTO_NO_FIM, '')
  return base.replace(RE_PONTUACAO_FINAL, '') + RETICENCIAS
}


export function encurtarComSufixo(base: string, sufixo: string, max: number): string {
  const espaco = max - sufixo.length
  if (espaco <= 0) return encurtarTitulo(`${base}${sufixo}`, max)
  return `${encurtarTitulo(base, espaco)}${sufixo}`
}
