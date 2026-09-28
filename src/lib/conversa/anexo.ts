

import { sanitizeFilename } from '@/lib/imports/upload'
import { cortarTextoSeguro } from '@/lib/textoDoBanco'




export const MAX_BYTES = 10 * 1024 * 1024


export const MAX_ANEXOS = 3


export const MAX_NOME = 60



export type MotivoRecusa = 'heic' | 'tipo' | 'tamanho' | 'quantidade'


export type MediaTypeAceito = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'


export type KindAnexo = 'imagem' | 'documento'


export interface AnexoNaMensagem {
  
  id: string
  kind: KindAnexo
  
  title: string
  bytes: number
}

export interface AnexoCandidato {
  
  name: string
  
  mime: string
  
  size: number
}

export interface AnexoAceito {
  ok: true
  
  nome: string
  kind: KindAnexo
  mediaType: MediaTypeAceito
  
  ext: string
}

export interface AnexoRecusado {
  ok: false
  motivo: MotivoRecusa
  
  copy: string
}

export type ResultadoAnexo = AnexoAceito | AnexoRecusado




export const COPY_RECUSA: Record<MotivoRecusa, string> = {
  heic: 'Essa foto veio em HEIC, o formato padrão do iPhone, e o agente ainda não lê. ' +
    'Manda como JPG ou PNG que ele vê na hora.',
  tipo: 'Aqui na conversa o agente enxerga imagem (JPG, PNG ou WEBP) e PDF. ' +
    'Para ensinar um documento à empresa (Word, planilha, texto), use o Cérebro.',
  tamanho: `Arquivo pesado demais. O máximo é ${MAX_BYTES / 1024 / 1024}MB por arquivo.`,
  quantidade: `Dá para mandar até ${MAX_ANEXOS} arquivos por mensagem.`,
}




export const MAX_RESUMO_PDF = 800


export const COPY_PDF_SEM_TEXTO = 'PDF sem texto extraível (provavelmente digitalizado).'


export function resumoDePdf(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (!limpo) return COPY_PDF_SEM_TEXTO
  return cortarTextoSeguro(limpo, MAX_RESUMO_PDF)
}




export type EtapaFalhaAnexo = 'guardar' | 'registrar' | 'servidor'


export const COPY_FALHA_ANEXO: Record<EtapaFalhaAnexo, string> = {
  guardar: 'Não consegui guardar esse arquivo agora. Tente enviar outra vez em instantes.',
  registrar:
    'O arquivo subiu, mas não consegui anexá-lo à conversa. Tente enviar outra vez; se repetir, me diga o nome do arquivo.',
  servidor: 'Deu um erro nosso ao preparar esse anexo. Tente enviar outra vez em instantes.',
}



interface Formato {
  mediaType: MediaTypeAceito
  kind: KindAnexo
  ext: string
}

const PNG: Formato = { mediaType: 'image/png', kind: 'imagem', ext: 'png' }
const JPEG: Formato = { mediaType: 'image/jpeg', kind: 'imagem', ext: 'jpg' }
const WEBP: Formato = { mediaType: 'image/webp', kind: 'imagem', ext: 'webp' }
const PDF: Formato = { mediaType: 'application/pdf', kind: 'documento', ext: 'pdf' }


const POR_MIME: Record<string, Formato> = {
  'image/png': PNG,
  'image/jpeg': JPEG,
  'image/jpg': JPEG,
  'image/webp': WEBP,
  'application/pdf': PDF,
}

const POR_EXT: Record<string, Formato> = {
  png: PNG,
  jpg: JPEG,
  jpeg: JPEG,
  webp: WEBP,
  pdf: PDF,
}


const MIME_GENERICO = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

const MIME_HEIC = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

const EXT_HEIC = new Set(['heic', 'heif'])


const CONTROLES = /[\u0000-\u001f\u007f]/g




export function nomeSeguroDeAnexo(name: string): string {
  const base = sanitizeFilename(name ?? '')
  const limpo = base.replace(CONTROLES, ' ').replace(/\s+/g, ' ').trim()
  if (limpo.length === 0) return 'arquivo'
  if (limpo.length <= MAX_NOME) return limpo
  const ponto = limpo.lastIndexOf('.')
  const ext = ponto > 0 && limpo.length - ponto <= 6 ? limpo.slice(ponto) : ''
  return limpo.slice(0, MAX_NOME - ext.length).trimEnd() + ext
}



function extensaoDe(nome: string): string {
  const ponto = nome.lastIndexOf('.')
  return ponto > 0 ? nome.slice(ponto + 1).toLowerCase() : ''
}


export function kindPelaExtensao(nome: string): KindAnexo {
  return POR_EXT[extensaoDe(nome)]?.kind ?? 'documento'
}


export function mediaTypePelaExtensao(nomeOuPath: string): MediaTypeAceito | null {
  return POR_EXT[extensaoDe(nomeOuPath)]?.mediaType ?? null
}

function recusar(motivo: MotivoRecusa): AnexoRecusado {
  return { ok: false, motivo, copy: COPY_RECUSA[motivo] }
}


export function validarAnexo(
  cand: AnexoCandidato,
  opts?: { jaAnexados?: number },
): ResultadoAnexo {
  const nome = nomeSeguroDeAnexo(cand.name)
  const ext = extensaoDe(nome)
  const mime = (cand.mime ?? '').split(';')[0].trim().toLowerCase()

  
  
  if (MIME_HEIC.has(mime) || EXT_HEIC.has(ext)) return recusar('heic')

  const formato = MIME_GENERICO.has(mime) ? POR_EXT[ext] : POR_MIME[mime]
  if (!formato) return recusar('tipo')

  if (cand.size > MAX_BYTES) return recusar('tamanho')

  if ((opts?.jaAnexados ?? 0) >= MAX_ANEXOS) return recusar('quantidade')

  return { ok: true, nome, kind: formato.kind, mediaType: formato.mediaType, ext: formato.ext }
}
