
import { Embedder } from '../../brain/embeddings'


const MAX_TITULO = 200

const RE_H1 = /^#\s+(.+?)\s*$/
const RE_SECAO = /^#{2,6}\s+(.+?)\s*$/


function tituloDe(texto: string): string | null {
  const primeira = (texto ?? '').trimStart().split('\n', 1)[0] ?? ''
  const m = primeira.match(RE_H1)
  const t = m?.[1]?.trim()
  return t && t.length <= MAX_TITULO ? t : null
}


function ultimaSecao(texto: string): string | null {
  let achado: string | null = null
  for (const linha of (texto ?? '').split('\n')) {
    const t = linha.match(RE_SECAO)?.[1]?.trim()
    if (t && t.length <= MAX_TITULO) achado = t
  }
  return achado
}


export function contextualizarChunks(texts: string[]): string[] {
  if (!Array.isArray(texts) || texts.length < 2) return texts
  const titulo = tituloDe(texts[0])
  if (!titulo) return texts

  let secao: string | null = ultimaSecao(texts[0])
  return texts.map((texto, i) => {
    if (i === 0) return texto
    
    
    
    
    const propria = ultimaSecao(texto)
    if (propria) secao = propria
    const contexto = `# ${titulo}${secao ? ` > ${secao}` : ''}`
    
    return texto.trimStart().startsWith(contexto) ? texto : `${contexto}\n\n${texto}`
  })
}


export class EmbedderContextual extends Embedder {
  embedAll(texts: string[]) {
    return super.embedAll(contextualizarChunks(texts))
  }
}
