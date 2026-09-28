

import { marcadorDeAnexo } from '@/lib/conversa/materiais'


export type PartePrompt =
  | { type: 'text'; text: string }
  | { type: 'image'; image: Uint8Array; mediaType: string }
  | { type: 'file'; data: Uint8Array; mediaType: string; filename: string }


export interface AnexoResolvido {
  
  nome: string
  
  mediaType: string
  bytes: Uint8Array
}


export function montarPartesDoUsuario(
  texto: string,
  anexos: AnexoResolvido[],
): string | PartePrompt[] {
  if (anexos.length === 0) return texto

  const textoDoPart = texto.trim().length > 0 ? texto : marcadorDeAnexo(anexos.map((a) => a.nome))
  const partes: PartePrompt[] = [{ type: 'text', text: textoDoPart }]

  for (const a of anexos) {
    partes.push(
      a.mediaType === 'application/pdf'
        ? { type: 'file', data: a.bytes, mediaType: a.mediaType, filename: a.nome }
        : { type: 'image', image: a.bytes, mediaType: a.mediaType },
    )
  }

  return partes
}
