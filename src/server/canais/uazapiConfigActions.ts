



import { randomBytes } from 'node:crypto'
import { uazapiLifecycle } from './providers/uazapi'
import { normalizarTelefone } from '@/lib/canais/telefone'
import {
  setSecret as setSecretDefault,
  getSecret as getSecretDefault,
  deleteSecret as deleteSecretDefault,
  UAZAPI_ADMIN_TOKEN,
  uazapiTokenKey,
  uazapiWebhookSecretKey,
} from '@/server/secrets'
import {
  legendaDoErroDeConexao, legendaDoErroDoCanal, LEGENDA_NOME_EM_USO,
  ACAO_RECONECTAR, ACAO_STATUS, ACAO_DESCONECTAR, ACAO_REMOVER, ACAO_MODO_TESTE,
} from '@/lib/canais/erroDeConexao'
import {
  createCanal as createCanalDefault,
  getCanal as getCanalDefault,
  getCanalByExternalId as getCanalByExternalIdDefault,
  updateCanal as updateCanalDefault,
  updateCanalConfig as updateCanalConfigDefault,
  updateConexao as updateConexaoDefault,
  deleteCanal as deleteCanalDefault,
  type CanalModo,
  type CanalRow,
} from '@/data/canais'




export interface UazapiActionDeps {
  fetchFn?: typeof fetch
  setSecret?: typeof setSecretDefault
  getSecret?: typeof getSecretDefault
  createCanal?: typeof createCanalDefault
  getCanal?: typeof getCanalDefault
  getCanalByExternalId?: typeof getCanalByExternalIdDefault
  updateCanal?: typeof updateCanalDefault
  updateCanalConfig?: typeof updateCanalConfigDefault
  updateConexao?: typeof updateConexaoDefault
  deleteCanal?: typeof deleteCanalDefault
  deleteSecret?: typeof deleteSecretDefault
  lifecycle?: typeof uazapiLifecycle
  randomSecret?: () => string
}

function resolverDeps(deps: UazapiActionDeps = {}) {
  return {
    fetchFn: deps.fetchFn,
    setSecret: deps.setSecret ?? setSecretDefault,
    getSecret: deps.getSecret ?? getSecretDefault,
    createCanal: deps.createCanal ?? createCanalDefault,
    getCanal: deps.getCanal ?? getCanalDefault,
    getCanalByExternalId: deps.getCanalByExternalId ?? getCanalByExternalIdDefault,
    updateCanal: deps.updateCanal ?? updateCanalDefault,
    updateCanalConfig: deps.updateCanalConfig ?? updateCanalConfigDefault,
    updateConexao: deps.updateConexao ?? updateConexaoDefault,
    deleteCanal: deps.deleteCanal ?? deleteCanalDefault,
    deleteSecret: deps.deleteSecret ?? deleteSecretDefault,
    lifecycle: deps.lifecycle ?? uazapiLifecycle,
    randomSecret: deps.randomSecret ?? (() => randomBytes(32).toString('hex')),
  }
}



const PREFIXOS_PRIVADOS = ['localhost', '127.', '10.', '192.168.', '::1']


export function normalizarServerUrl(url: string): string {
  try {
    const p = new URL(url)
    return (p.origin + p.pathname).replace(/\/+$/, '')
  } catch {
    return url.trim().replace(/\/+$/, '')
  }
}


export function validarServerUrl(url: string): { ok: true; url: string } | { ok: false; erro: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, erro: 'URL inválida.' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, erro: 'A URL do servidor precisa usar https.' }
  }
  
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const privado =
    PREFIXOS_PRIVADOS.some((p) => host === p || host.startsWith(p)) ||
    
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  if (privado) {
    return { ok: false, erro: 'Endereço de servidor não permitido (rede local/privada).' }
  }
  return { ok: true, url: normalizarServerUrl(url) }
}


export async function conectarInstancia(
  input: {
    serverUrl: string
    adminToken: string
    agentId: string
    rotulo: string
    modo: CanalModo
    nome: string
    baseUrl: string
    
    
    modoTeste?: boolean
    numerosTeste?: string[]
  },
  deps: UazapiActionDeps = {},
): Promise<{ ok: true; canalId: string; qrBase64: string } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  const validacao = validarServerUrl(input.serverUrl)
  if (!validacao.ok) return { ok: false, erro: validacao.erro }
  const serverUrl = validacao.url

  try {
    const inst = await d.lifecycle.criarInstancia(
      { serverUrl, adminToken: input.adminToken },
      input.nome,
      { fetchFn: d.fetchFn },
    )

    
    
    const config: Record<string, unknown> = { server_url: serverUrl }
    if (input.modoTeste) {
      config.modo_teste = true
      config.numeros_teste = (input.numerosTeste ?? [])
        .map((n) => normalizarTelefone(n))
        .filter((n): n is string => n !== null)
    }

    
    
    
    
    const existente = await d.getCanalByExternalId(inst.instanceName, 'uazapi')
    
    
    
    
    
    
    
    
    
    if (existente && normalizarServerUrl(String(existente.config?.server_url ?? '')) !== serverUrl) {
      console.error('[uazapi/conectarInstancia] instanceName colide com canal de outro servidor', {
        canalId: existente.id,
      })
      return { ok: false, erro: LEGENDA_NOME_EM_USO }
    }
    let canal: CanalRow
    if (existente) {
      await d.updateCanal(existente.id, {
        rotulo: input.rotulo, agent_id: input.agentId, modo: input.modo, enabled: true,
      })
      await d.updateCanalConfig(existente.id, config)
      
      
      
      canal = {
        ...existente,
        rotulo: input.rotulo, agent_id: input.agentId, modo: input.modo, enabled: true,
        config: { ...existente.config, ...config },
      }
    } else {
      canal = await d.createCanal({
        tipo: 'whatsapp',
        provider: 'uazapi',
        external_id: inst.instanceName,
        rotulo: input.rotulo,
        agent_id: input.agentId,
        modo: input.modo,
        config,
      })
    }

    const segredo = d.randomSecret()
    await d.setSecret(uazapiTokenKey(canal.id), inst.instanceToken)
    await d.setSecret(uazapiWebhookSecretKey(canal.id), segredo)
    await d.setSecret(UAZAPI_ADMIN_TOKEN, input.adminToken) 

    const webhookUrl = `${input.baseUrl}/api/canais/uazapi/webhook/${canal.id}/${segredo}`
    await d.lifecycle.configurarWebhook(
      { serverUrl, instanceToken: inst.instanceToken },
      webhookUrl,
      { fetchFn: d.fetchFn },
    )

    const conn = await d.lifecycle.conectar(
      { serverUrl, instanceToken: inst.instanceToken },
      { fetchFn: d.fetchFn },
    )
    await d.updateConexao(canal.id, 'aguardando_qr', conn.qrcode)

    return { ok: true, canalId: canal.id, qrBase64: conn.qrcode }
  } catch (err) {
    
    
    
    console.error('[uazapi/conectarInstancia]', err)
    return { ok: false, erro: legendaDoErroDeConexao(err) }
  }
}


async function resolverCredsCanal(
  canalId: string,
  d: ReturnType<typeof resolverDeps>,
): Promise<{ serverUrl: string; instanceToken: string }> {
  const canal = await d.getCanal(canalId)
  if (!canal) throw new Error(`canal ${canalId} não encontrado`)
  return {
    serverUrl: String(canal.config.server_url ?? ''),
    instanceToken: (await d.getSecret(uazapiTokenKey(canalId))) ?? '',
  }
}


export async function statusConexao(
  canalId: string,
  deps: UazapiActionDeps = {},
): Promise<{ ok: true; estado: string; qrBase64?: string } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  try {
    const creds = await resolverCredsCanal(canalId, d)
    const s = await d.lifecycle.statusConexao(creds, { fetchFn: d.fetchFn })
    if (s.connected) {
      await d.updateConexao(canalId, 'pareado', null)
      return { ok: true, estado: 'pareado' }
    }
    if (s.qrcode) {
      await d.updateConexao(canalId, 'aguardando_qr', s.qrcode)
      return { ok: true, estado: 'aguardando_qr', qrBase64: s.qrcode }
    }
    await d.updateConexao(canalId, 'desconectado', null)
    return { ok: true, estado: 'desconectado' }
  } catch (err) {
    
    
    console.error('[uazapi/statusConexao]', err)
    return { ok: false, erro: legendaDoErroDeConexao(err, ACAO_STATUS) }
  }
}


export async function reconectar(
  canalId: string,
  deps: UazapiActionDeps = {},
): Promise<{ ok: true; qrBase64: string } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  try {
    const creds = await resolverCredsCanal(canalId, d)
    const conn = await d.lifecycle.conectar(creds, { fetchFn: d.fetchFn })
    await d.updateConexao(canalId, 'aguardando_qr', conn.qrcode)
    return { ok: true, qrBase64: conn.qrcode }
  } catch (err) {
    
    
    console.error('[uazapi/reconectar]', err)
    return { ok: false, erro: legendaDoErroDeConexao(err, ACAO_RECONECTAR) }
  }
}


export async function desconectar(
  canalId: string,
  deps: UazapiActionDeps = {},
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  try {
    const creds = await resolverCredsCanal(canalId, d)
    await d.lifecycle.desconectar(creds, { fetchFn: d.fetchFn }) 
    await d.updateConexao(canalId, 'desconectado', null)
    return { ok: true }
  } catch (err) {
    
    
    console.error('[uazapi/desconectar]', err)
    return { ok: false, erro: legendaDoErroDeConexao(err, ACAO_DESCONECTAR) }
  }
}


export async function removerCanal(
  canalId: string,
  deps: UazapiActionDeps = {},
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  try {
    
    try {
      const creds = await resolverCredsCanal(canalId, d)
      if (creds.serverUrl && creds.instanceToken) await d.lifecycle.desconectar(creds, { fetchFn: d.fetchFn })
    } catch {  }
    await d.deleteCanal(canalId)
    
    await d.deleteSecret(uazapiTokenKey(canalId))
    await d.deleteSecret(uazapiWebhookSecretKey(canalId))
    return { ok: true }
  } catch (err) {
    console.error('[uazapi/removerCanal]', err)
    return { ok: false, erro: legendaDoErroDoCanal(err, ACAO_REMOVER) }
  }
}


export async function salvarModoTeste(
  canalId: string,
  input: { modo_teste: boolean; numeros_teste: string[] },
  deps: UazapiActionDeps = {},
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const d = resolverDeps(deps)
  try {
    const numeros_teste = input.numeros_teste
      .map((n) => normalizarTelefone(n))
      .filter((n): n is string => n !== null)
    await d.updateCanalConfig(canalId, { modo_teste: input.modo_teste, numeros_teste })
    return { ok: true }
  } catch (err) {
    console.error('[uazapi/salvarModoTeste]', err)
    return { ok: false, erro: legendaDoErroDoCanal(err, ACAO_MODO_TESTE) }
  }
}
