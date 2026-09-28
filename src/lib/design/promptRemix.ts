












export interface AlvoDoRemix {
  
  proporcao: string
}

export interface PedidoDeRemix {
  
  pedido: string
  alvo: AlvoDoRemix
  
  temSuporte?: boolean
  
  marca?: string
}


export const PRESERVAR_NO_REMIX = [
  'PRESERVE EVERYTHING ELSE EXACTLY AS IT IS in the supplied image:',
  '- the same scene, the same objects, in the same positions',
  '- the same camera angle, the same framing, the same crop',
  '- the same lighting, the same shadows, the same colour grade',
  '- the same wording for every piece of text that the request does not name, letter for letter, accents included',
  '- the same typeface, the same size, the same position for that text',
].join('\n')

export const NAO_E_FOTO_NOVA =
  'This is a retouch of the supplied image, not a new picture. If you cannot apply the change without redrawing the whole scene, apply the smallest version of the change that keeps the image intact.'

export function promptRemix(p: PedidoDeRemix): string {
  const partes: string[] = [
    'Edit the supplied advertising image.',
    '',
    
    
    'CHANGE REQUESTED (Brazilian Portuguese, from the person who owns this ad):',
    p.pedido.trim(),
    '',
    'Apply ONLY this change.',
    PRESERVAR_NO_REMIX,
    '',
    NAO_E_FOTO_NOVA,
  ]
  if (p.marca?.trim()) {
    
    
    partes.push(`The brand signature "${p.marca.trim()}" is printed in the supplied image. It MUST still be there in the result, with the same wording, in the same corner, at the same size. Losing it is a failed edit.`)
  }
  if (p.temSuporte) {
    
    
    partes.push('The advertising text is physically printed or written on a surface inside the scene. If the change touches the text, it stays on that same surface, following its perspective, its lighting and its imperfections. Nothing floats over the photograph.')
  }
  partes.push(
    `The result is still a finished ${p.alvo.proporcao} advertisement: every line of text readable, nothing cropped, no empty margin where the change used to be.`,
    'Any Brazilian Portuguese text you draw must be rendered exactly as written, with every accent and cedilla intact.',
    
    
    
    
    'NEGATIVE: do not ADD any logo, watermark, caption bar or text of your own that is not already in the supplied image. Never draw garbled or invented lettering. Anything already present stays.',
  )
  return partes.join('\n')
}


export const FIDELIDADE_NA_FINAL = [
  'Redraw the supplied image at full quality.',
  'Keep the same scene, the same objects in the same positions, the same framing and crop, the same lighting and colour grade, and the same text, letter for letter, in the same place and the same lettering style.',
  'The description below is what the supplied image ALREADY shows. It is context for the redraw, not a brief for a new picture. Do not invent a different scene.',
].join('\n')


export function promptDaArteFinal(promptDoAnuncio: string): string {
  return `${FIDELIDADE_NA_FINAL}\n\n${promptDoAnuncio}`
}
