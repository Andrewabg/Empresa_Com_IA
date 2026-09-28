








import type { CampoLimite } from './formatos'
import { montarLinhaDoTempo, textoDaCena, type Cena, type CenaCrua } from './roteiro'


export const BLOCO_KINDS = [
  'headline', 'subheadline', 'cta', 'primario', 'descricao',
  'legenda', 'assunto', 'corpo', 'slide', 'beat',
] as const
export type BlocoKind = (typeof BLOCO_KINDS)[number]

export interface Bloco {
  id: string
  kind: BlocoKind
  rotulo: string
  texto: string
  
  limite?: number
  ordem: number
  
  cena?: Cena
}


export interface BlocoCru { kind: string; rotulo: string; texto: string; cena?: CenaCrua }


export function normalizarKind(raw: string): BlocoKind {
  const k = (raw ?? '').trim().toLowerCase()
  return (BLOCO_KINDS as readonly string[]).includes(k) ? (k as BlocoKind) : 'corpo'
}


export function montarBlocos(crus: BlocoCru[], limites?: CampoLimite[]): Bloco[] {
  const porKind = new Map<string, number>()
  for (const l of limites ?? []) porKind.set(l.campo, l.max)
  const out: Bloco[] = []
  const cruas: CenaCrua[] = []
  const posDaCena: number[] = []
  for (const c of crus ?? []) {
    const kind = normalizarKind(c?.kind ?? '')
    const temCena = kind === 'beat' && !!c?.cena
    const texto = (c?.texto ?? '').trim()
    
    
    if (!texto && !temCena) continue
    const limite = porKind.get(kind)
    if (temCena) { cruas.push(c.cena!); posDaCena.push(out.length) }
    out.push({
      id: `b${out.length}`,
      kind,
      rotulo: (c.rotulo ?? '').trim() || ROTULO_PADRAO[kind],
      texto,
      ...(limite !== undefined ? { limite } : {}),
      ordem: out.length,
    })
  }
  
  
  const cenas = montarLinhaDoTempo(cruas)
  cenas.forEach((cena, i) => {
    const pos = posDaCena[i]!
    out[pos] = { ...out[pos]!, cena, texto: textoDaCena(cena) }
  })
  return out
}


export function recomporCenas(blocos: Bloco[]): Bloco[] {
  const posDaCena = (blocos ?? []).flatMap((b, i) => (b.cena ? [i] : []))
  if (!posDaCena.length) return blocos ?? []
  const cenas = montarLinhaDoTempo(posDaCena.map((i) => blocos[i]!.cena!))
  const out = [...blocos]
  cenas.forEach((cena, k) => {
    const pos = posDaCena[k]!
    out[pos] = { ...out[pos]!, cena, texto: textoDaCena(cena) }
  })
  return out
}


export function falaDoRoteiro(blocos: Bloco[]): string {
  return (blocos ?? []).filter((b) => b.cena).map((b) => b.cena!.fala).filter(Boolean).join(' ')
}


const ROTULO_PADRAO: Record<BlocoKind, string> = {
  headline: 'Headline',
  subheadline: 'Apoio',
  cta: 'Chamada para ação',
  primario: 'Texto principal',
  descricao: 'Descrição',
  legenda: 'Legenda',
  assunto: 'Assunto',
  corpo: 'Corpo',
  slide: 'Slide',
  beat: 'Cena',
}


export function renderBlocos(blocos: Bloco[]): string {
  return [...(blocos ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((b) => `${b.rotulo}: ${b.texto}`)
    .join('\n\n')
}


export function violacaoDeLimite(texto: string | undefined, max: number, label: string): string | null {
  if (typeof texto !== 'string' || texto.length <= max) return null
  return `${label}: ${texto.length} caracteres (máx ${max})`
}


export function violacoesDosBlocos(blocos: Bloco[]): string[] {
  const out: string[] = []
  for (const b of blocos ?? []) {
    if (b.limite === undefined) continue
    const v = violacaoDeLimite(b.texto, b.limite, b.rotulo)
    if (v) out.push(v)
  }
  return out
}
