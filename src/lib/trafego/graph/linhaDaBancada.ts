



import type { ColunaDaBancada, TipoDeColuna } from '@/lib/bancada/tipos'

const PREFIXO_POR_CAMPO: Record<string, string> = {
  actions: 'conv', action_values: 'valor', cost_per_action_type: 'custo', purchase_roas: 'roas',
}
const NUMERO_RE = /^-?\d+(\.\d+)?$/
const MAX_NOME = 63

export function nomeDeColuna(bruto: string): string {
  let n = String(bruto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!n) n = 'campo'
  if (/^[0-9]/.test(n)) n = `c_${n}`
  return n.slice(0, MAX_NOME).replace(/_+$/g, '') || 'campo'
}

function ehId(nome: string): boolean {
  return nome === 'id' || nome.endsWith('_id')
}

function ehAcao(v: unknown): v is Array<{ action_type?: unknown; value?: unknown }> {
  return Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && 'action_type' in (x as object) && 'value' in (x as object))
}


function achatar(row: Record<string, unknown>): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = []
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) { out.push([k, null]); continue }
    if (ehAcao(v)) {
      const prefixo = PREFIXO_POR_CAMPO[k]
      if (prefixo) for (const a of v) out.push([`${prefixo}_${String(a.action_type)}`, a.value ?? null])
      else out.push([k, v[0]?.value ?? null])
      continue
    }
    if (Array.isArray(v)) { out.push([k, JSON.stringify(v)]); continue }
    if (typeof v === 'object') {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        const escalar = v2 === null || v2 === undefined || typeof v2 !== 'object'
        out.push([`${k}_${k2}`, escalar ? (v2 ?? null) : JSON.stringify(v2)])
      }
      continue
    }
    out.push([k, v])
  }
  return out
}

export function linhaDaBancada(rows: Array<Record<string, unknown>>): { colunas: ColunaDaBancada[]; linhas: unknown[][] } {
  if (rows.length === 0) return { colunas: [], linhas: [] }
  const nomePorBruto = new Map<string, string>()
  const usados = new Set<string>()
  const ordem: string[] = []
  const achatadas = rows.map((r) => achatar(r && typeof r === 'object' ? r : {}))
  for (const linha of achatadas) {
    for (const [bruto] of linha) {
      if (nomePorBruto.has(bruto)) continue
      const base = nomeDeColuna(bruto)
      let nome = base
      for (let i = 2; usados.has(nome); i++) {
        const sufixo = `_${i}`
        nome = base.slice(0, MAX_NOME - sufixo.length).replace(/_+$/g, '') + sufixo
      }
      usados.add(nome); nomePorBruto.set(bruto, nome); ordem.push(bruto)
    }
  }
  const valores = achatadas.map((linha) => {
    const m = new Map(linha)
    return ordem.map((bruto) => (m.has(bruto) ? m.get(bruto) : null))
  })
  const colunas: ColunaDaBancada[] = ordem.map((bruto, i) => {
    const nome = nomePorBruto.get(bruto)!
    const t: TipoDeColuna = ehId(nome) ? 'texto' : tipoDaColuna(valores.map((l) => l[i]))
    return { nome, tipo: t }
  })
  const linhas = valores.map((l) => l.map((v, i) => celula(v, colunas[i].tipo)))
  return { colunas, linhas }
}

function tipoDaColuna(vs: unknown[]): TipoDeColuna {
  let inteiro = true
  let algum = false
  for (const v of vs) {
    if (v === null || v === undefined || v === '') continue
    algum = true
    if (typeof v === 'number') { if (!Number.isInteger(v)) inteiro = false; continue }
    if (typeof v === 'string' && NUMERO_RE.test(v)) { if (v.includes('.')) inteiro = false; continue }
    return 'texto'
  }
  if (!algum) return 'texto'
  return inteiro ? 'inteiro' : 'real'
}

function celula(v: unknown, tipo: TipoDeColuna): unknown {
  if (v === null || v === undefined || v === '') return null
  if (tipo === 'texto') return typeof v === 'string' ? v : String(v)
  return typeof v === 'number' ? v : Number(v)
}
