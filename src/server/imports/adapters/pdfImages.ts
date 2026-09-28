import { createHash } from 'node:crypto'
import { createCanvas, ImageData } from '@napi-rs/canvas'
import { extractImages, getDocumentProxy } from 'unpdf'
import type { ImageInput } from '@/lib/imports/imageTriage'








































const MARCA = '￼'


export function bitmapParaPng(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
): Buffer {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    if (channels === 1) {
      const g = data[p]
      rgba[p * 4] = g
      rgba[p * 4 + 1] = g
      rgba[p * 4 + 2] = g
      rgba[p * 4 + 3] = 255
    } else if (channels === 3) {
      rgba[p * 4] = data[p * 3]
      rgba[p * 4 + 1] = data[p * 3 + 1]
      rgba[p * 4 + 2] = data[p * 3 + 2]
      rgba[p * 4 + 3] = 255
    } else {
      rgba[p * 4] = data[p * 4]
      rgba[p * 4 + 1] = data[p * 4 + 1]
      rgba[p * 4 + 2] = data[p * 4 + 2]
      rgba[p * 4 + 3] = data[p * 4 + 3]
    }
  }
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0)
  return canvas.toBuffer('image/png')
}


export interface FiguraCrua {
  
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
  channels: number
  key: string
}


export function figuraParaImageInput(fig: FiguraCrua, pagina: number): ImageInput {
  const png = bitmapParaPng(fig.data, fig.width, fig.height, fig.channels)
  const sha256 = createHash('sha256').update(png).digest('hex')
  return {
    match: `${MARCA}pdfimg:${pagina}:${fig.key}${MARCA}`,
    sha256,
    bytes: png.length,
    width: fig.width,
    height: fig.height,
    b64: png.toString('base64'),
    mime: 'image/png',
    pagina,
  }
}


export async function extractPdfImages(bytes: Uint8Array): Promise<ImageInput[]> {
  try {
    
    const doc = await getDocumentProxy(new Uint8Array(bytes))
    const out: ImageInput[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const figs = await extractImages(doc, p)
      for (const f of figs) {
        
        if (![1, 3, 4].includes(f.channels)) continue
        out.push(figuraParaImageInput(f, p))
      }
    }
    return out
  } catch (e) {
    console.warn('[extractPdfImages] fail-open:', e)
    return []
  }
}
