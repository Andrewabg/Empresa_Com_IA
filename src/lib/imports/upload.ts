




export const MAX_FILES = 20


export const MAX_BYTES = 15 * 1024 * 1024



export interface UploadFileInput {
  
  name: string
  
  size: number
}

export interface ValidateUploadResult {
  ok: boolean
  
  error?: string
  
  sanitized?: string[]
}




export function sanitizeFilename(name: string): string {
  
  let safe = name.trim()
  
  safe = safe.replace(/\\/g, '/')
  
  const parts = safe.split('/')
  
  const basename = parts.reverse().find(p => p.length > 0 && p !== '..') ?? ''
  return basename
}




export function validateUpload(files: UploadFileInput[]): ValidateUploadResult {
  if (files.length === 0) {
    return { ok: false, error: 'Nenhum arquivo enviado.' }
  }

  if (files.length > MAX_FILES) {
    return {
      ok: false,
      error: `Máximo de ${MAX_FILES} arquivo(s) por lote. Recebido: ${files.length}.`,
    }
  }

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return {
        ok: false,
        error: `Arquivo "${file.name}" excede o tamanho máximo de ${MAX_BYTES / 1024 / 1024}MB.`,
      }
    }
  }

  const sanitized = files.map(f => sanitizeFilename(f.name))
  return { ok: true, sanitized }
}




export const ACCEPT_ATTR =
  '.pdf,.txt,.md,.markdown,.docx,.csv,.xlsx,.png,.jpg,.jpeg,.webp,' +
  'application/pdf,text/plain,text/markdown,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'image/png,image/jpeg,image/webp'


export function capsLabel(): string {
  return `Até ${MAX_FILES} arquivos · ${MAX_BYTES / 1024 / 1024} MB cada · PDF, Word, texto, planilha e imagem`
}




export function canSubmitImport(context: string, supportedCount: number): boolean {
  return context.trim().length > 0 && supportedCount > 0
}
