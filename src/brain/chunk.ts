export function chunkMarkdown(text: string, opts: { maxChars?: number } = {}): string[] {
  const max = opts.maxChars ?? 1200
  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  for (const p of paras) {
    if (cur && (cur.length + p.length + 2) > max) { chunks.push(cur); cur = '' }
    cur = cur ? `${cur}\n\n${p}` : p
    while (cur.length > max) { chunks.push(cur.slice(0, max)); cur = cur.slice(max) }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [text.trim()]
}
