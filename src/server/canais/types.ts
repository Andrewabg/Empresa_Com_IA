
import type { CanalRow } from '@/data/canais'
import type { AcaoFalha } from '@/lib/canais/erroMeta'

export interface InboundMidia {
  kind: string
  media_id?: string
  mime?: string
  
  dados?: Record<string, unknown>
  
  texto_estruturado?: string
}

export type CanalEvent =
  | { kind: 'mensagem'; canalExternalId: string; contato: { externalId: string; nome: string }
      externalId: string; timestamp: string; texto: string; midia: InboundMidia | null
      
      origem: 'contato' | 'proprio'
      
      respostaA?: string
      
      perfilProprio?: string
      
      origemStory?: { storyId: string } }
  | { kind: 'status'; canalExternalId: string; externalId: string
      status: 'sent' | 'delivered' | 'read' | 'failed'
      
      erro?: { codigo: number; titulo: string; detalhe?: string }
      
      cobranca?: { billable: boolean; categoria: string } }
  | { kind: 'conexao'; canalExternalId: string; estado: 'pareado' | 'desconectado' }
  | { kind: 'qr'; canalExternalId: string; qrBase64: string }
  
  | { kind: 'comentario'; canalExternalId: string; externalId: string
      
      midiaId: string
      permalink: string | null
      
      parentId: string | null
      de: { externalId: string; nome: string | null }
      texto: string; timestamp: string
      
      proprio: boolean }

export interface EnvioResultado { ok: true; externalId: string }
export interface EnvioFalha {
  ok: false
  
  erro: string
  
  codigo?: number | null
  
  retryable?: boolean
  
  retryAfterMs?: number | null
  acao?: AcaoFalha
}



export interface HttpDeps { fetchFn?: typeof fetch; signal?: AbortSignal }


export type CanalCreds = Record<string, string>


export interface CanalCapabilities {
  
  janela24h: boolean
  
  markRead: boolean
  
  conexaoPareada: boolean
  
  typing: boolean
  
  enviaMidia: boolean
  
  enviaInterativo: boolean
}


export type Interativo =
  | { tipo: 'botoes'; corpo: string; rodape?: string; botoes: Array<{ id: string; titulo: string }> }
  | {
      tipo: 'lista'; corpo: string; rodape?: string; botao: string
      secoes: Array<{ titulo: string; linhas: Array<{ id: string; titulo: string; descricao?: string }> }>
    }


export type MidiaSaida =
  | { tipo: 'imagem'; bytes: Uint8Array; mime: string; nome?: string; legenda?: string }
  | { tipo: 'documento'; bytes: Uint8Array; mime: string; nome: string; legenda?: string }
  | { tipo: 'audio'; bytes: Uint8Array; mime: string; voz: boolean }
  | { tipo: 'video'; bytes: Uint8Array; mime: string; nome: string; legenda?: string }


export interface CanalAdapter {
  capabilities: CanalCapabilities
  parseInbound(rawBody: string): CanalEvent[]
  sendText(canalExternalId: string, paraExternalId: string, texto: string, creds: CanalCreds, deps?: HttpDeps): Promise<EnvioResultado | EnvioFalha>
  markRead(canalExternalId: string, externalId: string, creds: CanalCreds, deps?: HttpDeps): Promise<void>
  
  downloadMedia(ref: string, creds: CanalCreds, deps?: HttpDeps): Promise<{ bytes: Uint8Array; mime: string } | null>
  
  sinalizarDigitando?(canalExternalId: string, refExternalId: string, creds: CanalCreds, deps?: HttpDeps): Promise<void>
  
  uploadMedia?(canalExternalId: string, m: MidiaSaida, creds: CanalCreds, deps?: HttpDeps): Promise<{ ref: string } | EnvioFalha>
  
  sendMedia?(canalExternalId: string, paraExternalId: string, m: MidiaSaida, creds: CanalCreds, deps?: HttpDeps): Promise<EnvioResultado | EnvioFalha>
  
  sendInteractive?(canalExternalId: string, paraExternalId: string, i: Interativo, creds: CanalCreds, deps?: HttpDeps): Promise<EnvioResultado | EnvioFalha>
  
  prepararTexto?(texto: string): string[]
  
  consultarSaude?(canalExternalId: string, creds: CanalCreds, deps?: HttpDeps): Promise<SaudeNumero | null>
}


export interface SaudeNumero {
  qualidade: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  
  limite: string | null
  
  nome: string | null
  
  recebe?: boolean | null
  em: string
}

export type ProviderSlug = 'whatsapp_cloud' | 'uazapi' | 'instagram'


export type VerificacaoRequest =
  | { ok: true; canal?: CanalRow }        
  | { ok: false; status: 401 | 503 }


export interface ProviderSpec {
  slug: ProviderSlug
  adapter: CanalAdapter
  
  verificarRequest(input: { rawBody: string; headers: Record<string, string>; pathSegments: string[] }): Promise<VerificacaoRequest>
  
  verificarEvento?(ev: CanalEvent, canal: CanalRow, rawBody: string): Promise<boolean>
  
  resolverCreds(canal: CanalRow): Promise<CanalCreds>
}
