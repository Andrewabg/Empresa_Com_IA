








import { getDocumentProxy, renderPageAsImage } from 'unpdf'
import { extractImageText } from './image'
import { ocrPagePlan, MAX_OCR_PAGES } from '@/lib/imports/pdf-ocr-plan'

export interface PdfOcrDeps {
  numPages?: (bytes: Uint8Array) => Promise<number>
  renderPage?: (bytes: Uint8Array, page: number) => Promise<string> 
  ocr?: (bytes: Uint8Array, mime: string) => Promise<string> 
  cap?: number
}


function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return new Uint8Array(Buffer.from(b64, 'base64'))
}



function defaultRender(b: Uint8Array, p: number): Promise<string> {
  return renderPageAsImage(b.slice(), p, {
    canvasImport: () => import('@napi-rs/canvas'),
    scale: 2,
    toDataURL: true,
  })
}


export async function pdfNumPages(
  bytes: Uint8Array,
  deps?: { numPages?: (bytes: Uint8Array) => Promise<number> },
): Promise<number> {
  
  const getN = deps?.numPages ?? (async (b: Uint8Array) => (await getDocumentProxy(b.slice())).numPages)
  try {
    return await getN(bytes)
  } catch (e) {
    console.warn('[pdfNumPages] não consegui abrir o PDF:', e)
    return 0
  }
}


export async function ocrPdfRange(
  bytes: Uint8Array,
  from: number, 
  to: number, 
  deps?: {
    renderPage?: (bytes: Uint8Array, page: number) => Promise<string>
    ocr?: (bytes: Uint8Array, mime: string) => Promise<string>
  },
): Promise<string> {
  const render = deps?.renderPage ?? defaultRender
  const ocr = deps?.ocr ?? extractImageText

  const start = Math.max(1, Math.floor(from))
  const end = Math.floor(to)
  const count = Math.max(0, end - start) 
  const parts: string[] = []
  for (let p = start; p < end; p++) {
    try {
      const dataUrl = await render(bytes, p)
      const pageBytes = dataUrlToBytes(dataUrl)
      const text = (await ocr(pageBytes, 'image/png')).trim()
      if (text) parts.push(count > 1 ? `## Página ${p}\n\n${text}` : text)
    } catch (e) {
      
      console.warn(`[ocrPdfRange] página ${p} falhou:`, e)
    }
  }
  return parts.join('\n\n')
}


export async function ocrScannedPdf(bytes: Uint8Array, deps?: PdfOcrDeps): Promise<string> {
  
  
  
  
  
  
  const cap = deps?.cap ?? MAX_OCR_PAGES

  const total = await pdfNumPages(bytes, { numPages: deps?.numPages })
  const { pages, truncated } = ocrPagePlan(total, cap)
  if (pages.length === 0) return ''

  
  const body = await ocrPdfRange(bytes, 1, pages.length + 1, {
    renderPage: deps?.renderPage,
    ocr: deps?.ocr,
  })
  if (!body) return ''
  return truncated
    ? `${body}\n\n(Documento longo — li as primeiras ${pages.length} de ${total} páginas.)`
    : body
}
