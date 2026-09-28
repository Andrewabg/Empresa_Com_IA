









import type { DocumentoDeArte } from './types'
import { getTemplateDeArte, templatesDoFormato, type BlocoDeArte, BLOCOS_DE_ARTE } from './templates'
import { getFamiliaDeFonte, type PapelDeFonte } from './fontes'
import { hexParaRgb } from './contraste'


export const LIMITES_DE_BLOCO: Record<BlocoDeArte, number> = {
  headline: 90,
  subheadline: 180,
  cta: 32,
  selo: 24,
}

export type CampoDeCor = 'fundo' | 'sobreFundo' | 'destaque' | 'botao' | 'sobreBotao'
const CAMPOS_DE_COR: CampoDeCor[] = ['fundo', 'sobreFundo', 'destaque', 'botao', 'sobreBotao']

export interface PatchDeArte {
  
  blocos?: Partial<Record<BlocoDeArte, string>>
  template?: string
  cores?: Partial<Record<CampoDeCor, string>>
  fontes?: Partial<Record<PapelDeFonte, string>>
  
  foco?: { x: number; y: number }
}

export interface ResultadoDoPatch {
  documento: DocumentoDeArte
  
  mudou: boolean
  
  recusas: string[]
}

const HEX = /^#[0-9a-fA-F]{6}$/
const ROTULO: Record<BlocoDeArte, string> = {
  headline: 'título', subheadline: 'apoio', cta: 'botão', selo: 'selo',
}


const limpar = (s: string): string => s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()

export function aplicarPatchDeArte(
  documento: DocumentoDeArte,
  patch: PatchDeArte,
  formato: string,
): ResultadoDoPatch {
  const recusas: string[] = []
  let mudou = false

  const blocos = { ...documento.blocos }
  for (const kind of BLOCOS_DE_ARTE) {
    const bruto = patch.blocos?.[kind]
    if (bruto === undefined) continue
    const texto = limpar(bruto)
    if (texto.length > LIMITES_DE_BLOCO[kind]) {
      recusas.push(`O texto de ${ROTULO[kind]} passa de ${LIMITES_DE_BLOCO[kind]} caracteres. Encurte e mande de novo.`)
      continue
    }
    const atual = blocos[kind] ?? ''
    if (texto === atual) continue
    if (texto) blocos[kind] = texto
    else delete blocos[kind]
    mudou = true
  }

  let template = documento.template
  if (patch.template !== undefined) {
    const alvo = (patch.template ?? '').trim().toLowerCase()
    const serve = templatesDoFormato(formato).some((t) => t.slug === alvo)
    if (!serve) {
      recusas.push('Esse layout não existe para este formato de anúncio.')
    } else if (alvo !== template) {
      template = alvo
      mudou = true
    }
  }

  const cores = { ...documento.cores }
  for (const campo of CAMPOS_DE_COR) {
    const bruto = patch.cores?.[campo]
    if (bruto === undefined) continue
    const hex = bruto.trim()
    if (!HEX.test(hex) || !hexParaRgb(hex)) {
      recusas.push(`"${bruto}" não é uma cor válida. Use o formato #RRGGBB.`)
      continue
    }
    if (hex.toUpperCase() === cores[campo]?.toUpperCase()) continue
    cores[campo] = hex
    mudou = true
  }

  const fontes = { ...documento.fontes }
  for (const papel of ['display', 'corpo'] as PapelDeFonte[]) {
    const bruto = patch.fontes?.[papel]
    if (bruto === undefined) continue
    const nome = bruto.trim()
    
    if (nome) {
      const familia = getFamiliaDeFonte(nome)
      if (!familia || !familia.papeis.includes(papel)) {
        recusas.push(`A fonte "${nome}" não está no pacote do estúdio para esse uso.`)
        continue
      }
    }
    if (nome === (fontes[papel] ?? '')) continue
    fontes[papel] = nome
    mudou = true
  }

  let foco = documento.foco
  if (patch.foco !== undefined) {
    const { x, y } = patch.foco
    const valido = [x, y].every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)
    if (!valido) {
      recusas.push('O ponto de enquadramento precisa estar dentro da imagem.')
    } else if (foco?.x !== x || foco?.y !== y) {
      foco = { x, y }
      mudou = true
    }
  }

  return {
    documento: { ...documento, blocos, template, cores, fontes, ...(foco ? { foco } : {}) },
    mudou,
    recusas,
  }
}


export function templateDoDocumento(documento: DocumentoDeArte): string {
  return getTemplateDeArte(documento.template).slug
}
