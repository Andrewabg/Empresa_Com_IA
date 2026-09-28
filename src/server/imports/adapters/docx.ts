import mammoth from 'mammoth'
import { stripEmbeddedImages } from '@/server/imports/images'
import type { ImageRef } from '@/lib/imports/imageTriage'




type MammothMd = {
  convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>
}
const mammothMd = mammoth as unknown as MammothMd


export interface DocxExtractResult {
  text: string
  imageRefs: ImageRef[]
}


export async function extractDocx(bytes: Uint8Array): Promise<DocxExtractResult> {
  const buffer = Buffer.from(bytes)

  try {
    const { value } = await mammothMd.convertToMarkdown({ buffer })
    const md = (value ?? '').trim()
    if (md) {
      const s = stripEmbeddedImages(md)
      return { text: s.text, imageRefs: s.imageRefs }
    }
  } catch (e) {
    console.warn('[extractDocx] convertToMarkdown falhou; caindo no extractRawText:', e)
  }

  
  const { value } = await mammoth.extractRawText({ buffer })
  return { text: (value ?? '').trim(), imageRefs: [] }
}
