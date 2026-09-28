



const MB = 1024 * 1024


export const CAP_LEGENDA = 1024

export const CAP_IMAGEM_SAIDA = 5 * MB
export const CAP_AUDIO_SAIDA = 16 * MB
export const CAP_VIDEO_SAIDA = 16 * MB
export const CAP_DOC_SAIDA = 100 * MB


export const ERRO_ARQUIVO_GRANDE = `O arquivo passa de ${CAP_DOC_SAIDA / MB} MB, o limite do WhatsApp.`


const IMAGEM_OK = new Set(['image/jpeg', 'image/png'])
const AUDIO_OK = new Set(['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'])

const VIDEO_OK = new Set(['video/mp4', 'video/3gpp'])

export type RecusaSaida = 'tipo_proibido' | 'grande_demais' | 'legenda_longa'
export type ValidacaoSaida =
  | { ok: true }
  | { ok: false; motivo: RecusaSaida; legenda: string }

const baseMime = (m: string) => (m ?? '').split(';')[0].trim().toLowerCase()
const nao = (motivo: RecusaSaida, legenda: string): ValidacaoSaida => ({ ok: false, motivo, legenda })

export type TipoSaida = 'imagem' | 'documento' | 'audio' | 'video'


export function tipoSaidaDoMime(mime: string, bytes?: number): TipoSaida {
  const base = baseMime(mime)
  if (IMAGEM_OK.has(base)) return 'imagem'
  if (VIDEO_OK.has(base)) return typeof bytes === 'number' && bytes > CAP_VIDEO_SAIDA ? 'documento' : 'video'
  if (base.startsWith('audio/')) return 'audio'
  return 'documento'
}

export function validarMidiaSaida(input: {
  tipo: TipoSaida
  mime: string
  bytes: number
  legenda?: string
}): ValidacaoSaida {
  const mime = baseMime(input.mime)

  if (!Number.isFinite(input.bytes) || input.bytes <= 0) {
    return nao('grande_demais', 'Arquivo vazio ou ilegível.')
  }
  if ((input.legenda?.length ?? 0) > CAP_LEGENDA) {
    return nao('legenda_longa', `A legenda passa de ${CAP_LEGENDA} caracteres, que é o limite do WhatsApp.`)
  }

  if (input.tipo === 'imagem') {
    if (!IMAGEM_OK.has(mime)) return nao('tipo_proibido', 'O WhatsApp só aceita JPEG e PNG como imagem. Converta o arquivo ou mande como documento.')
    if (input.bytes > CAP_IMAGEM_SAIDA) return nao('grande_demais', 'A imagem passa de 5 MB, o limite do WhatsApp.')
    return { ok: true }
  }
  if (input.tipo === 'audio') {
    if (!AUDIO_OK.has(mime)) return nao('tipo_proibido', 'O WhatsApp não aceita esse formato de áudio.')
    if (input.bytes > CAP_AUDIO_SAIDA) return nao('grande_demais', 'O áudio passa de 16 MB, o limite do WhatsApp.')
    return { ok: true }
  }
  if (input.tipo === 'video') {
    if (!VIDEO_OK.has(mime)) return nao('tipo_proibido', 'O WhatsApp só aceita MP4 e 3GPP como vídeo. Converta o arquivo ou mande como documento.')
    if (input.bytes > CAP_VIDEO_SAIDA) return nao('grande_demais', 'O vídeo passa de 16 MB, o limite do WhatsApp.')
    return { ok: true }
  }
  
  if (input.bytes > CAP_DOC_SAIDA) return nao('grande_demais', ERRO_ARQUIVO_GRANDE)
  return { ok: true }
}
