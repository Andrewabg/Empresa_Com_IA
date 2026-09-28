
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { listAgentsSummary, type AgentSummary } from '@/data/agents'
import { getCanalDoInstagram } from '@/server/instagram/canalDoInstagram'
import { listAutomacoes, type IgAutomacaoRow } from '@/data/igAutomacoes'
import { algumAgenteHabilitadoTem, agenteComFlag } from '@/lib/cockpit'
import { instagramSpec } from '@/server/canais/registry'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { diagnosticoDaConexao, TEXTOS_CONEXAO_IG } from '@/lib/instagram/copyConexao'
import { lerConexaoArmazenada } from '@/lib/instagram/saudeDoToken'
import type { CanalRow } from '@/data/canais'
import { intervaloDoHeartbeatS } from '@/lib/saudeDoMotor'
import { TEXTOS_EDITOR_IG } from '@/lib/instagram/copyEditor'
import { InstagramClient } from './InstagramClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Instagram',
  description: TEXTOS_EDITOR_IG.descricaoDaPagina,
}


const CARGO_GENERICO = TEXTOS_EDITOR_IG.cargoGenerico

export default async function InstagramPage() {
  const cookieStore = await cookies()
  const membro = await requireMembro(cookieStore)

  const [agents, canal] = await Promise.all([
    listAgentsSummary().catch((e: unknown) => {
      console.warn('[/instagram] listAgentsSummary falhou (fail-open):', e)
      return [] as AgentSummary[]
    }),
    getCanalDoInstagram().catch((e: unknown) => {
      console.warn('[/instagram] getCanalDoInstagram falhou (fail-open):', e)
      return null as CanalRow | null
    }),
  ])

  const [automacoes, diagnostico] = await Promise.all([
    canal
      ? listAutomacoes(canal.id).catch((e: unknown) => {
          console.warn('[/instagram] listAutomacoes falhou (fail-open):', e)
          return [] as IgAutomacaoRow[]
        })
      : Promise.resolve([] as IgAutomacaoRow[]),
    lerDiagnosticoConexao(canal),
  ])

  const agentInstalled = algumAgenteHabilitadoTem(agents, ['painelInstagram'])
  
  
  
  const agenteDoPainel = agenteComFlag(agents, ['painelInstagram'])
  const cargoNome = agenteDoPainel?.name ?? CARGO_GENERICO

  return (
    <InstagramClient
      ehDono={membro.papel === 'dono'}
      agentInstalled={agentInstalled}
      cargoNome={cargoNome}
      agenteId={agenteDoPainel?.id ?? null}
      canalConectado={!!canal}
      canalHabilitado={canal?.enabled ?? false}
      diagnostico={diagnostico}
      initialAutomacoes={automacoes}
      intervaloHeartbeatS={intervaloDoHeartbeatS(process.env.HEARTBEAT_INTERVAL_SECONDS)}
    />
  )
}


async function lerDiagnosticoConexao(canal: CanalRow | null): Promise<{ titulo: string; passo: string }> {
  if (!canal) {
    return diagnosticoDaConexao({ temToken: false, temAppSecret: false, temWhatsapp: false, recebe: null })
  }
  try {
    const [creds, appSecretIg, appSecretWa, whatsappTok] = await Promise.all([
      instagramSpec.resolverCreds(canal),
      getSecret('instagram_app_secret'),
      getSecret(SECRET_KEYS.whatsapp_app_secret),
      getSecret(SECRET_KEYS.whatsapp_access_token),
    ])
    const temToken = Boolean(creds.accessToken && creds.igUserId)
    const temAppSecret = Boolean(appSecretIg || appSecretWa)
    const temWhatsapp = Boolean(whatsappTok)
    const { recebe, credencialRecusada } = temToken
      ? lerConexaoArmazenada(canal.config, new Date().toISOString())
      : { recebe: null, credencialRecusada: false }
    
    
    
    return diagnosticoDaConexao({ temToken, temAppSecret, temWhatsapp, recebe, credencialRecusada })
  } catch (e) {
    console.warn('[/instagram] diagnóstico da conexão falhou (fail-open):', e)
    return { titulo: TEXTOS_CONEXAO_IG.parcial, passo: TEXTOS_CONEXAO_IG.indefinido }
  }
}
