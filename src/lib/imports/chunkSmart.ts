





















import { CHUNK_MAX_CHARS } from './chunking'
import { splitUnit } from './textSplit'


export const MIN_CHUNK_CHARS = 200




function splitTopLevelByHeading(text: string): Array<{ block: string; led: boolean }> {
  const lines = text.split('\n')
  const blocks: Array<{ block: string; led: boolean }> = []
  let cur: string[] = []
  let curLed = false
  const isHeading = (l: string) => /^#{1,6} /.test(l)
  for (const line of lines) {
    if (isHeading(line) && cur.length > 0) {
      blocks.push({ block: cur.join('\n'), led: curLed })
      cur = [line]
      curLed = true
    } else {
      if (cur.length === 0) curLed = isHeading(line)
      cur.push(line)
    }
  }
  if (cur.length) blocks.push({ block: cur.join('\n'), led: curLed })
  return blocks.length ? blocks : [{ block: text, led: false }]
}




function mergeTinyChunks(
  chunks: Array<{ text: string; led: boolean }>,
  max: number,
  min: number,
): string[] {
  if (chunks.length === 0) return []
  const out: Array<{ text: string; led: boolean }> = []
  for (const c of chunks) {
    const prev = out[out.length - 1]
    if (
      prev &&
      !c.led && 
      (prev.text.length < min || c.text.length < min) &&
      prev.text.length + c.text.length + 1 <= max
    ) {
      prev.text = `${prev.text}\n${c.text}`
    } else {
      out.push({ text: c.text, led: c.led })
    }
  }
  return out.map(c => c.text)
}




export function chunkSmart(text: string, opts: { maxChars?: number } = {}): string[] {
  const max = opts.maxChars ?? CHUNK_MAX_CHARS

  if (!text.trim()) return ['']

  
  const topBlocks = splitTopLevelByHeading(text)

  
  
  const marked: Array<{ text: string; led: boolean }> = []
  for (const { block, led } of topBlocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const pieces = splitUnit(trimmed, max)
    pieces.forEach((p, idx) => {
      const t = p.trim()
      if (!t) return
      marked.push({ text: t, led: led && idx === 0 })
    })
  }

  if (marked.length === 0) return ['']

  
  const merged = mergeTinyChunks(marked, max, MIN_CHUNK_CHARS)

  return merged.length ? merged : ['']
}
