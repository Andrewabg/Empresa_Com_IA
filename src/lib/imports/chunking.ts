



export const CHUNK_MAX_CHARS = 1200


export const CHUNK_TETO_CHARS = 3600

export const MERGE_PEER_MIN_CHARS = 500


export function sliceChunks<T>(chunks: T[], done: number, per: number): T[] {
  return chunks.slice(done, done + per)
}


export const NEIGHBOR_TAIL_CHARS = 200


export function prevTail(chunks: string[], absIdx: number, chars = NEIGHBOR_TAIL_CHARS): string {
  if (absIdx <= 0) return ''
  const prev = chunks[absIdx - 1] ?? ''
  return prev.length > chars ? prev.slice(prev.length - chars) : prev
}


export function prevTailsForSlice(chunks: string[], done: number, len: number, chars = NEIGHBOR_TAIL_CHARS): string[] {
  const out: string[] = []
  for (let j = 0; j < len; j++) out.push(prevTail(chunks, done + j, chars))
  return out
}
