


import type { ImageRef } from '@/lib/imports/imageTriage'


export interface ImageQueueItem {
  
  n: number
  
  origin_heading: string | null
  
  status: 'pending' | 'queued' | 'reading' | 'read' | 'failed' | 'discarded'
}


export function imageQueueView(refs: ImageRef[] | null | undefined): ImageQueueItem[] {
  if (!refs || refs.length === 0) return []

  return refs
    .filter(r => !!r.storage_path)
    .map(r => ({
      n: r.n,
      origin_heading: r.origin_heading ?? null,
      status: r.status ?? 'pending',
    }))
    .sort((a, b) => a.n - b.n)
}
