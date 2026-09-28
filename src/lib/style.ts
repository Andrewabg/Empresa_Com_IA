

export type StyleDial = -2 | -1 | 0 | 1 | 2
export type DialName = 'diretude' | 'formalidade' | 'calor' | 'humor' | 'assertividade' | 'verbosidade'
export type StyleDials = Record<DialName, StyleDial>

export const DIAL_NAMES: readonly DialName[] = [
  'diretude', 'formalidade', 'calor', 'humor', 'assertividade', 'verbosidade',
]

export type StyleSource = 'explicito' | 'aprendido' | 'manual'
export interface StyleChange { source: StyleSource; resumo: string; at: string } 

export interface StyleProfile {
  dials: StyleDials
  notas: string
  learningPaused: boolean
  updatedAt: string            
  lastChange: StyleChange | null
}

export function clampDial(n: number): StyleDial {
  if (!Number.isFinite(n)) return 0
  const r = Math.round(n)
  return (r > 2 ? 2 : r < -2 ? -2 : r) as StyleDial
}

function neutralDials(): StyleDials {
  return { diretude: 0, formalidade: 0, calor: 0, humor: 0, assertividade: 0, verbosidade: 0 }
}

export const DEFAULT_STYLE: StyleProfile = {
  dials: neutralDials(),
  notas: '',
  learningPaused: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
  lastChange: null,
}

const SOURCES: readonly StyleSource[] = ['explicito', 'aprendido', 'manual']

function coerceDials(raw: unknown): StyleDials {
  const out = neutralDials()
  if (raw && typeof raw === 'object') {
    for (const d of DIAL_NAMES) {
      const v = (raw as Record<string, unknown>)[d]
      if (typeof v === 'number') out[d] = clampDial(v)
    }
  }
  return out
}

function coerceChange(raw: unknown): StyleChange | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.source !== 'string' || !SOURCES.includes(r.source as StyleSource)) return null
  if (typeof r.resumo !== 'string' || typeof r.at !== 'string') return null
  return { source: r.source as StyleSource, resumo: r.resumo, at: r.at }
}

export function coerceStyleProfile(raw: unknown): StyleProfile {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STYLE, dials: neutralDials() }
  const r = raw as Record<string, unknown>
  return {
    dials: coerceDials(r.dials),
    notas: typeof r.notas === 'string' ? r.notas : '',
    learningPaused: r.learningPaused === true,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : DEFAULT_STYLE.updatedAt,
    lastChange: coerceChange(r.lastChange),
  }
}


const DIAL_PHRASES: Record<DialName, { neg2: string; neg1: string; pos1: string; pos2: string }> = {
  diretude: {
    neg2: 'Seja diplomático e suave; contextualize antes de concluir.',
    neg1: 'Suavize um pouco; evite ser cru demais.',
    pos1: 'Vá direto ao ponto; corte preâmbulos.',
    pos2: 'Vá DIRETO ao ponto, sem rodeios nem preâmbulos.',
  },
  formalidade: {
    neg2: 'Tom casual, pode usar gíria.',
    neg1: 'Tom levemente informal.',
    pos1: 'Tom mais formal e profissional.',
    pos2: 'Tom formal e corporativo.',
  },
  calor: {
    neg2: 'Tom frio e impessoal; foque no fato.',
    neg1: 'Tom mais contido e objetivo.',
    pos1: 'Tom caloroso e próximo.',
    pos2: 'Tom muito caloroso e acolhedor.',
  },
  humor: {
    neg2: 'Sem brincadeiras; tom sério e seco.',
    neg1: 'Pouco humor.',
    pos1: 'Pode soltar humor leve.',
    pos2: 'Brincalhão; use humor e piadas quando couber.',
  },
  assertividade: {
    neg2: 'Tom humilde e cauteloso; reconheça incertezas.',
    neg1: 'Tom mais comedido.',
    pos1: 'Confiante e assertivo.',
    pos2: 'Confiante e assertivo, com arrogância charmosa — sem jamais abrir mão de estar certo.',
  },
  verbosidade: {
    neg2: 'Respostas telegráficas; o mínimo de palavras.',
    neg1: 'Respostas curtas.',
    pos1: 'Pode detalhar mais.',
    pos2: 'Respostas detalhadas e expansivas.',
  },
}

const MIRROR_LINE =
  '[Espelhe a maneira ATUAL dele neste momento: se está curto/seco, encurte; se brincalhão, acompanhe; siga a energia, o tamanho e a formalidade das mensagens dele.]'
const FLOOR_LINE =
  '[Piso inegociável: por mais ácido/arrogante que seja o estilo, nunca minta ou invente para manter pose, nunca se recuse a ajudar de verdade, nunca ofenda gratuitamente o usuário.]'

function dialLine(name: DialName, v: StyleDial): string | null {
  if (v === 0) return null
  const p = DIAL_PHRASES[name]
  return v === -2 ? p.neg2 : v === -1 ? p.neg1 : v === 1 ? p.pos1 : p.pos2
}

export function renderStyleDirective(profile: StyleProfile): string {
  const lines = DIAL_NAMES.map((d) => dialLine(d, profile.dials[d])).filter((x): x is string => !!x)
  const notas = profile.notas.trim()
  if (lines.length === 0 && !notas) return '' 
  const body = lines.map((l) => `- ${l}`)
  if (notas) body.push(`- Notas: ${notas}`)
  return [
    '## Estilo com este usuário (aprendido — prevalece sobre o tom geral da empresa)',
    ...body,
    MIRROR_LINE,
    FLOOR_LINE,
  ].join('\n')
}

export interface DialTrend { dial: DialName; direction: 'up' | 'down' }
export interface NudgeOpts { now: string; lastExplicitAt: string | null; windowDays: number }

export function nudgeDials(current: StyleDials, trends: DialTrend[], opts: NudgeOpts): StyleDials {
  
  if (opts.lastExplicitAt) {
    const ageMs = Date.parse(opts.now) - Date.parse(opts.lastExplicitAt)
    const windowMs = opts.windowDays * 24 * 60 * 60 * 1000
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < windowMs) return { ...current }
  }
  const out: StyleDials = { ...current }
  for (const t of trends) {
    const delta = t.direction === 'up' ? 1 : -1
    out[t.dial] = clampDial(out[t.dial] + delta)
  }
  return out
}


export const DIAL_LABELS: Record<DialName, { titulo: string; neg: string; pos: string }> = {
  diretude:      { titulo: 'Diretude',      neg: 'Diplomático', pos: 'Direto' },
  formalidade:   { titulo: 'Formalidade',   neg: 'Casual',      pos: 'Formal' },
  calor:         { titulo: 'Calor',         neg: 'Frio',        pos: 'Caloroso' },
  humor:         { titulo: 'Humor',         neg: 'Sério',       pos: 'Brincalhão' },
  assertividade: { titulo: 'Assertividade', neg: 'Humilde',     pos: 'Arrogante' },
  verbosidade:   { titulo: 'Verbosidade',   neg: 'Telegráfico', pos: 'Expansivo' },
}
