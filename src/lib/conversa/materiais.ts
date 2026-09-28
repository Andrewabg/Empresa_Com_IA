

import { kindPelaExtensao } from '@/lib/conversa/anexo'


export const MAX_MATERIAIS = 5


export const MAX_SUMMARY_CHARS = 600




export function marcadorDeAnexo(nomes: string[]): string {
  if (nomes.length === 0) return ''
  if (nomes.length === 1) {
    const rotulo = kindPelaExtensao(nomes[0]) === 'imagem' ? 'imagem anexada' : 'arquivo anexado'
    return `[${rotulo}: ${nomes[0]}]`
  }
  return `[${nomes.length} anexos: ${nomes.join(', ')}]`
}



export interface AnexoMaterial {
  
  id?: string
  
  title: string
  
  summary?: string | null
}

export interface MateriaisOpts {
  
  max?: number
  
  maxSummary?: number
}

const CABECALHO =
  'Materiais desta conversa (arquivos que o dono anexou aqui). ' +
  'Use o que está descrito abaixo e nunca invente o que não está:'


function umaLinha(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto
  return `${texto.slice(0, max - 1).trimEnd()}…`
}


export function renderMateriaisConversa(
  anexos: AnexoMaterial[],
  opts?: MateriaisOpts,
): string {
  const max = opts?.max ?? MAX_MATERIAIS
  const maxSummary = opts?.maxSummary ?? MAX_SUMMARY_CHARS

  const vistos = new Set<string>()
  const escolhidos: AnexoMaterial[] = []
  for (const a of anexos) {
    if (a.id) {
      if (vistos.has(a.id)) continue
      vistos.add(a.id)
    }
    escolhidos.push(a)
    if (escolhidos.length >= max) break
  }
  if (escolhidos.length === 0) return ''

  const linhas = escolhidos.map((a) => {
    const resumo = umaLinha(a.summary ?? '')
    return resumo.length === 0
      ? `- ${a.title} (não consegui ler este arquivo; peça para reenviar)`
      : `- ${a.title}: ${truncar(resumo, maxSummary)}`
  })

  return [CABECALHO, ...linhas].join('\n')
}
