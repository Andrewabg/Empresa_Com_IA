
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setSecret, getSecret, SECRET_KEYS } from '@/server/secrets'
import {
  inscreverAppNoInstagram, consultarInscricaoInstagram, contaExisteNoInstagram, recebeDaLeitura,
  type LeituraDaInscricao,
} from '@/server/instagram/conexao'
import {
  garantirCanalDoInstagram, idOcupadoPorOutroCanal, getCanalDoInstagram,
  registrarLeituraDaConexao,
} from '@/server/instagram/canalDoInstagram'
import { diagnosticoDaConexao, TEXTOS_CONEXAO_IG } from '@/lib/instagram/copyConexao'
import { baseUrlDaRequisicao } from '@/lib/public-url'
import type { CanalRow } from '@/data/canais'


const CHAVE_APP_SECRET_IG = 'instagram_app_secret'


async function temAppSecretNoCofre(): Promise<boolean> {
  if (await getSecret(CHAVE_APP_SECRET_IG)) return true
  return Boolean(await getSecret(SECRET_KEYS.whatsapp_app_secret))
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireDonoApi(await cookies())
    if (auth instanceof Response) return auth
    return await conectar(request)
  } catch (e) {
    
    
    console.warn('[instagram/conexao] POST falhou:', e)
    return Response.json({ error: TEXTOS_CONEXAO_IG.falhaConexao }, { status: 500 })
  }
}

async function conectar(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { token?: unknown; igUserId?: unknown; appSecret?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const igUserId = typeof body.igUserId === 'string' ? body.igUserId.trim() : ''
  const appSecret = typeof body.appSecret === 'string' ? body.appSecret.trim() : ''
  if (!token || !igUserId) {
    return Response.json({ error: TEXTOS_CONEXAO_IG.camposObrigatorios }, { status: 400 })
  }

  
  
  
  
  
  if ((await contaExisteNoInstagram({ igUserId, token })) === false) {
    return Response.json({ error: TEXTOS_CONEXAO_IG.contaNaoEncontrada }, { status: 400 })
  }

  
  
  
  if (await idOcupadoPorOutroCanal(igUserId)) {
    return Response.json({ error: TEXTOS_CONEXAO_IG.idJaEmUso }, { status: 409 })
  }

  
  
  
  
  const tokenAnterior = await getSecret(SECRET_KEYS.instagram_access_token)
  const idAnterior = await getSecret(SECRET_KEYS.instagram_ig_user_id)

  await setSecret(SECRET_KEYS.instagram_access_token, token)
  await setSecret(SECRET_KEYS.instagram_ig_user_id, igUserId)
  
  
  if (appSecret) await setSecret(CHAVE_APP_SECRET_IG, appSecret)
  
  
  let verify = await getSecret(SECRET_KEYS.instagram_verify_token)
  if (!verify) {
    verify = randomBytes(16).toString('hex')
    await setSecret(SECRET_KEYS.instagram_verify_token, verify)
  }

  
  
  let trocouDeConta: boolean
  let canalGarantido: CanalRow | null = null
  try {
    ;({ trocouDeConta, canal: canalGarantido } = await garantirCanalDoInstagram(igUserId))
  } catch (e) {
    if (tokenAnterior && idAnterior) {
      await setSecret(SECRET_KEYS.instagram_access_token, tokenAnterior)
      await setSecret(SECRET_KEYS.instagram_ig_user_id, idAnterior)
    }
    throw e
  }

  const inscricao = await inscreverAppNoInstagram({ igUserId, token })
  
  if (inscricao.detalhe) console.warn('[instagram/conexao] a Meta recusou a inscrição:', inscricao.detalhe)
  const leitura = await consultarInscricaoInstagram({ igUserId, token })
  
  
  
  await registrarLeituraDaConexao(canalGarantido, leitura, new Date().toISOString())
  const recebe = recebeDaLeitura(leitura)
  const temWhatsapp = Boolean(await getSecret(SECRET_KEYS.whatsapp_access_token))
  const temAppSecret = await temAppSecretNoCofre()
  const diag = diagnosticoDaConexao({
    temToken: true, temAppSecret, temWhatsapp, recebe,
    credencialRecusada: leitura === 'credencial_recusada', codigoDaMeta: inscricao.codigo,
  })
  const webhookUrl = `${baseUrlDaRequisicao(request)}/api/canais/instagram/webhook`

  return Response.json({
    recebe,
    temAppSecret,
    verifyToken: verify,
    webhookUrl,
    ...(trocouDeConta ? { aviso: TEXTOS_CONEXAO_IG.trocouDeConta } : {}),
    ...diag,
  })
}

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireDonoApi(await cookies())
    if (auth instanceof Response) return auth
    return await diagnosticar(request)
  } catch (e) {
    console.warn('[instagram/conexao] GET falhou:', e)
    return Response.json({ error: TEXTOS_CONEXAO_IG.falhaLeitura }, { status: 500 })
  }
}

async function diagnosticar(request: Request): Promise<Response> {
  const token = await getSecret(SECRET_KEYS.instagram_access_token)
  const igUserId = await getSecret(SECRET_KEYS.instagram_ig_user_id)
  const verify = await getSecret(SECRET_KEYS.instagram_verify_token)
  const temWhatsapp = Boolean(await getSecret(SECRET_KEYS.whatsapp_access_token))
  const temAppSecret = await temAppSecretNoCofre()

  
  
  const reinscrever = new URL(request.url).searchParams.get('reinscrever') === '1'

  let recebe: boolean | null = null
  let leitura: LeituraDaInscricao = 'nao_sei'
  let codigoDaMeta: number | null = null
  if (token && igUserId) {
    if (reinscrever) {
      const inscricao = await inscreverAppNoInstagram({ igUserId, token })
      codigoDaMeta = inscricao.codigo
      if (inscricao.detalhe) console.warn('[instagram/conexao] a Meta recusou a inscrição:', inscricao.detalhe)
    }
    leitura = await consultarInscricaoInstagram({ igUserId, token })
    recebe = recebeDaLeitura(leitura)
  }
  const diag = diagnosticoDaConexao({
    temToken: Boolean(token && igUserId), temAppSecret, temWhatsapp, recebe,
    credencialRecusada: leitura === 'credencial_recusada', codigoDaMeta,
  })
  const webhookUrl = `${baseUrlDaRequisicao(request)}/api/canais/instagram/webhook`

  
  
  
  
  let canalId: string | null = null
  let canalHabilitado = true
  try {
    const canal = await getCanalDoInstagram()
    canalId = canal?.id ?? null
    canalHabilitado = canal?.enabled ?? true
    
    
    
    await registrarLeituraDaConexao(canal, leitura, new Date().toISOString())
  } catch (e) {
    console.warn('[instagram/conexao] nao deu para ler o canal (fail-open):', e)
  }

  return Response.json({
    conectado: Boolean(token && igUserId),
    igUserId,
    canalId,
    canalHabilitado,
    recebe,
    temAppSecret,
    verifyToken: verify,
    webhookUrl,
    ...diag,
  })
}
