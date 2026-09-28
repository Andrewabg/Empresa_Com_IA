
import { getProvider as getProviderDefault } from './registry'
import type { CanalRow } from '@/data/canais'
import { interativoParaTexto } from '@/lib/canais/interativo'
import type { EnvioResultado, EnvioFalha, HttpDeps, MidiaSaida, Interativo, SaudeNumero } from './types'
import { prazoDoEnvio } from '@/lib/canais/prazoDeEnvio'

interface DispatchDeps { getProvider?: typeof getProviderDefault; http?: HttpDeps }

export async function enviarTexto(canal: CanalRow, para: string, texto: string, deps: DispatchDeps = {}): Promise<EnvioResultado | EnvioFalha> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec) return { ok: false, erro: `provider desconhecido: ${canal.provider}` }
  const creds = await spec.resolverCreds(canal)
  return spec.adapter.sendText(canal.external_id, para, texto, creds, deps.http)
}
export async function marcarLido(canal: CanalRow, externalId: string, deps: DispatchDeps = {}): Promise<void> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec || !spec.adapter.capabilities.markRead) return
  const creds = await spec.resolverCreds(canal)
  await spec.adapter.markRead(canal.external_id, externalId, creds, deps.http)
}

export async function enviarMidia(canal: CanalRow, para: string, m: MidiaSaida, deps: DispatchDeps = {}): Promise<EnvioResultado | EnvioFalha> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec) return { ok: false, erro: `provider desconhecido: ${canal.provider}`, codigo: null, retryable: false, acao: 'dead' }
  if (!spec.adapter.capabilities.enviaMidia || !spec.adapter.sendMedia) {
    return { ok: false, erro: 'nao_suportado', codigo: null, retryable: false, acao: 'dead' }
  }
  const creds = await spec.resolverCreds(canal)
  return spec.adapter.sendMedia(canal.external_id, para, m, creds, deps.http)
}


export function entregaInterativo(provider: string, deps: DispatchDeps = {}): boolean {
  const spec = (deps.getProvider ?? getProviderDefault)(provider)
  return Boolean(spec?.adapter.capabilities.enviaInterativo && spec.adapter.sendInteractive)
}


export async function enviarInterativo(
  canal: CanalRow, para: string, i: Interativo, deps: DispatchDeps = {},
): Promise<{ res: EnvioResultado | EnvioFalha; comoTexto: boolean }> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec) return { res: { ok: false, erro: `provider desconhecido: ${canal.provider}`, codigo: null, retryable: false, acao: 'dead' }, comoTexto: false }
  const creds = await spec.resolverCreds(canal)
  if (entregaInterativo(canal.provider, deps) && spec.adapter.sendInteractive) {
    return { res: await spec.adapter.sendInteractive(canal.external_id, para, i, creds, deps.http), comoTexto: false }
  }
  const texto = interativoParaTexto(i)
  return { res: await spec.adapter.sendText(canal.external_id, para, texto, creds, deps.http), comoTexto: true }
}

export interface BolhaEnviada { texto: string; res: EnvioResultado | EnvioFalha }


export async function enviarTextoEmBolhas(canal: CanalRow, para: string, texto: string, deps: DispatchDeps = {}): Promise<BolhaEnviada[]> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec) return [{ texto, res: { ok: false, erro: `provider desconhecido: ${canal.provider}`, codigo: null, retryable: false, acao: 'dead' } }]
  const creds = await spec.resolverCreds(canal)
  
  const bolhas = spec.adapter.prepararTexto ? spec.adapter.prepararTexto(texto) : [texto]
  
  
  
  
  const http: HttpDeps = { ...deps.http, signal: deps.http?.signal ?? prazoDoEnvio() }
  const out: BolhaEnviada[] = []
  for (const bolha of bolhas) {
    const res = await spec.adapter.sendText(canal.external_id, para, bolha, creds, http)
    out.push({ texto: bolha, res })
    if (!res.ok) break 
  }
  return out
}


export async function sinalizarDigitando(canal: CanalRow, refExternalId: string, deps: DispatchDeps = {}): Promise<void> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec || !spec.adapter.capabilities.typing || !spec.adapter.sinalizarDigitando) return
  try {
    const creds = await spec.resolverCreds(canal)
    await spec.adapter.sinalizarDigitando(canal.external_id, refExternalId, creds, deps.http)
  } catch {  }
}

export async function consultarSaude(canal: CanalRow, deps: DispatchDeps = {}): Promise<SaudeNumero | null> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec?.adapter.consultarSaude) return null
  try {
    const creds = await spec.resolverCreds(canal)
    return await spec.adapter.consultarSaude(canal.external_id, creds, deps.http)
  } catch { return null }
}
export async function baixarMidia(canal: CanalRow, ref: string, deps: DispatchDeps = {}): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const spec = (deps.getProvider ?? getProviderDefault)(canal.provider)
  if (!spec) return null
  const creds = await spec.resolverCreds(canal)
  return spec.adapter.downloadMedia(ref, creds, deps.http)
}
