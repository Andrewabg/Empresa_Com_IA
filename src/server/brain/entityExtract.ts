





const CAP_STOPWORDS = new Set([
  'Preço', 'Garantia', 'Contrato', 'Cliente', 'Plano', 'Lançamento', 'SKU', 'Fornecedor',
  'Produto', 'Resumo', 'Total', 'Nota', 'Valor', 'Prazo', 'Data', 'Ficha', 'Departamento',
])

const ENTITY_STOPLIST = new Set([
  'São Paulo', 'Rio De Janeiro', 'Belo Horizonte', 'Curitiba', 'Recife', 'Porto Alegre',
])
const ENTITY_CAP = 8




const MULTI_RE = /[A-ZÀ-Ý][A-Za-zÀ-ÿ0-9]+(?:[^\S\r\n]+[A-ZÀ-Ý][A-Za-zÀ-ÿ0-9]+)+/gu

const WORD_RE = /[A-ZÀ-Ý][A-Za-zÀ-ÿ0-9]{3,}/gu

const CNPJ_RE = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g
const CT_RE = /\bCT-\d{4}-\d+\b/g


function isSentenceStart(text: string, idx: number): boolean {
  let j = idx - 1
  while (j >= 0 && (text[j] === ' ' || text[j] === '\t')) j--
  if (j < 0) return true
  const prev = text[j]
  return prev === '\n' || prev === '\r' || '.!?:'.includes(prev) || '-*•'.includes(prev)
}

export function extractEntities(text: string): string[] {
  if (!text || !text.trim()) return []
  const found = new Set<string>()
  const multiTokens = new Set<string>() 
  for (const m of text.matchAll(MULTI_RE)) {
    const e = m[0].trim()
    
    
    for (const tok of e.split(/\s+/)) multiTokens.add(tok)
    if (ENTITY_STOPLIST.has(e)) continue
    found.add(e)
  }
  for (const m of text.matchAll(CNPJ_RE)) found.add(m[0])
  for (const m of text.matchAll(CT_RE)) found.add(m[0])
  for (const m of text.matchAll(WORD_RE)) {
    const w = m[0]
    if (CAP_STOPWORDS.has(w) || multiTokens.has(w)) continue
    if (isSentenceStart(text, m.index!)) continue
    found.add(w)
  }
  
  return [...found].sort((a, b) => b.length - a.length).slice(0, ENTITY_CAP)
}
