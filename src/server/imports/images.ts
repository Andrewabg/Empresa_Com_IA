

import { createHash } from 'node:crypto'
import {
  triageImages,
  type ImageInput,
  type TriageResult,
} from '@/lib/imports/imageTriage'






const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]


export function imageDimensions(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24) return null

  
  const isPng = PNG_SIG.every((b, i) => buf[i] === b)
  if (isPng) {
    
    const width = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19]
    const height = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23]
    return { width: width >>> 0, height: height >>> 0 }
  }

  
  
  
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 1) {
      if (buf[i] !== 0xff) break
      const marker = buf[i + 1]
      i += 2

      
      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)

      if (i + 1 >= buf.length) break
      
      const segLen = (buf[i] << 8) | buf[i + 1]

      if (isSOF) {
        
        if (i + 8 > buf.length) break
        const height = (buf[i + 3] << 8) | buf[i + 4]
        const width = (buf[i + 5] << 8) | buf[i + 6]
        return { width, height }
      }

      
      i += segLen
    }
  }

  return null
}






const DATA_URI_RE =
  /!\[[^\]]*\]\((data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+))\)/g


const MIME_RE = /^(?:data:)?(image\/[a-zA-Z0-9.+-]+)/


export function stripEmbeddedImages(markdown: string): TriageResult {
  const matches = [...markdown.matchAll(DATA_URI_RE)]
  if (matches.length === 0) return { text: markdown, imageRefs: [] }

  const images: ImageInput[] = matches.map((m) => {
    const fullMatch = m[0]
    
    const dataUri = m[1]
    const b64 = m[2]
    const buf = Buffer.from(b64, 'base64')
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const dims = imageDimensions(new Uint8Array(buf))
    
    const mimeMatch = MIME_RE.exec(dataUri)
    const mime = mimeMatch?.[1]
    return {
      match: fullMatch,
      sha256,
      bytes: buf.length,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      b64,
      ...(mime !== undefined ? { mime } : {}),
    }
  })

  return triageImages(markdown, images)
}
