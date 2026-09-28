















export type PapelDeFonte = 'display' | 'corpo'

export interface ArquivoDeFonte {
  
  arquivo: string
  
  peso: number
}

export interface FamiliaDeFonte {
  slug: string
  
  familia: string
  
  rotulo: string
  
  descricao: string
  papeis: PapelDeFonte[]
  arquivos: ArquivoDeFonte[]
}


export const FAMILIA_EMOJI = 'Noto Emoji'
export const ARQUIVO_EMOJI = 'NotoEmoji-wght.ttf'

export const FAMILIAS_DE_FONTE: FamiliaDeFonte[] = [
  {
    slug: 'anton', familia: 'Anton', rotulo: 'Anton',
    descricao: 'Título grosso e apertado. É o que grita na miniatura do feed.',
    papeis: ['display'],
    arquivos: [{ arquivo: 'Anton-Regular.ttf', peso: 400 }],
  },
  {
    slug: 'archivo-black', familia: 'Archivo Black', rotulo: 'Archivo Black',
    descricao: 'Título largo e pesado. Ocupa a linha inteira com poucas palavras.',
    papeis: ['display'],
    arquivos: [{ arquivo: 'ArchivoBlack-Regular.ttf', peso: 400 }],
  },
  {
    slug: 'bebas-neue', familia: 'Bebas Neue', rotulo: 'Bebas Neue',
    descricao: 'Título alto e estreito, tudo em maiúscula. Cabe frase longa sem encolher.',
    papeis: ['display'],
    arquivos: [{ arquivo: 'BebasNeue-Regular.ttf', peso: 400 }],
  },
  {
    slug: 'poppins', familia: 'Poppins', rotulo: 'Poppins',
    descricao: 'Redonda e moderna. Serve de título e de texto, e é a escolha segura.',
    papeis: ['display', 'corpo'],
    arquivos: [
      { arquivo: 'Poppins-Regular.ttf', peso: 400 },
      { arquivo: 'Poppins-SemiBold.ttf', peso: 600 },
      { arquivo: 'Poppins-Bold.ttf', peso: 700 },
    ],
  },
  {
    slug: 'pt-serif', familia: 'PT Serif', rotulo: 'PT Serif',
    descricao: 'Com serifa, ar de revista. Passa seriedade em peça de conteúdo.',
    papeis: ['display', 'corpo'],
    arquivos: [
      { arquivo: 'PT_Serif-Web-Regular.ttf', peso: 400 },
      { arquivo: 'PT_Serif-Web-Bold.ttf', peso: 700 },
    ],
  },
]


export const FAMILIA_DISPLAY_PADRAO = 'anton'
export const FAMILIA_CORPO_PADRAO = 'poppins'

const norm = (s: string): string =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s_]+/g, '-')

export function getFamiliaDeFonte(slug: string): FamiliaDeFonte | null {
  const s = norm(slug)
  if (!s) return null
  return FAMILIAS_DE_FONTE.find((f) => f.slug === s || norm(f.familia) === s || norm(f.rotulo) === s) ?? null
}

export interface FamiliaResolvida {
  familia: FamiliaDeFonte
  
  caiuNoPadrao: boolean
  
  pedida?: string
}


export function resolverFamilia(nome: string | null | undefined, papel: PapelDeFonte): FamiliaResolvida {
  const achada = getFamiliaDeFonte(nome ?? '')
  if (achada && achada.papeis.includes(papel)) return { familia: achada, caiuNoPadrao: false }
  const padrao = getFamiliaDeFonte(papel === 'display' ? FAMILIA_DISPLAY_PADRAO : FAMILIA_CORPO_PADRAO)!
  const pedida = (nome ?? '').trim()
  return { familia: padrao, caiuNoPadrao: true, ...(pedida ? { pedida } : {}) }
}


export function pesoDisponivel(familia: FamiliaDeFonte, pedido: number): number {
  const pesos = familia.arquivos.map((a) => a.peso)
  let melhor = pesos[0]!
  for (const p of pesos) if (Math.abs(p - pedido) < Math.abs(melhor - pedido)) melhor = p
  return melhor
}

const precisaAspas = (f: string): boolean => /[^A-Za-z0-9-]/.test(f)
const citar = (f: string): string => (precisaAspas(f) ? `"${f}"` : f)


export function pilhaDeFontes(familia: string): string {
  return `${citar(familia)}, ${citar(FAMILIA_EMOJI)}`
}

export interface EspecDeFonte {
  familia: string
  peso: number
  tamanho: number
}


export function fontShorthand(f: EspecDeFonte): string {
  return `${f.peso} ${f.tamanho}px ${pilhaDeFontes(f.familia)}`
}


export function arquivosDeFonte(): string[] {
  return [...FAMILIAS_DE_FONTE.flatMap((f) => f.arquivos.map((a) => a.arquivo)), ARQUIVO_EMOJI]
}
