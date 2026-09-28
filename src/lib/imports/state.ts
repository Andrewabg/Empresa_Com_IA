


export type FileStatusCount = {
  queued: number
  extracting: number
  distilling: number
  distilled: number
  failed: number
}

export interface ImportProgress {
  
  total: number
  
  done: number
  
  failed: number
  
  label: string
}


export function nextImportStatus(input: {
  files: FileStatusCount
  pendingCandidates: number
  awaitingReview: number
}): 'extracting' | 'distilling' | 'curating' | 'review' | 'done' | 'failed' {
  const { files, pendingCandidates, awaitingReview } = input
  const total = files.queued + files.extracting + files.distilling + files.distilled + files.failed

  
  if (total > 0 && files.failed === total) return 'failed'

  
  if (files.queued > 0 || files.extracting > 0) return 'extracting'

  
  if (files.distilling > 0) return 'distilling'

  
  if (awaitingReview > 0) return 'review'

  
  if (pendingCandidates > 0) return 'curating'

  return 'done'
}


export function describeProgress(
  files: FileStatusCount,
  pendingCandidates: number,
  awaitingReview: number,
  cursor?: { done: number; total: number; unit: 'chunks' | 'pages' },
): ImportProgress {
  const total = files.queued + files.extracting + files.distilling + files.distilled + files.failed
  const done = files.distilled + files.failed

  
  
  
  const hasCursor = cursor !== undefined && cursor.total > 0

  let label: string
  if (total === 0) {
    label = 'Aguardando arquivos'
  } else if (files.queued > 0 || files.extracting > 0) {
    label = hasCursor && cursor.unit === 'pages'
      ? `Lendo página ${cursor.done}/${cursor.total}`
      : `Extraindo texto (${done}/${total})`
  } else if (files.distilling > 0) {
    label = hasCursor && cursor.unit === 'chunks'
      ? `Destilando fatos (${cursor.done}/${cursor.total})`
      : `Destilando fatos (${done}/${total})`
  } else if (awaitingReview > 0) {
    label = `${awaitingReview} ${awaitingReview === 1 ? 'fato pronto' : 'fatos prontos'} para revisar`
  } else if (pendingCandidates > 0) {
    label = `Curando ${pendingCandidates} fatos no Cérebro`
  } else {
    label = `Concluído — ${files.distilled} arquivo(s) processado(s)${files.failed > 0 ? `, ${files.failed} com falha` : ''}`
  }

  return { total, done, failed: files.failed, label }
}
