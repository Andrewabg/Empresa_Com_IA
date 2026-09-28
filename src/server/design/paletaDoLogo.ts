
import { extrairPaleta, type CorExtraida } from '@/lib/design/paletaDaLogo'
import { limparMetadadosDoPng } from '@/lib/design/pngChunks'
import { getArtifact as getArtifactImpl } from '@/data/artifacts'
import { serverDb } from '../supabase'


const LADO_AMOSTRA = 160

export interface PaletaDoLogoDeps {
  baixar?: (artifactId: string) => Promise<Buffer | null>
}

async function baixarArtifact(artifactId: string): Promise<Buffer | null> {
  const art = await getArtifactImpl(artifactId)
  if (!art?.storage_ref) return null
  const { data, error } = await serverDb().storage.from('artifacts').download(art.storage_ref)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}


export async function paletaDoLogo(
  artifactId: string, deps: PaletaDoLogoDeps = {},
): Promise<CorExtraida[]> {
  const baixar = deps.baixar ?? baixarArtifact
  let bytes: Buffer | null = null
  try {
    bytes = await baixar(artifactId)
  } catch (e) {
    console.warn('[paletaDoLogo] download falhou:', e)
    return []
  }
  if (!bytes?.length) return []

  try {
    const { createCanvas, loadImage } = await import('@napi-rs/canvas')
    
    const img = await loadImage(limparMetadadosDoPng(bytes))
    const escala = Math.min(1, LADO_AMOSTRA / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * escala))
    const h = Math.max(1, Math.round(img.height * escala))
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    
    
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    return extrairPaleta(data as unknown as Uint8ClampedArray)
  } catch (e) {
    console.warn('[paletaDoLogo] decodificação falhou:', e)
    return []
  }
}
