












import type { CanalRow } from '@/data/canais'
import type { CanalMidiaRow } from '@/data/canalMidia'
import { validarMidiaSaida, tipoSaidaDoMime, type TipoSaida } from '@/lib/canais/midiaSaida'
import type { EnvioResultado, EnvioFalha, MidiaSaida } from './types'


const KIND: Record<TipoSaida, 'image' | 'document' | 'audio' | 'video'> = {
  imagem: 'image', documento: 'document', audio: 'audio', video: 'video',
}


export function kindDoArquivo(mime: string): 'image' | 'document' | 'audio' | 'video' {
  return KIND[tipoSaidaDoMime(mime)]
}

export type MotivoPreparo = 'sumiu' | 'invalido'
export type MotivoEntrega = MotivoPreparo | 'nao_suportado' | 'envio_falhou'

export type PreparoArquivo =
  | { ok: true; midia: MidiaSaida; kind: 'image' | 'document' | 'audio' | 'video'; mime: string }
  | { ok: false; motivo: MotivoPreparo; legenda: string }

export type EntregaArquivo =
  | { ok: true; externalId: string; kind: 'image' | 'document' | 'audio' | 'video'; mime: string }
  | { ok: false; motivo: MotivoEntrega; legenda: string }

export type BaixarFn = (bucket: string, path: string) => Promise<{ bytes: Uint8Array; mime: string } | null>
export type EnviarMidiaFn = (canal: CanalRow, para: string, m: MidiaSaida) => Promise<EnvioResultado | EnvioFalha>

export interface EntregaDeps { baixar: BaixarFn; enviarMidia: EnviarMidiaFn }


export function legendaChegaAoCliente(mime: string): boolean {
  return tipoSaidaDoMime(mime) !== 'audio'
}


export function textoDaLinhaSemLegenda(rotulo: string): string {
  const nome = (rotulo ?? '').trim()
  const motivo = 'Este tipo de arquivo não leva legenda, então nenhum texto foi junto.'
  return nome ? `Arquivo "${nome}". ${motivo}` : motivo
}


function envelope(row: CanalMidiaRow, bytes: Uint8Array, mime: string, legenda: string): MidiaSaida {
  const tipo = tipoSaidaDoMime(mime, bytes.length)
  const nome = row.storage_path.split('/').pop() || row.rotulo || 'arquivo'
  if (tipo === 'imagem') return { tipo, bytes, mime, nome, ...(legenda ? { legenda } : {}) }
  
  
  if (!legendaChegaAoCliente(mime)) return { tipo: 'audio', bytes, mime, voz: false }
  if (tipo === 'video') return { tipo, bytes, mime, nome, ...(legenda ? { legenda } : {}) }
  return { tipo: 'documento', bytes, mime, nome, ...(legenda ? { legenda } : {}) }
}


export async function prepararArquivoCatalogo(
  row: CanalMidiaRow,
  legenda: string,
  baixar: BaixarFn,
): Promise<PreparoArquivo> {
  const bin = await baixar(row.storage_bucket, row.storage_path)
  
  
  if (!bin) return { ok: false, motivo: 'sumiu', legenda: 'O arquivo não está mais no armazenamento.' }

  
  
  const mime = bin.mime || row.mime
  const midia = envelope(row, bin.bytes, mime, legenda)
  const v = validarMidiaSaida({ tipo: midia.tipo, mime, bytes: bin.bytes.length, legenda: legenda || undefined })
  if (!v.ok) return { ok: false, motivo: 'invalido', legenda: v.legenda }
  return { ok: true, midia, kind: KIND[midia.tipo], mime }
}


export async function enviarPreparado(
  canal: CanalRow,
  para: string,
  preparo: Extract<PreparoArquivo, { ok: true }>,
  enviarMidia: EnviarMidiaFn,
): Promise<EntregaArquivo> {
  const envio = await enviarMidia(canal, para, preparo.midia)
  if (!envio.ok) {
    const naoSuporta = envio.erro === 'nao_suportado'
    return {
      ok: false,
      motivo: naoSuporta ? 'nao_suportado' : 'envio_falhou',
      legenda: naoSuporta ? 'Este canal não envia arquivo.' : envio.erro,
    }
  }
  return { ok: true, externalId: envio.externalId, kind: preparo.kind, mime: preparo.mime }
}


export async function entregarArquivoCatalogo(
  canal: CanalRow,
  para: string,
  row: CanalMidiaRow,
  legenda: string,
  deps: EntregaDeps,
): Promise<EntregaArquivo> {
  const preparo = await prepararArquivoCatalogo(row, legenda, deps.baixar)
  if (!preparo.ok) return preparo
  return enviarPreparado(canal, para, preparo, deps.enviarMidia)
}
