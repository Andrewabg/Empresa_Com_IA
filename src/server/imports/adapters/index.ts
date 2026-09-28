











import { adapterFor } from '@/lib/imports/dispatch'
import { extrairTextoPdfComPaginas } from '@/server/juridico/extrairPdf'
import { extractDocx } from '@/server/imports/adapters/docx'
import { extractSpreadsheet } from '@/server/imports/adapters/spreadsheet'
import { extractImageText } from '@/server/imports/adapters/image'
import { ocrScannedPdf } from '@/server/imports/adapters/pdfOcr'
import { extractPdfImages } from '@/server/imports/adapters/pdfImages'
import { triageImages, type ImageInput, type ImageRef } from '@/lib/imports/imageTriage'

export interface ExtractResult {
  text: string
  skippedReason?: 'scanned_or_empty' | 'unsupported'
  
  imageRefs?: ImageRef[]
}


export interface QuickExtractResult {
  text: string
  needsOcr?: boolean
  skippedReason?: ExtractResult['skippedReason'] 
  
  imageRefs?: ImageRef[]
}


export async function extractText(
  bytes: Uint8Array,
  mime: string | null,
  filename: string,
  deps?: { extractPdfImages?: (bytes: Uint8Array) => Promise<ImageInput[]> },
): Promise<ExtractResult> {
  const kind = adapterFor(mime, filename)

  switch (kind) {
    case 'pdf': {
      
      
      
      
      
      
      
      const text = await extrairTextoPdfComPaginas(bytes.slice())
      if (text) {
        
        
        
        
        const imgs = await (deps?.extractPdfImages ?? extractPdfImages)(bytes.slice())
        if (imgs.length) {
          const triaged = triageImages(text, imgs)
          return { text: triaged.text, imageRefs: triaged.imageRefs }
        }
        return { text }
      }
      
      
      const ocr = await ocrScannedPdf(bytes)
      return ocr ? { text: ocr } : { text: '', skippedReason: 'unsupported' }
    }

    case 'text': {
      const text = new TextDecoder('utf-8').decode(bytes)
      return { text }
    }

    case 'docx': {
      const { text, imageRefs } = await extractDocx(bytes)
      return text ? { text, imageRefs } : { text: '', skippedReason: 'unsupported' }
    }

    case 'spreadsheet': {
      const text = await extractSpreadsheet(bytes, mime, filename)
      return { text }
    }

    case 'image': {
      const text = await extractImageText(bytes, mime ?? 'image/png')
      return text ? { text } : { text: '', skippedReason: 'unsupported' }
    }

    case 'unsupported':
    default:
      return { text: '', skippedReason: 'unsupported' }
  }
}


export async function extractQuickText(
  bytes: Uint8Array,
  mime: string | null,
  filename: string,
  deps?: {
    extrairTextoPdf?: (bytes: Uint8Array) => Promise<string>
    extractPdfImages?: (bytes: Uint8Array) => Promise<ImageInput[]>
  },
): Promise<QuickExtractResult> {
  const kind = adapterFor(mime, filename)
  
  
  const extrairPdf = deps?.extrairTextoPdf ?? extrairTextoPdfComPaginas

  switch (kind) {
    case 'pdf': {
      
      const text = await extrairPdf(bytes.slice())
      if (text) {
        
        
        const imgs = await (deps?.extractPdfImages ?? extractPdfImages)(bytes.slice())
        if (imgs.length) {
          const triaged = triageImages(text, imgs)
          return { text: triaged.text, imageRefs: triaged.imageRefs }
        }
        return { text }
      }
      
      
      return { text: '', needsOcr: true }
    }

    case 'text': {
      const text = new TextDecoder('utf-8').decode(bytes)
      return { text }
    }

    case 'docx': {
      const { text, imageRefs } = await extractDocx(bytes)
      return text ? { text, imageRefs } : { text: '', skippedReason: 'unsupported' }
    }

    case 'spreadsheet': {
      const text = await extractSpreadsheet(bytes, mime, filename)
      return { text }
    }

    case 'image': {
      
      const text = await extractImageText(bytes, mime ?? 'image/png')
      return text ? { text } : { text: '', skippedReason: 'unsupported' }
    }

    case 'unsupported':
    default:
      return { text: '', skippedReason: 'unsupported' }
  }
}
