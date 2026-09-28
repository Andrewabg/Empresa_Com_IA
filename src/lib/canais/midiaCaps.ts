



export const CAP_IMAGEM_BYTES = 5 * 1024 * 1024    
export const CAP_AUDIO_BYTES = 16 * 1024 * 1024    
export const CAP_DOC_BYTES = 20 * 1024 * 1024      

export type MotivoRecusa = 'muito_grande' | 'tipo_nao_interpretavel'
export type VeredictoMidia =
  | { ok: true; modo: 'visao' | 'transcricao' | 'documento'; detalhe?: 'low' | 'high' }
  | { ok: false; motivo: MotivoRecusa; legenda: string }

const DOCS = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])


function baseMime(mime: string): string {
  return (mime ?? '').split(';')[0].trim().toLowerCase()
}

const recusa = (motivo: MotivoRecusa, legenda: string): VeredictoMidia => ({ ok: false, motivo, legenda })

export function avaliarMidiaInbound(input: { mime: string; bytes: number; kind?: string }): VeredictoMidia {
  const mime = baseMime(input.mime)
  const bytes = input.bytes
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return recusa('tipo_nao_interpretavel', 'Não consegui abrir esse arquivo. Pode mandar de novo?')
  }

  if (mime.startsWith('image/')) {
    if (bytes > CAP_IMAGEM_BYTES) {
      return recusa('muito_grande', 'Essa imagem é grande demais pra eu abrir. Pode mandar uma versão menor, ou escrever o que aparece nela?')
    }
    
    
    
    return { ok: true, modo: 'visao', detalhe: input.kind === 'sticker' ? 'low' : 'high' }
  }

  if (mime.startsWith('audio/')) {
    if (bytes > CAP_AUDIO_BYTES) {
      return recusa('muito_grande', 'Esse áudio é longo demais pra eu ouvir. Pode resumir por escrito?')
    }
    return { ok: true, modo: 'transcricao' }
  }

  if (DOCS.has(mime)) {
    if (bytes > CAP_DOC_BYTES) {
      return recusa('muito_grande', 'Esse arquivo é grande demais pra eu ler. Pode mandar só a parte que importa?')
    }
    return { ok: true, modo: 'documento' }
  }

  return recusa('tipo_nao_interpretavel', 'Não consigo ler esse tipo de arquivo. Pode me contar por escrito o que tem nele?')
}
