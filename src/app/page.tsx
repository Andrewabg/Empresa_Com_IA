import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { Briefing } from '@/components/cards/Briefing'
import { LiveFeed } from '@/components/cards/LiveFeed'
import { WaveLineLive } from '@/components/wave/WaveLineLive'
import { CrewRow } from '@/components/cards/CrewRow'
import { DecisionQueue } from '@/components/cards/DecisionQueue'
import { decisionQueueCount } from '@/lib/decisionQueue'
import { agentName } from '@/lib/brain-nav'
import {
  saudeDoMotor, bracosParados, bracosDoMotor, lerConclusoesDosBracos,
  CHAVE_ULTIMO_HEARTBEAT, CHAVE_CONCLUSOES_DOS_BRACOS, intervaloDoHeartbeatS,
  type SaudeDoMotor, type BracoParado,
} from '@/lib/saudeDoMotor'
import { MotorParadoBanner } from '@/components/cards/MotorParadoBanner'
import { SemCanalBanner } from '@/components/cards/SemCanalBanner'
import { listTiposPendentes, contarPendentes } from '@/data/notificacoes'
import { LintDoAcervoBanner } from '@/components/cards/LintDoAcervoBanner'
import { CHAVE_SEM_CANAL } from '@/lib/proativo/destinoDoAviso'
import { CHAVE_LINT_ULTIMO_RESUMO, avisoDoLintNoPainel, lerResumoDoLintGravado } from '@/lib/brain/lintDoAcervo'
import { INTERVALO_LINT_ACERVO_MS } from '@/lib/brain/freioDoLint'
import { BracoParadoBanner } from '@/components/cards/BracoParadoBanner'
import { DemoTrigger } from '@/components/demo/DemoTrigger'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { BriefingSkeleton, SideSkeleton } from '@/app/_skeletons/CockpitSkeleton'
import { requireOperator } from '@/server/auth/session'
import { requireMembro } from '@/server/auth/membro'
import { getBriefing } from '@/data/briefing'
import { getCompanyProfile, getSetting, getSettings } from '@/data/settings'
import { tzSegura, TZ_FALLBACK } from '@/lib/relogio'
import type { PeriodoDia } from '@/lib/periodoDia'
import { listPending } from '@/data/approvals'
import { listRecentEvents, rowToSeedEvent } from '@/data/events'
import { listCrew, type CrewMember } from '@/data/crew'
import { listarFalhasRecentes } from '@/data/tasks'
import { listAgentsSummary } from '@/data/agents'
import type { TarefaFalhaItem } from '@/lib/decisionQueue'
import { countAguardandoHumano } from '@/data/conversasExternas'
import { countRascunhosPendentes } from '@/data/mensagensExternas'
import { countCanaisDesconectados, algumModoTeste } from '@/data/canais'
import { listPrazos } from '@/data/prazos'
import { toPrazoView, type PrazoView } from '@/lib/juridico/prazosTipos'
import { alertavel } from '@/lib/juridico/prazosRadar'
import { generateBriefingNarrative } from '@/server/briefing/narrative'
import { montarLinhaAcionavel } from '@/lib/briefing/linhaAcionavel'
import type { DesfechoRecente, PendenteBriefing } from '@/lib/briefing/tipos'
import { getBranding } from '@/server/config/branding'
import { DEFAULT_BRANDING } from '@/lib/branding'
import { parseUxState } from '@/lib/uxState'
import { tituloDoObjetivo } from '@/lib/tarefas/tituloDoObjetivo'
import type { LiveEvent, MockApproval, MockBriefing } from '@/mock/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ state?: string }>
}


const SEED_LIMIT = 30


const FALHAS_JANELA_MS = 7 * 24 * 60 * 60 * 1000


function operatorDisplayName(user: Awaited<ReturnType<typeof requireOperator>>): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  const name = typeof meta?.name === 'string' ? meta.name.trim() : ''
  if (fullName) return fullName.split(/\s+/)[0]
  if (name) return name.split(/\s+/)[0]
  const email = user.email ?? ''
  const local = email.split('@')[0]
  if (local) {
    
    const first = local.split(/[.\-_]/)[0]
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'operador'
  }
  return 'operador'
}


export default async function CommandCenterPage({ searchParams }: PageProps) {
  const { state } = await searchParams
  const ux = parseUxState(state)
  const empty = ux === 'empty'
  const loading = ux === 'loading'
  const offline = ux === 'offline'
  
  
  
  
  let tz = TZ_FALLBACK
  let hojeCC = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())

  
  
  let briefing:
    | (MockBriefing & { memCount: number; pendingCount: number; spendUsd: number; periodo: PeriodoDia; pendentes: PendenteBriefing[]; desfechosRecentes: DesfechoRecente[] })
    | null = null
  let approvals: Array<Pick<MockApproval, 'id' | 'kind' | 'title' | 'agent'>> = []
  let seed: LiveEvent[] = []
  let crew: CrewMember[] = []
  let name = ''
  let atendimento: { aguardando: number; rascunhos: number } | null = null
  let canaisDesconectados = 0
  let modoTeste = false
  let prazosAlerta: PrazoView[] = []
  let branding = DEFAULT_BRANDING
  let falhas: TarefaFalhaItem[] = []
  let elenco: Array<{ id: string; nome: string }> = []
  
  
  
  let motor: SaudeDoMotor = { estado: 'aquecendo', paradoHaMinutos: null }
  
  
  let semCanalDesde: string | null = null
  
  
  
  
  let tiposDeAvisosPresos: string[] = []
  let totalDeAvisosPresos = 0
  
  
  
  
  let lintDoAcervoNoPainel: { titulo: string; corpo: string } | null = null
  
  
  
  
  
  let bracosDoMotorParados: BracoParado[] = []
  
  
  let ehDono = false

  
  if (!loading) {
    const cookieStore = await cookies()
    
    const membro = await requireMembro(cookieStore)
    const operator = membro.user
    ehDono = membro.papel === 'dono'
    
    
    
    
    
    
    
    const profileP = getCompanyProfile().catch(() => null)
    const nameP = profileP.then((p) => p?.operatorName?.trim() || operatorDisplayName(operator))
    
    
    const brandingP = getBranding()

    
    
    
    tz = await getSetting('operator_timezone').then(tzSegura).catch(() => TZ_FALLBACK)
    motor = await getSetting(CHAVE_ULTIMO_HEARTBEAT)
      .then((ultimoIso) => saudeDoMotor({
        ultimoIso,
        agoraIso: new Date().toISOString(),
        intervaloSegundos: intervaloDoHeartbeatS(process.env.HEARTBEAT_INTERVAL_SECONDS),
        uptimeSegundos: process.uptime(),
      }))
      .catch(() => ({ estado: 'aquecendo' as const, paradoHaMinutos: null }))
    
    
    
    const marcadores = await getSettings(
      ehDono
        ? [CHAVE_SEM_CANAL, CHAVE_LINT_ULTIMO_RESUMO, CHAVE_CONCLUSOES_DOS_BRACOS]
        : [CHAVE_SEM_CANAL],
    ).catch(() => new Map<string, string | null>())
    const semCanalBruto = marcadores.get(CHAVE_SEM_CANAL) ?? null
    const lintBruto = marcadores.get(CHAVE_LINT_ULTIMO_RESUMO) ?? null
    const bracosBruto = marcadores.get(CHAVE_CONCLUSOES_DOS_BRACOS) ?? null
    semCanalDesde = semCanalBruto?.trim() ? semCanalBruto : null
    if (semCanalDesde) {
      
      
      const [tipos, total] = await Promise.all([
        listTiposPendentes().catch(() => [] as string[]),
        contarPendentes().catch(() => 0),
      ])
      tiposDeAvisosPresos = tipos
      totalDeAvisosPresos = total
    }
    lintDoAcervoNoPainel = avisoDoLintNoPainel(lintBruto, Date.now())
    
    
    
    
    
    
    
    const agoraIso = new Date().toISOString()
    const intervaloDoMotorS = intervaloDoHeartbeatS(process.env.HEARTBEAT_INTERVAL_SECONDS)
    bracosDoMotorParados = bracosParados(
      [
        {
          nome: 'A conferência do seu Cérebro',
          ultimoIso: lerResumoDoLintGravado(lintBruto)?.emIso ?? null,
          cadenciaMs: INTERVALO_LINT_ACERVO_MS,
        },
        ...bracosDoMotor(lerConclusoesDosBracos(bracosBruto), intervaloDoMotorS, agoraIso),
      ],
      { estadoDoMotor: motor.estado, agoraIso, uptimeSegundos: process.uptime() },
    )
    hojeCC = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())

    
    const [briefingRes, pendingRes, eventsRes, crewRes, aguardandoRes, rascunhosRes, prazosRes, desconectadosRes, modoTesteRes, falhasRes, elencoRes] = await Promise.allSettled([
      nameP.then((name) => getBriefing(name, new Date(), tz)),
      listPending(),
      listRecentEvents(SEED_LIMIT),
      listCrew(new Date(), tz),
      countAguardandoHumano(),
      countRascunhosPendentes(),
      listPrazos(operator.id, { status: 'ativo' }),
      countCanaisDesconectados(),
      algumModoTeste(),
      
      
      listarFalhasRecentes(new Date(Date.now() - FALHAS_JANELA_MS).toISOString()),
      listAgentsSummary(),
    ])
    
    
    name = await nameP
    branding = await brandingP

    if (briefingRes.status === 'fulfilled') {
      briefing = briefingRes.value
    } else {
      console.error('[CommandCenter] getBriefing falhou:', briefingRes.reason)
    }

    if (pendingRes.status === 'fulfilled') {
      
      approvals = pendingRes.value.map((a) => ({
        id: a.id,
        
        
        kind: a.kind === 'directive' || a.kind === 'custom_tool' ? 'tool_action' : a.kind,
        title: a.title ?? '',
        agent: a.agent ?? 'jarvis',
      }))
    } else {
      console.error('[CommandCenter] listPending falhou:', pendingRes.reason)
    }


    if (eventsRes.status === 'fulfilled') {
      seed = eventsRes.value.map(rowToSeedEvent)
    } else {
      console.error('[CommandCenter] listRecentEvents falhou:', eventsRes.reason)
    }

    if (crewRes.status === 'fulfilled') {
      crew = crewRes.value
    } else {
      console.error('[CommandCenter] listCrew falhou:', crewRes.reason)
    }

    
    
    
    if (aguardandoRes.status === 'fulfilled' && rascunhosRes.status === 'fulfilled') {
      atendimento = {
        aguardando: aguardandoRes.value,
        rascunhos: rascunhosRes.value,
      }
    } else {
      if (aguardandoRes.status === 'rejected') console.error('[CommandCenter] countAguardandoHumano falhou:', aguardandoRes.reason)
      if (rascunhosRes.status === 'rejected') console.error('[CommandCenter] countRascunhosPendentes falhou:', rascunhosRes.reason)
    }

    
    
    if (desconectadosRes.status === 'fulfilled') {
      canaisDesconectados = desconectadosRes.value
    } else {
      console.error('[CommandCenter] countCanaisDesconectados falhou:', desconectadosRes.reason)
    }
    if (modoTesteRes.status === 'fulfilled') {
      modoTeste = modoTesteRes.value
    } else {
      console.error('[CommandCenter] algumModoTeste falhou:', modoTesteRes.reason)
    }

    
    
    if (elencoRes.status === 'fulfilled') {
      elenco = elencoRes.value.map((a) => ({ id: a.id, nome: a.name }))
    } else {
      console.error('[CommandCenter] listAgentsSummary falhou:', elencoRes.reason)
    }
    if (falhasRes.status === 'fulfilled') {
      falhas = falhasRes.value.map((f) => ({
        id: f.id,
        objetivo: tituloDoObjetivo(f.objective),
        agente: elenco.find((a) => a.id === f.agent_id)?.nome ?? agentName(f.agent_id),
      }))
    } else {
      console.error('[CommandCenter] listarFalhasRecentes falhou:', falhasRes.reason)
    }

    
    
    if (prazosRes.status === 'fulfilled') {
      prazosAlerta = prazosRes.value.map(toPrazoView).filter((p) => alertavel(p, hojeCC))
    } else {
      console.error('[CommandCenter] listPrazos falhou:', prazosRes.reason)
    }

  }

  
  const briefingForView = empty ? null : briefing

  
  
  
  
  
  const rosterCrew = crew.filter((m) => m.roster)
  const crewForView = empty ? rosterCrew.filter((m) => m.slug === 'jarvis') : rosterCrew

  
  const atendimentoForView = empty ? null : atendimento
  const prazosForView = empty ? [] : prazosAlerta
  
  const canaisDesconectadosForView = empty ? 0 : canaisDesconectados
  const modoTesteForView = empty ? false : modoTeste
  const falhasForView = empty ? [] : falhas
  const queueCount = empty
    ? 0
    : decisionQueueCount({
        approvals,
        falhas: falhasForView,
        atendimento: atendimentoForView,
        prazos: prazosForView,
        hoje: hojeCC,
      })

  const nomesDoElenco = Object.fromEntries(elenco.map((a) => [a.id, a.nome]))

  return (
    <>
      {}
      {offline && <OfflineBanner />}
      <div className="cc-page">
        {}
        {!loading && motor.estado === 'parado' && <MotorParadoBanner paradoHaMinutos={motor.paradoHaMinutos} />}
        {}
        {!loading && semCanalDesde && <SemCanalBanner desdeIso={semCanalDesde} agoraIso={new Date().toISOString()} tipos={tiposDeAvisosPresos} total={totalDeAvisosPresos} />}
        {}
        {!loading && lintDoAcervoNoPainel && (
          <LintDoAcervoBanner titulo={lintDoAcervoNoPainel.titulo} corpo={lintDoAcervoNoPainel.corpo} />
        )}
        {}
        {!loading && <BracoParadoBanner bracos={bracosDoMotorParados} />}
        {}
        <div className="cc-hero">
          <WaveLineLive offline={offline} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {loading ? (
                <BriefingSkeleton />
              ) : briefingForView ? (
                <Suspense
                  fallback={
                    <Briefing
                      briefing={{
                        greeting: briefingForView.greeting,
                        body: briefingForView.body,
                        date: briefingForView.date,
                        highlights: briefingForView.highlights,
                      }}
                    />
                  }
                >
                  <NarrativeBriefing
                    operatorName={name}
                    assistantName={branding.assistantName}
                    briefing={briefingForView}
                  />
                </Suspense>
              ) : (
                <BriefingPending assistantName={branding.assistantName} />
              )}
            </div>
            {!loading && queueCount > 0 && (
              <a
                href="#precisa-de-voce"
                aria-label={`${queueCount} ${queueCount === 1 ? 'item esperando' : 'itens esperando'} você — ir pra fila`}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: 'color-mix(in srgb, var(--wave-to) 14%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--wave-to) 28%, transparent)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, var(--wave-from), var(--wave-to))',
                    boxShadow: '0 0 6px var(--wave-to)',
                  }}
                />
                {queueCount} pra você
              </a>
            )}
          </div>
        </div>

        {}
        <section aria-label="Sua equipe" style={{ flex: 'none' }}>
          <p style={sectionLabel}>Sua equipe</p>
          <CrewRow seed={crewForView} empty={empty} loading={loading} offline={offline} />
        </section>

        {}
        <div className="cc-main">
          <Panel fill>
            <LiveFeed
              seed={loading ? undefined : seed}
              empty={empty}
              loading={loading}
              offline={offline}
              fill
              action={!loading && !offline ? <DemoTrigger /> : undefined}
              nomesDeAgente={nomesDoElenco}
            />
          </Panel>
          <Panel fill>
            {loading ? (
              <SideSkeleton label="Precisa de você" />
            ) : (
              <DecisionQueue
                approvals={approvals}
                falhas={falhasForView}
                elenco={elenco}
                podeDecidir={ehDono}
                atendimento={atendimentoForView}
                prazos={prazosForView}
                hoje={hojeCC}
                canaisDesconectados={canaisDesconectadosForView}
                modoTeste={modoTesteForView}
                empty={empty}
                fill
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}


function BriefingPending({ assistantName }: { assistantName: string }) {
  return (
    <section aria-label="Briefing do dia">
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 12,
        }}
      >
        Briefing do dia
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 3vw, 38px)',
          fontWeight: 600,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 20,
        }}
      >
        Bem-vindo
      </h1>
      <p
        style={{
          fontSize: 'clamp(16px, 1.4vw, 19px)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: 560,
          margin: 0,
        }}
      >
        Ainda não há um briefing — a empresa está começando. Fale com o {assistantName}
        {' '}para dar o primeiro passo, e todo dia você encontra aqui o resumo do que a
        empresa cuidou pra você.
      </p>
    </section>
  )
}


const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: 0,
  marginBottom: 12,
}



interface NarrativeBriefingProps {
  operatorName: string
  
  assistantName: string
  briefing: MockBriefing & { memCount: number; pendingCount: number; spendUsd: number; periodo: PeriodoDia; pendentes: PendenteBriefing[]; desfechosRecentes: DesfechoRecente[] }
}


async function NarrativeBriefing({ operatorName, assistantName, briefing }: NarrativeBriefingProps) {
  const retrospecto = await generateBriefingNarrative({
    operatorName,
    assistantName,
    memCount: briefing.memCount,
    desfechosRecentes: briefing.desfechosRecentes,
    dateStr: briefing.date,
    periodo: briefing.periodo,
    
    
    
    
    
    
    
    
    
  })
  
  
  const body = `${retrospecto} ${montarLinhaAcionavel(briefing.pendentes)}`.trim()
  return (
    <Briefing
      briefing={{
        greeting: briefing.greeting,
        body,
        date: briefing.date,
        highlights: briefing.highlights,
      }}
    />
  )
}




function Panel({ children, fill = false }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(18px, 2vw, 26px)',
        ...(fill
          ? { flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
          : {}),
      }}
    >
      {children}
    </div>
  )
}
