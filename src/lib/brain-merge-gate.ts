
import type { Note, Frontmatter } from '@/brain/note'
import { acharMarcaDeOmissao } from './brain-merge-audit'

export type Violation =
  | { kind: 'placeholder'; evidence: string }
  | { kind: 'duplication'; entities: string[] }
  | { kind: 'frontmatter_regression'; field: 'id' | 'tags' | 'confidence' | 'author_agent' }
  | { kind: 'shrinkage'; before: number; after: number }
  | { kind: 'contradiction'; detail: string }



const PLACEHOLDER_PT_RE =
  /\b(completar|preencher|a definir|se necess[áa]rio)\b|\([^)]*\bdetalhes?\b[^)]*\)|\betc\.?\s*$/im

const PLACEHOLDER_MARKER_RE = /\b(TODO|TBD)\b/

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const tokens = (s: string) =>
  new Set(norm(s).toLowerCase().replace(/[^\p{L}\p{N}%\s]/gu, '').split(' ').filter(w => w.length > 3))

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}


function leadKey(item: string): string {
  const m = item.match(/^([\p{L}\p{N}]+)/u)
  return m ? m[1].toLowerCase() : ''
}


function findDuplicateItems(body: string): string[] {
  const items = body.split('\n').map(l => l.trim()).filter(l => /^[-*]\s+/.test(l)).map(l => l.replace(/^[-*]\s+/, ''))
  const dup: string[] = []
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      if (leadKey(items[i]) !== leadKey(items[j])) continue   
      if (jaccard(tokens(items[i]), tokens(items[j])) >= 0.6) dup.push(items[i].slice(0, 40))
    }
  return dup
}


export function validateMerge(
  before: Note | null,
  proposed: { body: string; frontmatter: Frontmatter },
  _candidate: { raw_content: string },
): { ok: boolean; violations: Violation[] } {
  const v: Violation[] = []

  const ph = proposed.body.match(PLACEHOLDER_PT_RE) ?? proposed.body.match(PLACEHOLDER_MARKER_RE)
  if (ph) v.push({ kind: 'placeholder', evidence: ph[0] })

  
  
  
  
  
  const corte = acharMarcaDeOmissao(proposed.body)
  if (corte) v.push({ kind: 'placeholder', evidence: corte })

  const dup = findDuplicateItems(proposed.body)
  if (dup.length) v.push({ kind: 'duplication', entities: dup })

  if (before) {
    const fm = proposed.frontmatter
    if (fm.id !== before.id) v.push({ kind: 'frontmatter_regression', field: 'id' })
    if (!before.tags.every(t => fm.tags.includes(t))) v.push({ kind: 'frontmatter_regression', field: 'tags' })
    if (fm.confidence < before.confidence) v.push({ kind: 'frontmatter_regression', field: 'confidence' })
    if (before.author_agent && !fm.author_agent) v.push({ kind: 'frontmatter_regression', field: 'author_agent' })

    const b = norm(before.body).length
    const a = norm(proposed.body).length
    if (a < b * 0.9) v.push({ kind: 'shrinkage', before: b, after: a })

    const beforePct = [...new Set(before.body.match(/\d+(?:[.,]\d+)?\s*%/g) ?? [])]
    const propPct = new Set(proposed.body.match(/\d+(?:[.,]\d+)?\s*%/g) ?? [])
    for (const p of beforePct)
      if (!propPct.has(p) && propPct.size) v.push({ kind: 'contradiction', detail: `${p} → ${[...propPct].join(',')}` })
  }

  return { ok: v.length === 0, violations: v }
}

export function describeViolation(v: Violation): string {
  switch (v.kind) {
    case 'placeholder': return `placeholder proibido: "${v.evidence}"`
    case 'duplication': return `entidades duplicadas: ${v.entities.join(' | ')}`
    case 'frontmatter_regression': return `frontmatter regrediu no campo: ${v.field}`
    case 'shrinkage': return `corpo encolheu de ${v.before} para ${v.after} chars (perda de fato?)`
    case 'contradiction': return `contradição numérica: ${v.detail}`
  }
}
