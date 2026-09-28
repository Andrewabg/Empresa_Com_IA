

import { campoSeguro } from '@/lib/fontes/sanitizar'


export type PapelDaCor = 'primaria' | 'secundaria' | 'fundo' | 'texto' | 'destaque'
export interface CorPaleta { nome: string; hex: string; papel?: PapelDaCor }


export interface Tipografia { display?: string; corpo?: string }
export interface DesignLearning {
  texto: string
  
  origem: 'entrevista' | 'revisao' | 'operador' | 'reflector'
  at: string
}
export interface DirecaoArte {
  paleta?: CorPaleta[]
  estiloFotografico?: string   
  iluminacao?: string
  composicao?: string
  mood?: string
  proibicoes?: string[]        
  assinatura?: string          
  
  logoArtifactId?: string
  
  logoMonoArtifactId?: string
  tipografia?: Tipografia
  aprendizados: DesignLearning[]
}

export const EMPTY_DIRECAO_ARTE: DirecaoArte = Object.freeze({ aprendizados: [] }) as DirecaoArte
export const APRENDIZADOS_VISUAIS_CAP = 40
const PALETA_CAP = 8
const PROIBICOES_CAP = 20
const norm = (s: string): string => s.trim().toLowerCase()


export interface DirecaoArtePatch {
  paleta?: CorPaleta[]
  estiloFotografico?: string
  iluminacao?: string
  composicao?: string
  mood?: string
  proibicoes?: string[]
  assinatura?: string
  logoArtifactId?: string
  logoMonoArtifactId?: string
  tipografia?: Tipografia
  aprendizados?: { texto: string }[]
}

function mergeStrArr(atual: string[] | undefined, novos: string[] | undefined, cap: number): string[] {
  const out = [...(atual ?? [])]
  const seen = new Set(out.map(norm))
  for (const raw of novos ?? []) {
    const t = raw.trim()
    if (!t || seen.has(norm(t))) continue
    seen.add(norm(t)); out.push(t)
  }
  return out.length > cap ? out.slice(out.length - cap) : out
}

function mergePaleta(atual: CorPaleta[] | undefined, novas: CorPaleta[] | undefined): CorPaleta[] {
  const out = [...(atual ?? [])]
  const seen = new Set(out.map((c) => norm(c.hex)))
  for (const c of novas ?? []) {
    const hex = c.hex?.trim()
    if (!hex) continue
    const i = out.findIndex((x) => norm(x.hex) === norm(hex))
    if (i >= 0) {
      
      
      if (c.papel && !out[i].papel) out[i] = { ...out[i], papel: c.papel }
      continue
    }
    seen.add(norm(hex))
    out.push({ nome: c.nome?.trim() || hex, hex, ...(c.papel ? { papel: c.papel } : {}) })
  }
  return out.length > PALETA_CAP ? out.slice(out.length - PALETA_CAP) : out
}

export function mergeDirecaoArte(
  atual: DirecaoArte, patch: DirecaoArtePatch,
  ctx: { origem: DesignLearning['origem']; at: string },
): DirecaoArte {
  let aprendizados = [...(atual.aprendizados ?? [])]
  const seen = new Set(aprendizados.map((l) => norm(l.texto)))
  for (const raw of patch.aprendizados ?? []) {
    const t = raw.texto.trim()
    if (!t || seen.has(norm(t))) continue
    seen.add(norm(t))
    aprendizados.push({ texto: t, origem: ctx.origem, at: ctx.at })
  }
  if (aprendizados.length > APRENDIZADOS_VISUAIS_CAP) {
    aprendizados = aprendizados.slice(aprendizados.length - APRENDIZADOS_VISUAIS_CAP)
  }
  return {
    paleta: mergePaleta(atual.paleta, patch.paleta),
    logoArtifactId: patch.logoArtifactId?.trim() || atual.logoArtifactId,
    logoMonoArtifactId: patch.logoMonoArtifactId?.trim() || atual.logoMonoArtifactId,
    tipografia: {
      display: patch.tipografia?.display?.trim() || atual.tipografia?.display,
      corpo: patch.tipografia?.corpo?.trim() || atual.tipografia?.corpo,
    },
    estiloFotografico: patch.estiloFotografico?.trim() || atual.estiloFotografico,
    iluminacao: patch.iluminacao?.trim() || atual.iluminacao,
    composicao: patch.composicao?.trim() || atual.composicao,
    mood: patch.mood?.trim() || atual.mood,
    proibicoes: mergeStrArr(atual.proibicoes, patch.proibicoes, PROIBICOES_CAP),
    assinatura: patch.assinatura?.trim() || atual.assinatura,
    aprendizados,
  }
}


export function removerCorDaPaleta(d: DirecaoArte, hex: string): DirecaoArte {
  const alvo = norm(hex ?? '')
  if (!alvo) return d
  return { ...d, paleta: (d.paleta ?? []).filter((c) => norm(c.hex) !== alvo) }
}


export function removerAprendizadoVisual(d: DirecaoArte, texto: string): DirecaoArte {
  return { ...d, aprendizados: (d.aprendizados ?? []).filter((a) => a.texto !== texto) }
}


export const TETO_DA_ENTRADA_DA_DIRECAO = 300
function cortarPorCodePoint(s: string, max: number): string {
  return Array.from(s).slice(0, max).join('')
}
function campoDaDirecao(s: string): string {
  return cortarPorCodePoint(campoSeguro(s), TETO_DA_ENTRADA_DA_DIRECAO)
}
const campoDaDirecaoOpc = (s: string | undefined): string | undefined => (s ? campoDaDirecao(s) : s)
const arrDaDirecao = (arr: string[] | undefined): string[] | undefined => arr?.map(campoDaDirecao)


export function direcaoArteSaneada(d: DirecaoArte): DirecaoArte {
  return {
    paleta: d.paleta?.map((c) => ({ nome: campoDaDirecao(c.nome), hex: c.hex, ...(c.papel ? { papel: c.papel } : {}) })),
    logoArtifactId: d.logoArtifactId,
    logoMonoArtifactId: d.logoMonoArtifactId,
    tipografia: { display: campoDaDirecaoOpc(d.tipografia?.display), corpo: campoDaDirecaoOpc(d.tipografia?.corpo) },
    estiloFotografico: campoDaDirecaoOpc(d.estiloFotografico),
    iluminacao: campoDaDirecaoOpc(d.iluminacao),
    composicao: campoDaDirecaoOpc(d.composicao),
    mood: campoDaDirecaoOpc(d.mood),
    proibicoes: arrDaDirecao(d.proibicoes),
    assinatura: campoDaDirecaoOpc(d.assinatura),
    aprendizados: (d.aprendizados ?? []).map((a) => ({ ...a, texto: campoDaDirecao(a.texto) })),
  }
}


export function renderDirecaoArte(d: DirecaoArte): string {
  const L: string[] = []
  if (d.paleta?.length) L.push(`Paleta da marca: ${d.paleta.map((c) => `${c.nome} (${c.hex})${c.papel ? ' [' + c.papel + ']' : ''}`).join(', ')}`)
  if (d.tipografia?.display || d.tipografia?.corpo) {
    L.push(`Tipografia: título ${d.tipografia.display || '(livre)'}, corpo ${d.tipografia.corpo || '(livre)'}`)
  }
  if (d.estiloFotografico) L.push(`Estilo fotográfico: ${d.estiloFotografico}`)
  if (d.iluminacao) L.push(`Iluminação: ${d.iluminacao}`)
  if (d.composicao) L.push(`Composição: ${d.composicao}`)
  if (d.mood) L.push(`Mood: ${d.mood}`)
  if (d.assinatura) L.push(`Assinatura visual: ${d.assinatura}`)
  if (d.proibicoes?.length) L.push(`NUNCA fazer: ${d.proibicoes.join('; ')}`)
  for (const a of d.aprendizados ?? []) L.push(`- ${a.texto}`)
  return L.join('\n')
}


export function renderRegistroVisual(d: DirecaoArte): string {
  const L: string[] = []
  if (d.mood) L.push(`Mood da marca: ${d.mood}`)
  if (d.estiloFotografico) L.push(`Registro visual: ${d.estiloFotografico}`)
  const nomes = (d.paleta ?? []).map((c) => c.nome).filter(Boolean)
  if (nomes.length) L.push(`Cores da marca: ${nomes.join(', ')}`)
  const proib = d.proibicoes ?? []
  if (proib.length) L.push(`A marca NUNCA faz: ${proib.join('; ')}`)
  return L.join('\n')
}


export function direcaoArteVazia(d: DirecaoArte | null | undefined): boolean {
  if (!d) return true
  return (
    !d.paleta?.length &&
    !d.estiloFotografico &&
    !d.iluminacao &&
    !d.composicao &&
    !d.mood &&
    !d.assinatura &&
    !d.proibicoes?.length &&
    !d.aprendizados?.length &&
    !d.logoArtifactId &&
    !d.logoMonoArtifactId &&
    !d.tipografia?.display &&
    !d.tipografia?.corpo
  )
}


export function temAtivoDaMarca(d: DirecaoArte | null | undefined): boolean {
  return !!(d?.logoArtifactId || d?.logoMonoArtifactId || d?.tipografia?.display?.trim() || d?.tipografia?.corpo?.trim())
}
