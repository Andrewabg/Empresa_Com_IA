


export interface RecusaDeOrigem {
  
  id: number
  
  classe: string
  
  trecho: string
}


export const CHAVE_ORIGENS_RECUSADAS_AVISADAS = 'memoria_origens_recusadas_avisadas'


export const TAMANHO_DO_TRECHO = 90


export const EXEMPLOS_NO_AVISO = 3


export function trechoDaRecusa(texto: string | null | undefined): string {
  const limpo = (texto ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (limpo.length <= TAMANHO_DO_TRECHO) return limpo
  return `${limpo.slice(0, TAMANHO_DO_TRECHO - 3).trimEnd()}...`
}


function jaContadas(jaAvisadas: number | null): number {
  return Number.isFinite(jaAvisadas as number) && (jaAvisadas as number) > 0 ? (jaAvisadas as number) : 0
}


export function deveAvisarOrigemRecusada(total: number, jaAvisadas: number | null): boolean {
  if (!Number.isFinite(total) || total <= 0) return false
  return total > jaContadas(jaAvisadas)
}


export function deveResincronizarMarcador(total: number, jaAvisadas: number | null): boolean {
  if (!Number.isFinite(total) || total < 0) return false
  return total < jaContadas(jaAvisadas)
}


export interface FatoRecusado {
  
  representante: RecusaDeOrigem
  
  linhas: number
}


function formaComparavel(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
}


function contemSequencia(texto: string, agulha: string): boolean {
  if (!agulha) return false
  return ` ${texto} `.includes(` ${agulha} `)
}


function partesDeRotuloValor(texto: string): { rotulo: string; valor: string } | null {
  const i = texto.indexOf(': ')
  if (i <= 0) return null
  const rotulo = formaComparavel(texto.slice(0, i))
  const valor = formaComparavel(texto.slice(i + 2))
  if (!rotulo || !valor) return null
  return { rotulo, valor }
}


export function agruparRecusasPorFato(recusas: readonly RecusaDeOrigem[]): FatoRecusado[] {
  const frases: { r: RecusaDeOrigem; forma: string; usada: boolean }[] = []
  const rotulados: { r: RecusaDeOrigem; forma: string; partes: { rotulo: string; valor: string } }[] = []
  
  
  
  
  const semTexto: RecusaDeOrigem[] = []
  for (const r of recusas) {
    const forma = formaComparavel(r.trecho ?? '')
    if (!forma) { semTexto.push(r); continue }
    const partes = partesDeRotuloValor(r.trecho)
    if (partes) rotulados.push({ r, forma, partes })
    else frases.push({ r, forma, usada: false })
  }

  
  const grupos: { representante: RecusaDeOrigem; linhas: number; forma: string; ehRotulado: boolean }[] = []
  const porForma = new Map<string, number>()
  for (const f of frases) {
    const j = porForma.get(f.forma)
    if (j !== undefined) { grupos[j].linhas++; continue }
    porForma.set(f.forma, grupos.length)
    grupos.push({ representante: f.r, linhas: 1, forma: f.forma, ehRotulado: false })
  }

  for (const item of rotulados) {
    
    const mesmo = porForma.get(item.forma)
    if (mesmo !== undefined) { grupos[mesmo].linhas++; continue }
    
    const frase = frases.find((f) => !f.usada && contemSequencia(f.forma, item.partes.rotulo) && contemSequencia(f.forma, item.partes.valor))
    if (frase) {
      frase.usada = true
      const j = porForma.get(frase.forma)!
      grupos[j].linhas++
      grupos[j].representante = item.r 
      grupos[j].ehRotulado = true
      continue
    }
    porForma.set(item.forma, grupos.length)
    grupos.push({ representante: item.r, linhas: 1, forma: item.forma, ehRotulado: true })
  }

  return [
    ...grupos.map((g) => ({ representante: g.representante, linhas: g.linhas })),
    ...semTexto.map((r) => ({ representante: r, linhas: 1 })),
  ]
}



export function novasDesdeOAviso(total: number, jaAvisadas: number | null): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, total - jaContadas(jaAvisadas))
}


export function resumoDaOrigemRecusada(
  novas: number,
  exemplos: readonly RecusaDeOrigem[],
  contagemPorFato = false,
): { titulo: string; corpo: string } | null {
  if (!Number.isFinite(novas) || novas <= 0) return null
  const titulo = novas === 1
    ? 'Deixei de guardar uma coisa porque não consegui confirmar que veio de você'
    : `Deixei de guardar ${novas} coisas porque não consegui confirmar que vieram de você`
  
  
  const trechos = exemplos
    .map((e) => trechoDaRecusa(e.trecho))
    .filter((t) => t.length > 0)
    .slice(0, Math.min(novas, EXEMPLOS_NO_AVISO))
  
  
  const abertura = trechos.length < novas ? 'Alguns dos que ficaram de fora' : 'O que ficou de fora'
  const amostra = trechos.length
    ? ` ${abertura}: ${trechos.map((t) => `"${t}"`).join('; ')}.`
    : ''
  
  
  
  
  const ressalvaDaContagem = novas > 1 && !contagemPorFato
    ? ' Pode ser que a mesma informação tenha entrado mais de uma vez nessa contagem, escrita de jeitos diferentes.'
    : ''
  const corpo = 'Isso acontece quando o assunto chegou por outra pessoa, por um arquivo ou por '
    + 'um serviço de fora, e eu prefiro não guardar como verdade da sua empresa aquilo que não '
    + `veio de você.${amostra} Nada foi gravado como memória da sua empresa.${ressalvaDaContagem}`
    + ' Se for coisa sua mesmo, me conte de novo e eu guardo na hora.'
  return { titulo, corpo }
}
