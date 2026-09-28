















import { getFormatoDesign } from './formatos'
import type { SuporteDoTexto } from './suportes'


export interface AlvoDoAnuncio {
  
  proporcao: string
  
  onde: string
}


export function blocoDeLinhas(rotulo: string, texto: string, travado: boolean): string {
  const linhas = texto.split('\n')
  let out = `${rotulo} - render EXACTLY, verbatim`
  if (travado) out += `, on EXACTLY ${linhas.length} line(s), with these line breaks locked`
  out += ':\n'
  linhas.forEach((l, i) => { out += `  line ${i + 1}: "${l}"\n` })
  out += `  as one block:\n<<<\n${texto}\n>>>\n`
  return out
}

export interface PedidoDeAnuncio {
  
  cena: string
  
  camera?: string
  headline?: string
  subheadline?: string
  cta?: string
  alvo: AlvoDoAnuncio
  
  cru?: boolean
  
  marca?: string
  
  suporte?: SuporteDoTexto
}


export const OCUPACAO_DO_SUPORTE =
  'FILL THE SURFACE: the advertising text is the reason this surface is in the frame. It fills the surface edge to edge, leaving only a narrow even margin around it. The headline alone occupies at least half of the surface height and its longest line nearly touches both margins. Do not leave large empty areas of the surface unused.'


const temTexto = (s: string | undefined): s is string => !!s && !!s.trim()


export function promptAnuncioInteiro(p: PedidoDeAnuncio): string {
  const partes: string[] = [
    `Create a single ${p.alvo.proporcao} direct-response advertising creative for ${p.alvo.onde}. The text below is Brazilian Portuguese and must be rendered exactly as written, with every accent and cedilla intact.`,
    '',
    `SCENE: ${p.cena}`,
  ]
  if (temTexto(p.camera)) partes.push(`CAPTURE: ${p.camera}`)
  if (p.suporte) {
    
    
    partes.push(`TEXT SURFACE: ${p.suporte.objeto}. Every line of the advertising text below is physically printed or written ON this surface, following its perspective, its lighting and its imperfections. Nothing floats over the photograph.`)
    partes.push(`LETTERING: ${p.suporte.tipografia}.`)
    partes.push(OCUPACAO_DO_SUPORTE)
  }
  partes.push('')
  const onde = p.suporte ? 'HEADLINE (largest text on the surface)' : 'HEADLINE (largest text, lower half of the frame)'
  if (temTexto(p.headline)) partes.push(blocoDeLinhas(onde, p.headline, true))
  if (temTexto(p.subheadline)) partes.push(blocoDeLinhas('SUPPORT LINE (smaller, right below the headline)', p.subheadline, true))
  if (temTexto(p.cta)) {
    
    
    const ondeCta = p.suporte
      ? 'CTA (smallest line, set apart at the bottom of the same surface, NO button and NO pill)'
      : p.cru
        ? 'CTA (small, plain text near the bottom, NO button, NO pill, NO shape behind it)'
        : 'CTA (small, centred inside a rounded pill button near the bottom)'
    partes.push(blocoDeLinhas(ondeCta, p.cta, false))
  }
  if (temTexto(p.marca)) {
    partes.push(blocoDeLinhas('BRAND SIGNATURE (small and discreet, in a top corner, far from the headline, lit by the same light as the scene)', p.marca, false))
  }
  partes.push(
    'RULE: Do not add headings, labels, extra buttons, logos, watermarks or explanatory text that are not explicitly supplied above. Do not translate. Do not paraphrase. Do not drop accents.',
    'SAFE AREA: keep every piece of text at least 8% of the image width away from all four edges.',
    'NEGATIVE: no plastic skin, no stock-photo symmetry, no 3D render, no impossible studio lighting, no garbled or invented lettering anywhere.',
  )
  return partes.join('\n')
}


const ONDE: Record<string, string> = {
  'post-quadrado': 'Instagram feed',
  'post-feed': 'Instagram feed',
  story: 'Instagram Stories and Reels',
  carrossel: 'an Instagram carousel',
  'anuncio-paisagem': 'a Facebook link ad',
}

function mdc(a: number, b: number): number {
  return b === 0 ? a : mdc(b, a % b)
}


export function alvoDoAnuncio(formatoSlug: string): AlvoDoAnuncio {
  const f = getFormatoDesign(formatoSlug)
  const d = mdc(f.alvoLargura, f.alvoAltura) || 1
  return {
    proporcao: `${f.alvoLargura / d}:${f.alvoAltura / d}`,
    onde: ONDE[f.slug] ?? 'a social feed',
  }
}
