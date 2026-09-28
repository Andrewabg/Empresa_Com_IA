
export interface SegmentoSnippet { text: string; hit: boolean }

export function partesSnippet(snippet: string): SegmentoSnippet[] {
  if (!snippet) return []
  const out: SegmentoSnippet[] = []
  let last = 0
  for (const m of snippet.matchAll(/<<(.*?)>>/g)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ text: snippet.slice(last, idx), hit: false })
    out.push({ text: m[1], hit: true })
    last = idx + m[0].length
  }
  if (last < snippet.length) out.push({ text: snippet.slice(last), hit: false })
  return out
}
