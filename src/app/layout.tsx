import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans, Newsreader } from 'next/font/google'
import './globals.css'


import '../../custom/estilos.css'
import { AppFrame } from '@/components/frame/AppFrame'
import { alertaDoModelo } from '@/server/modelo/alerta'
import type { AlertaDoModelo } from '@/lib/modelo/falhaDoModelo'
import { EngineBlockScreen } from '@/components/license/EngineBlockScreen'
import { readEngineGateInputs } from '@/server/license/cache'
import { engineBlockReason } from '@/lib/license-state'
import { getStamp } from '@/server/stamp'
import { listAgentsSummary } from '@/data/agents'
import { listCanais } from '@/data/canais'
import { countPending } from '@/data/approvals'
import { activeCockpitHrefs } from '@/lib/cockpit'
import { getCustomPages } from '@/server/custom/registryPages'
import { getBranding } from '@/server/config/branding'
import { getAtalhosRail } from '@/server/config/atalhosRail'
import { DEFAULT_BRANDING } from '@/lib/branding'
import { getSetting } from '@/data/settings'
import { cookies } from 'next/headers'
import { getMembro } from '@/server/auth/membro'
import type { Papel } from '@/lib/equipe'
import {
  SCRIPT_CONEXAO_ID,
  conexaoSupabaseDoAmbiente,
  serializarConexao,
} from '@/lib/env-supabase'









export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})


const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
})


export async function generateMetadata(): Promise<Metadata> {
  let branding = DEFAULT_BRANDING
  try {
    branding = await getBranding()
  } catch (e) {
    console.warn('[generateMetadata] branding fail-open:', e)
  }
  const nome = branding.appName
  return {
    title: {
      default: `${nome} — sua empresa de IA`,
      template: `%s · ${nome}`,
    },
    description: 'Sua empresa de IA — um software que parece caro e está vivo.',
    applicationName: nome,
    
    
    ...(branding.logoUrl ? { icons: { icon: branding.logoUrl, apple: branding.logoUrl } } : {}),
  }
}

export const viewport: Viewport = {
  themeColor: '#0A0B0D',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  
  
  
  
  
  let engineBlock: 'hard' | 'stale' | null = null
  try {
    const { cache, firstActivatedAt } = await readEngineGateInputs()
    engineBlock = engineBlockReason(cache, firstActivatedAt, Date.now())
  } catch (e) {
    console.warn('[RootLayout] gate do engine fail-open:', e)
    engineBlock = null
  }
  if (engineBlock) {
    return (
      <html
        lang="pt-BR"
        className={`${inter.variable} ${dmSans.variable} ${newsreader.variable}`}
      >
        <body style={{ fontFamily: 'var(--font-ui)' }}>
          <EngineBlockScreen reason={engineBlock} />
        </body>
      </html>
    )
  }

  
  const licenseeName = getStamp()?.licensee.name ?? null

  
  
  
  
  
  
  let initialActiveCockpits: string[] | null = null
  let branding = DEFAULT_BRANDING
  let brainSyncOk: string | null = null
  let brainSyncMotivo: string | null = null
  
  
  let aprovacoesPendentes = 0
  
  
  let alertaModelo: AlertaDoModelo | null = null
  
  
  let atalhosRail: { nome: string; url: string }[] = []
  try {
    const [agents, canais, resolvedBranding, syncFlag, syncMotivo, pendentes, alerta, atalhos] = await Promise.all([
      listAgentsSummary(),
      listCanais(),
      getBranding(),
      getSetting('brain_sync_ok').catch(() => null),
      getSetting('brain_sync_motivo').catch(() => null),
      countPending().catch(() => 0),
      alertaDoModelo().catch(() => null),
      getAtalhosRail().catch(() => []),
    ])
    branding = resolvedBranding
    brainSyncOk = syncFlag
    brainSyncMotivo = syncMotivo
    aprovacoesPendentes = pendentes
    alertaModelo = alerta
    atalhosRail = atalhos
    initialActiveCockpits = [...activeCockpitHrefs(agents, canais.some((c) => c.enabled))]
  } catch (e) {
    console.warn('[RootLayout] seed de cockpits ativos falhou (fail-open):', e)
  }

  
  
  
  let papel: Papel | null = null
  try {
    papel = (await getMembro(await cookies()))?.papel ?? null
  } catch (e) {
    console.warn('[RootLayout] leitura do papel falhou (fail-open):', e)
  }

  
  
  let customPages: { href: string; titulo: string }[] = []
  try {
    customPages = getCustomPages().map(({ slug, titulo }) => ({ href: '/c/' + slug, titulo }))
  } catch (e) {
    console.warn('[RootLayout] registro de telas custom inválido (fail-open):', e)
  }

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${dmSans.variable} ${newsreader.variable}`}
      style={{
        '--brand-accent-from': branding.accent.from,
        '--brand-accent-to': branding.accent.to,
      } as React.CSSProperties}
    >
      <body style={{ fontFamily: 'var(--font-ui)' }}>
        {}
        <script
          id={SCRIPT_CONEXAO_ID}
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: serializarConexao(conexaoSupabaseDoAmbiente()),
          }}
        />
        <AppFrame
          licenseeName={licenseeName}
          papel={papel}
          initialActiveCockpits={initialActiveCockpits}
          customPages={customPages}
          atalhosRail={atalhosRail}
          branding={{
            appName: branding.appName,
            logoUrl: branding.logoUrl,
            assistantName: branding.assistantName,
          }}
          brainSyncOk={brainSyncOk}
          brainSyncMotivo={brainSyncMotivo}
          aprovacoesPendentes={aprovacoesPendentes}
          alertaModelo={alertaModelo}
        >
          {children}
        </AppFrame>
      </body>
    </html>
  )
}
