import { Note } from './note'
export function buildIndex(notes: Note[]): string {
  const byFolder = new Map<string, Note[]>()
  for (const n of notes) {
    const folder = n.path.includes('/') ? n.path.split('/')[0] : '.'
    if (!byFolder.has(folder)) byFolder.set(folder, [])
    byFolder.get(folder)!.push(n)
  }
  const lines = ['# INDEX', '']
  for (const folder of [...byFolder.keys()].sort()) {
    lines.push(`## ${folder}`)
    for (const n of byFolder.get(folder)!.sort((a, b) => a.path.localeCompare(b.path)))
      lines.push(`- [${n.title ?? n.id}](${n.path}) \`${n.id}\``)
    lines.push('')
  }
  return lines.join('\n')
}
