






export const IMG_DECORATIVA_MAX_BYTES = 3072


export const IMG_REPETIDA_MIN = 2


export const IMG_BANNER_RATIO = 4






export interface ImageInput {
  
  match: string
  
  sha256: string
  
  bytes: number
  
  width: number | null
  
  height: number | null
  
  b64?: string
  
  mime?: string
  
  pagina?: number
}


export interface ImageRef {
  
  n: number
  sha256: string
  bytes: number
  width: number | null
  height: number | null
  
  b64?: string
  
  mime?: string
  
  storage_path?: string
  
  origin_heading?: string | null
  
  pagina?: number
  
  status?: 'pending' | 'queued' | 'reading' | 'read' | 'failed' | 'discarded'
  
  claimed_at?: string | null
}


export interface TriageResult {
  
  text: string
  
  imageRefs: ImageRef[]
}






export function triageImages(markdown: string, images: ImageInput[]): TriageResult {
  if (images.length === 0) return { text: markdown, imageRefs: [] }

  
  const shaCount = new Map<string, number>()
  for (const img of images) {
    shaCount.set(img.sha256, (shaCount.get(img.sha256) ?? 0) + 1)
  }

  let text = markdown
  const imageRefs: ImageRef[] = []
  let counter = 0

  for (const img of images) {
    const isDecorativa =
      img.bytes < IMG_DECORATIVA_MAX_BYTES ||
      (shaCount.get(img.sha256) ?? 0) >= IMG_REPETIDA_MIN ||
      (img.width != null &&
        img.height != null &&
        img.height > 0 &&
        img.width / img.height > IMG_BANNER_RATIO)

    if (isDecorativa) {
      
      
      
      
      text = text.replace(img.match, '')
    } else {
      counter++
      imageRefs.push({
        n: counter,
        sha256: img.sha256,
        bytes: img.bytes,
        width: img.width,
        height: img.height,
        ...(img.b64 !== undefined ? { b64: img.b64 } : {}),
        ...(img.mime !== undefined ? { mime: img.mime } : {}),
        ...(img.pagina !== undefined ? { pagina: img.pagina } : {}),
      })
      text = text.replace(img.match, `[imagem ${counter}]`)
    }
  }

  
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return { text, imageRefs }
}
