
import type { ParteContrato } from '@/lib/juridico/types'

export interface ClausulaMinuta { numero: string; titulo: string; texto: string }
export interface Minuta {
  titulo: string
  
  preambulo?: string
  partes: ParteContrato[]
  clausulas: ClausulaMinuta[]
  
  fecho?: string
  pendencias: string[]
}

const RODAPE = '---\n*Minuta gerada pelo assistente jurídico — orientação preventiva; recomenda-se a revisão de um advogado antes de assinar.*'

export function montarTextoContrato(m: Minuta): string {
  const L: string[] = [`# ${m.titulo}`, '']
  if (m.preambulo && m.preambulo.trim()) {
    L.push(m.preambulo.trim(), '')
  }
  if (m.partes.length) {
    
    for (const p of m.partes) {
      const q = p.qualificacao && p.qualificacao.trim() ? `, ${p.qualificacao.trim()}` : ''
      L.push(`**${p.papel}**: ${p.nome}${q}`)
    }
    L.push('')
  }
  for (const c of m.clausulas) {
    
    
    const corpo = quebrarSubclausulas(c.texto, c.numero).split('\n').join('\n\n')
    L.push(`## Cláusula ${c.numero} — ${c.titulo}`, '', corpo, '')
  }
  if (m.fecho && m.fecho.trim()) {
    L.push(m.fecho.trim(), '')
  }
  L.push(RODAPE)
  return L.join('\n').trim() + '\n'
}


export function quebrarSubclausulas(texto: string, numero: string): string {
  const esc = String(numero).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return texto
    .replace(new RegExp(`[ \\t]+(?=${esc}\\.\\d{1,2}[ \\t)])`, 'g'), '\n')
    .replace(/[ \t]+(?=(?:§\s*\d|Parágrafo\s+\p{L}))/gu, '\n')
    .replace(/^\n+/, '')
}


export function extrairPendencias(texto: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of texto.matchAll(/\[PENDENTE:([^\]]+)\]/g)) {
    const t = m[1].trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase()); out.push(t)
  }
  return out
}



const RE_PENDENCIA_DISCLAIMER = /advogad|\boab\b|orienta[çc][ãa]o preventiva/i


export function consolidarPendencias(doLLM: string[], dosMarcadores: string[]): string[] {
  const dedup = (arr: string[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of arr) {
      const t = raw.trim()
      if (!t || RE_PENDENCIA_DISCLAIMER.test(t)) continue
      const k = t.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k); out.push(t)
    }
    return out
  }
  const llm = dedup(doLLM)
  return llm.length ? llm : dedup(dosMarcadores)
}
