







export const TIPOS_DE_IMAGEM: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export const MAX_BYTES_IMAGEM = 10 * 1024 * 1024


export const COPY_UPLOAD = {
  semArquivo: 'Envie o arquivo no campo "file".',
  formatoInvalido: 'Formato não suportado. Use PNG, JPG ou WebP.',
  grandeDemais: 'Arquivo grande demais. O limite é 10MB.',
  formInvalido: 'Não consegui ler o arquivo enviado.',
} as const

export type ValidacaoImagem =
  | { ok: true; ext: string }
  | { ok: false; erro: string }


export function validarImagem(f: { type?: string; size?: number }): ValidacaoImagem {
  const ext = TIPOS_DE_IMAGEM[(f?.type ?? '').toLowerCase()]
  if (!ext) return { ok: false, erro: COPY_UPLOAD.formatoInvalido }
  const size = f?.size ?? 0
  if (size <= 0) return { ok: false, erro: COPY_UPLOAD.semArquivo }
  if (size > MAX_BYTES_IMAGEM) return { ok: false, erro: COPY_UPLOAD.grandeDemais }
  return { ok: true, ext }
}
