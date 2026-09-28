
import type { ImageQueueItem } from './imageQueueView'

export interface ImportApiFile {
  filename: string
  status: string
  error: string | null
}

export interface ImportCandidateView {
  id: number
  titulo: string
  corpo: string
  tipo: string | null
  tags: string[]
  status: string
}

export interface ImportApiResponse {
  status: string
  file_count: number
  fact_count: number
  summary: string | null
  files: ImportApiFile[]
  candidates?: ImportCandidateView[]
  
  activeCursor?: { done: number; total: number; unit: 'chunks' | 'pages'; realTotal?: number }
  
  imagens?: ImageQueueItem[]
}

export type Tone = 'active' | 'done' | 'partial' | 'error'

export interface ImportFileView {
  name: string
  label: string
  tone: 'active' | 'done' | 'error'
}

export interface ImportView {
  headline: string
  detail: string
  tone: Tone
  terminal: boolean
  factCount: number
  files: ImportFileView[]
  review: boolean
  candidates?: ImportCandidateView[]
  
  imagens: ImageQueueItem[]
}


export const TERMINAL_STATUSES: Set<string> = new Set(['done', 'failed', 'undone'])


export function shouldPoll(status: string): boolean {
  return !TERMINAL_STATUSES.has(status)
}


export function viewImport(r: ImportApiResponse): ImportView {
  const terminal = TERMINAL_STATUSES.has(r.status)

  
  const total = r.files.length || r.file_count
  const doneCount = r.files.filter(f => f.status === 'distilled' || f.status === 'failed').length
  const failedCount = r.files.filter(f => f.status === 'failed').length

  
  let tone: Tone
  if (r.status === 'failed') {
    tone = 'error'
  } else if (r.status === 'done') {
    tone = failedCount > 0 ? 'partial' : 'done'
  } else if (r.status === 'undone') {
    tone = 'done'
  } else {
    
    tone = 'active'
  }

  
  let headline: string
  if (r.status === 'queued') {
    headline = 'Preparando importação…'
  } else if (r.status === 'extracting') {
    headline = 'Lendo os arquivos…'
  } else if (r.status === 'distilling') {
    headline = 'Destilando o conhecimento…'
  } else if (r.status === 'curating') {
    headline = 'Organizando no Cérebro…'
  } else if (r.status === 'review') {
    const n = r.candidates?.length ?? 0
    headline = `${n} ${n === 1 ? 'fato pronto' : 'fatos prontos'} para revisar`
  } else if (r.status === 'done' || tone === 'partial') {
    headline = `${r.fact_count} ${r.fact_count === 1 ? 'fato adicionado' : 'fatos adicionados'}`
  } else if (r.status === 'failed') {
    headline = 'Não consegui importar'
  } else if (r.status === 'undone') {
    headline = 'Importação desfeita'
  } else {
    
    headline = 'Processando…'
  }

  
  let detail: string
  if (r.status === 'review') {
    detail = 'Revise, edite e aprove o que deve entrar no Cérebro.'
  } else if (tone === 'active') {
    if (r.activeCursor && r.activeCursor.total > 0) {
      const { done, total, unit, realTotal } = r.activeCursor
      if (unit === 'pages') {
        
        detail = realTotal && realTotal > total
          ? `Lendo página ${done} de ${realTotal} (processo as primeiras ${total})`
          : `Lendo página ${done}/${total}`
      } else {
        detail = `Destilando ${done}/${total} trechos`
      }
    } else {
      detail = `${doneCount}/${total} arquivo(s)`
    }
  } else if (r.status === 'done' || tone === 'partial') {
    const base = r.summary?.trim() || `de ${r.file_count} arquivo(s)`
    detail = tone === 'partial' ? `${base} · ${failedCount} com falha` : base
  } else if (r.status === 'failed') {
    detail = r.files.find(f => f.error)?.error || 'Verifique os arquivos e tente de novo.'
  } else {
    
    detail = 'Os fatos deste lote foram removidos do Cérebro.'
  }

  
  const files: ImportFileView[] = r.files.map(f => {
    let fileTone: 'active' | 'done' | 'error'
    let label: string

    if (f.status === 'failed') {
      fileTone = 'error'
      label = f.error?.trim() || 'não consegui ler'
    } else if (f.status === 'distilled') {
      fileTone = 'done'
      label = 'pronto'
    } else {
      fileTone = 'active'
      label = 'processando…'
    }

    return { name: f.filename, label, tone: fileTone }
  })

  return {
    headline,
    detail,
    tone,
    terminal,
    factCount: r.fact_count,
    files,
    review: r.status === 'review',
    candidates: r.candidates ?? [],
    imagens: r.imagens ?? [],
  }
}
