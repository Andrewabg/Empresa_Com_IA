












import { chunkMarkdown } from '@/brain/chunk'

export interface ChunkBase {
  ordem: number
  texto: string
}


export const LIMIAR_CHUNK_CHARS = 1200


export const ALVO_CHUNK_CHARS = 700


export function chunkarEntrada(
  titulo: string,
  conteudo: string,
  cfg: { limiar?: number; alvo?: number } = {},
): ChunkBase[] {
  const t = (titulo ?? '').trim()
  const c = (conteudo ?? '').trim()
  const limiar = cfg.limiar ?? LIMIAR_CHUNK_CHARS
  const alvo = Math.max(1, cfg.alvo ?? ALVO_CHUNK_CHARS)
  if (c.length < limiar) return []

  const partes = chunkMarkdown(c, { maxChars: alvo }).filter((p) => p.trim().length > 0)
  
  
  if (partes.length <= 1) return []

  return partes.map((texto, i) => ({ ordem: i, texto: t ? `${t}\n${texto.trim()}` : texto.trim() }))
}
