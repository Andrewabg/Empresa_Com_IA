











export type GravidadeDoPortao = 'bloqueia' | 'ressalva'

export interface ResultadoDoPortao {
  portao: string
  
  rotulo: string
  passou: boolean
  
  evidencia: string
  gravidade: GravidadeDoPortao
}


export const PALAVRAS_POR_MINUTO = 145

export const TOLERANCIA_DE_DURACAO = 1.15

const ok = (portao: string, rotulo: string, evidencia: string): ResultadoDoPortao =>
  ({ portao, rotulo, passou: true, evidencia, gravidade: 'bloqueia' })






const PLACEHOLDER = /\[(?:PROVA|INSERIR|INSIRA|COLOQUE|NÚMERO|NUMERO|X+|TODO|PREENCHER)\b[^\]]*\]/gi

export function portaoDePlaceholder(texto: string): ResultadoDoPortao {
  const achados = [...(texto ?? '').matchAll(PLACEHOLDER)].map((m) => m[0])
  if (!achados.length) return ok('placeholder', 'Sem lacuna esquecida no texto', 'nenhum marcador entre colchetes')
  return {
    portao: 'placeholder',
    rotulo: 'Ficou uma lacuna no texto',
    passou: false,
    evidencia: achados.slice(0, 3).join(' · '),
    gravidade: 'bloqueia',
  }
}






export const PROMESSAS_DE_RISCO: { padrao: RegExp; motivo: string }[] = [
  { padrao: /\bcura\b|\bcurar\b/i, motivo: 'promessa de cura' },
  { padrao: /\bmilagr\w+/i, motivo: 'promessa milagrosa' },
  { padrao: /resultado\s+garantid\w+|garantia\s+de\s+resultado/i, motivo: 'resultado garantido' },
  { padrao: /\b100\s*%\s*(de\s*)?(resultado|eficaz|garantid\w+)/i, motivo: 'eficácia absoluta' },
  { padrao: /sem\s+(nenhum\s+)?esforço|sem\s+fazer\s+nada/i, motivo: 'promessa de resultado sem esforço' },
  { padrao: /ganhe\s+r\$\s*[\d.,]+\s*(por|ao)\s+(dia|semana|mês|mes)/i, motivo: 'promessa de ganho fixo' },
  { padrao: /aprovado\s+pela\s+anvisa/i, motivo: 'alegação de aprovação sanitária' },
  { padrao: /emagre[çc]\w*\s+\d+\s*(kg|quilos?)/i, motivo: 'promessa de emagrecimento com número' },
]

export function portaoDePromessa(texto: string): ResultadoDoPortao {
  const t = texto ?? ''
  const achados = PROMESSAS_DE_RISCO.filter((p) => p.padrao.test(t))
  if (!achados.length) return ok('promessa', 'Sem promessa que reprova o anúncio', 'nenhum termo de risco encontrado')
  return {
    portao: 'promessa',
    rotulo: 'Promessa que pode reprovar o anúncio',
    passou: false,
    evidencia: achados.map((a) => a.motivo).join(' · '),
    gravidade: 'bloqueia',
  }
}






export const MARCADORES_DE_IA: RegExp[] = [
  /\bno\s+mundo\s+de\s+hoje\b/i,
  /\bnos\s+dias\s+de\s+hoje\b/i,
  /\bnão\s+é\s+(apenas|só)\s+.{1,40}?,\s*(é|e)\b/i,
  /\bmergulh\w+\s+(no|na|em)\b/i,
  /\bdesvend\w+\s+o\s+segredo\b/i,
  /\beleve\s+(o|a|seu|sua)\b/i,
  /\bem\s+(suma|conclusão)\b/i,
  /\btransform\w+\s+sua\s+vida\b/i,
  /\brevolucion\w+\s+(o|a|seu|sua)\b/i,
  /\bnesta\s+jornada\b/i,
]

export const MARCADORES_PARA_AVISAR = 2

export function portaoDeCheiroDeIa(texto: string): ResultadoDoPortao {
  const t = texto ?? ''
  const achados = MARCADORES_DE_IA.filter((r) => r.test(t)).map((r) => (t.match(r) ?? [''])[0].trim())
  if (achados.length < MARCADORES_PARA_AVISAR) {
    return { portao: 'cheiroDeIa', rotulo: 'O texto não soa genérico', passou: true, evidencia: `${achados.length} muleta(s)`, gravidade: 'ressalva' }
  }
  return {
    portao: 'cheiroDeIa',
    rotulo: 'O texto tem cara de escrito por máquina',
    passou: false,
    evidencia: achados.slice(0, 3).map((a) => `"${a}"`).join(' · '),
    gravidade: 'ressalva',
  }
}






export function duracaoAlvoDoTexto(texto: string | null | undefined): number | null {
  const t = (texto ?? '').toLowerCase()
  const min = /(\d{1,2})\s*(?:min\b|minutos?\b)/.exec(t)
  if (min) return Number(min[1]) * 60
  const seg = /(\d{1,3})\s*(?:s\b|seg\b|segundos?\b)/.exec(t)
  if (seg) return Number(seg[1])
  return null
}

export function contarPalavras(texto: string): number {
  return (texto ?? '').trim().split(/\s+/).filter(Boolean).length
}

export function segundosDeFala(palavras: number): number {
  return (palavras / PALAVRAS_POR_MINUTO) * 60
}


export function portaoDeDuracao(texto: string, alvoSegundos: number | null): ResultadoDoPortao {
  if (!alvoSegundos || alvoSegundos <= 0) {
    return { portao: 'duracao', rotulo: 'Duração não declarada', passou: true, evidencia: 'sem duração alvo para comparar', gravidade: 'ressalva' }
  }
  const palavras = contarPalavras(texto)
  const segundos = segundosDeFala(palavras)
  const evidencia = `${palavras} palavras dão cerca de ${Math.round(segundos)}s falados, e o alvo é ${alvoSegundos}s`
  if (segundos <= alvoSegundos * TOLERANCIA_DE_DURACAO) {
    return { portao: 'duracao', rotulo: 'O roteiro cabe no tempo', passou: true, evidencia, gravidade: 'bloqueia' }
  }
  return { portao: 'duracao', rotulo: 'O roteiro não cabe no tempo', passou: false, evidencia, gravidade: 'bloqueia' }
}





export interface CampoMedido { campo: string; label: string; usado: number; max: number }


export function portaoDeLimites(campos: CampoMedido[]): ResultadoDoPortao {
  const estourados = (campos ?? []).filter((c) => c.usado > c.max)
  if (!estourados.length) {
    return { portao: 'limites', rotulo: 'Tudo cabe no que a plataforma mostra', passou: true, evidencia: `${(campos ?? []).length} campo(s) medido(s)`, gravidade: 'ressalva' }
  }
  return {
    portao: 'limites',
    rotulo: 'Algo passa do que a plataforma mostra',
    passou: false,
    evidencia: estourados.map((c) => `${c.label}: ${c.usado}/${c.max}`).join(' · '),
    gravidade: 'ressalva',
  }
}





export interface FatoDoBloco {
  bloco: string
  
  coube: boolean
  
  razao?: number
  
  foraDaZona?: boolean
}

const ROTULO_DO_BLOCO: Record<string, string> = {
  headline: 'título', subheadline: 'apoio', cta: 'botão', selo: 'selo',
}
const nomeDoBloco = (b: string): string => ROTULO_DO_BLOCO[b] ?? b

export const CONTRASTE_MINIMO_DA_ARTE = 4.5

export function portaoDeOverflow(fatos: FatoDoBloco[]): ResultadoDoPortao {
  const estourados = (fatos ?? []).filter((f) => !f.coube)
  if (!estourados.length) return ok('overflow', 'Todo texto coube na arte', `${(fatos ?? []).length} bloco(s) medido(s)`)
  return {
    portao: 'overflow',
    rotulo: 'Tem texto apertado demais na arte',
    passou: false,
    evidencia: estourados.map((f) => nomeDoBloco(f.bloco)).join(' · '),
    gravidade: 'bloqueia',
  }
}

export function portaoDeZonaSegura(fatos: FatoDoBloco[]): ResultadoDoPortao {
  const fora = (fatos ?? []).filter((f) => f.foraDaZona)
  if (!fora.length) return ok('zonaSegura', 'Nada cai onde o aplicativo cobre', `${(fatos ?? []).length} bloco(s) medido(s)`)
  return {
    portao: 'zonaSegura',
    rotulo: 'Tem texto onde o aplicativo cobre a arte',
    passou: false,
    evidencia: fora.map((f) => nomeDoBloco(f.bloco)).join(' · '),
    gravidade: 'bloqueia',
  }
}

export function portaoDeContraste(fatos: FatoDoBloco[]): ResultadoDoPortao {
  const medidos = (fatos ?? []).filter((f) => typeof f.razao === 'number')
  const fracos = medidos.filter((f) => f.razao! < CONTRASTE_MINIMO_DA_ARTE)
  if (!fracos.length) {
    const pior = medidos.reduce((m, f) => Math.min(m, f.razao!), Infinity)
    return ok('contraste', 'O texto lê bem sobre a imagem', medidos.length ? `menor contraste: ${pior.toFixed(1)}:1` : 'nenhum bloco medido')
  }
  return {
    portao: 'contraste',
    rotulo: 'Tem texto que some no fundo',
    passou: false,
    evidencia: fracos.map((f) => `${nomeDoBloco(f.bloco)}: ${f.razao!.toFixed(1)}:1`).join(' · '),
    gravidade: 'bloqueia',
  }
}





export interface Laudo {
  portoes: ResultadoDoPortao[]
  
  aprovado: boolean
  
  problemas: string[]
}

export function montarLaudo(portoes: ResultadoDoPortao[]): Laudo {
  const reprovados = portoes.filter((p) => !p.passou)
  return {
    portoes,
    aprovado: !reprovados.some((p) => p.gravidade === 'bloqueia'),
    problemas: reprovados.map((p) => `${p.rotulo} (${p.evidencia})`),
  }
}


export function laudoDaCopy(args: {
  texto: string
  campos?: CampoMedido[]
  duracaoAlvoSegundos?: number | null
  ehRoteiro?: boolean
  
  textoFalado?: string
}): Laudo {
  const portoes: ResultadoDoPortao[] = [
    portaoDePlaceholder(args.texto),
    portaoDePromessa(args.texto),
    portaoDeCheiroDeIa(args.texto),
    portaoDeLimites(args.campos ?? []),
  ]
  if (args.ehRoteiro) {
    const falado = (args.textoFalado ?? '').trim()
    portoes.push(portaoDeDuracao(falado || args.texto, args.duracaoAlvoSegundos ?? null))
  }
  return montarLaudo(portoes)
}


export function laudoDaArte(args: { fatos: FatoDoBloco[]; texto?: string }): Laudo {
  const portoes: ResultadoDoPortao[] = [
    portaoDeOverflow(args.fatos),
    portaoDeZonaSegura(args.fatos),
    portaoDeContraste(args.fatos),
  ]
  
  
  if (args.texto !== undefined) {
    portoes.push(portaoDePlaceholder(args.texto), portaoDePromessa(args.texto))
  }
  return montarLaudo(portoes)
}
