'use client'



import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApprovalCard, KIND_LABEL, KindGlyph, type ApprovalDecision } from '@/components/cards/ApprovalCard'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import { agentName } from '@/lib/brain-nav'
import { EmptyState } from '@/components/ui/EmptyState'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { ToolErrorCard } from '@/components/cards/ToolErrorCard'
import { parseUxState } from '@/lib/uxState'
import { useApprovalAction } from './useApprovalAction'
import { formatarOrigem, type OrigemLabels } from '@/lib/aprovacoes/origem'
import { COPY_FALHA_GENERICA } from '@/lib/aprovacoes/falhaPermanente'
import { humanizarAto } from '@/lib/aprovacoes/humanizarAto'
import { outrosNoMesmoAlvo, avisoDeMesmoAlvo } from '@/lib/aprovacoes/mesmoAlvo'
import type { Approval } from '@/data/approvals'
import type { MockApproval } from '@/mock/types'
import styles from './Aprovacoes.module.css'







function montarLaunchArgs(args: Record<string, unknown> | null): MockApproval['launchArgs'] {
  const a = (args ?? {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))
  const headline = str(a.headline)
  return {
    message: str(a.message),
    ...(headline ? { headline } : {}),
    cta: str(a.cta),
    link: str(a.link),
    artifactId: str(a.artifactId),
  }
}


function montarAvisos(args: Record<string, unknown> | null): MockApproval['avisos'] {
  const raw = (args ?? {}) as Record<string, unknown>
  const lista = Array.isArray(raw.avisos) ? raw.avisos : []
  const out = lista
    .map((a) => {
      const o = (a ?? {}) as Record<string, unknown>
      const texto = typeof o.texto === 'string' ? o.texto.trim() : ''
      const tipo = typeof o.tipo === 'string' ? o.tipo : ''
      return texto ? { tipo, texto } : null
    })
    .filter((x): x is { tipo: string; texto: string } => x !== null)
  return out.length ? out : undefined
}

function toMockApproval(a: Approval, origem?: OrigemLabels): MockApproval {
  const base = {
    id: a.id,
    kind: a.kind,
    title: a.title ?? '(sem título)',
    agent: a.agent ?? 'jarvis',
    reason: a.reason ?? '',
    createdAt: a.created_at,
    
    origem: origem ? formatarOrigem(origem) ?? undefined : undefined,
  }

  
  
  
  
  if (a.kind === 'tool_action' || a.kind === 'directive' || a.kind === 'custom_tool') {
    const { principais, detalhes } = humanizarAto(a.action_slug, a.action_args)
    
    const semCampos = principais.length === 0 && detalhes.length === 0
    const principaisFinal =
      semCampos && a.action_slug ? [{ label: 'Ação', valor: a.action_slug }] : principais
    
    const ehLancamento =
      a.kind === 'tool_action' && a.action_slug === 'AWAVE_META_LAUNCH_CREATIVE'
    const launchArgs = ehLancamento ? montarLaunchArgs(a.action_args) : undefined
    
    const avisos = ehLancamento ? montarAvisos(a.action_args) : undefined
    return {
      ...base,
      kind: 'tool_action',
      action: {
        sentence: a.title ?? a.action_slug ?? '(ação sem descrição)',
        principais: principaisFinal,
        detalhes,
      },
      ...(launchArgs ? { launchArgs } : {}),
      ...(avisos ? { avisos } : {}),
    }
  }

  
  
  if (a.kind === 'plan') {
    return {
      ...base,
      kind: 'plan',
      diff: a.diff ?? '',
    }
  }

  
  
  
  return {
    ...base,
    kind: 'brain_pr',
    diff: a.diff ?? '',
    ...(a.pr_url ? { prUrl: a.pr_url } : {}),
    ...(a.path ? { path: a.path } : {}),
  }
}



function AllClearGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.5 9.5l3.5 3.5L14.5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}



function ApprovalSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
      }}
      aria-label="Carregando aprovação"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton width={130} height={11} />
        <Skeleton width={48} height={11} />
      </div>
      <Skeleton width="64%" height={22} radius="var(--radius-sm)" style={{ marginBottom: 18 }} />
      <SkeletonText lines={3} lineHeight={13} gap={9} />
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <Skeleton width={104} height={34} radius="var(--radius-sm)" />
        <Skeleton width={104} height={34} radius="var(--radius-sm)" />
      </div>
    </div>
  )
}



interface AprovacoesBodyProps {
  initialApprovals: Approval[]
  origens: Record<string, OrigemLabels>
  
  ehDono: boolean
  
  nomesDeAgente?: Record<string, string>
}


const ORDEM_DOS_GRUPOS: MockApproval['kind'][] = ['tool_action', 'plan', 'brain_pr']


function subtituloDaFila(mock: MockApproval): string | null {
  if (mock.kind === 'brain_pr') return mock.path ?? null
  if (mock.kind === 'tool_action') {
    const primeiro = mock.action?.principais?.[0]
    return primeiro ? `${primeiro.label}: ${primeiro.valor}` : null
  }
  return null
}


function ItemDaFila({
  mock,
  ativo,
  now,
  nomesDeAgente,
  onSelecionar,
}: {
  mock: MockApproval
  ativo: boolean
  now: number
  nomesDeAgente?: Record<string, string>
  onSelecionar: () => void
}) {
  const subtitulo = subtituloDaFila(mock)
  return (
    <button
      type="button"
      onClick={onSelecionar}
      data-item-da-fila={mock.id}
      aria-current={ativo ? 'true' : undefined}
      className={ativo ? `${styles.item} ${styles.itemAtivo}` : styles.item}
    >
      <span className={styles.itemTopo}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--text-tertiary)' }}>
          <KindGlyph kind={mock.kind} />
        </span>
        <span className={styles.itemQuem}>{agentName(mock.agent, nomesDeAgente)}</span>
        <span className={styles.itemQuando}>{relativeTime(Date.parse(mock.createdAt), now)}</span>
      </span>
      <span className={styles.itemTitulo}>{mock.title}</span>
      {subtitulo && <span className={styles.itemAlvo}>{subtitulo}</span>}
    </button>
  )
}

function AprovacoesBody({ initialApprovals, origens, ehDono, nomesDeAgente }: AprovacoesBodyProps) {
  const params = useSearchParams()
  const ux = parseUxState(params.get('state'))
  const forcedEmpty = ux === 'empty'
  const loading = ux === 'loading'
  const error = ux === 'error'

  const router = useRouter()
  const { run } = useApprovalAction()

  const [items, setItems] = useState<Approval[]>(() =>
    forcedEmpty || loading ? [] : initialApprovals,
  )

  
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({})

  
  
  const [tentativas, setTentativas] = useState<Record<string, number>>({})

  
  const [filtro, setFiltro] = useState<MockApproval['kind'] | null>(null)

  
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)

  
  const [isOffline, setIsOffline] = useState(false)
  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  
  const nowRef = useRef<number>(Date.now())

  
  
  const inFlightRef = useRef<Set<string>>(new Set())

  function removeCard(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
    setCardErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setTentativas((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    inFlightRef.current.delete(id)
  }

  function setCardError(id: string, message: string) {
    setCardErrors((prev) => ({ ...prev, [id]: message }))
    inFlightRef.current.delete(id)
  }

  
  function remontarCard(id: string) {
    setTentativas((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  function clearCardError(id: string) {
    setCardErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  
  const handleResolved = useCallback(
    async (id: string, decision: ApprovalDecision, correcao?: string) => {
      if (inFlightRef.current.has(id)) return
      inFlightRef.current.add(id)

      
      clearCardError(id)

      
      
      const originalItem = items.find((a) => a.id === id)

      
      const { desfecho: outcome, mensagem } = await run(id, decision, correcao)

      if (outcome === 'needsConfig') {
        
        
        
        inFlightRef.current.delete(id)
        
        
        if (originalItem) {
          setItems((prev) => prev.find((a) => a.id === id) ? prev : [originalItem, ...prev])
        }
        router.push('/config')
        return
      }

      if (outcome === 'error') {
        
        
        
        if (originalItem) {
          setItems((prev) =>
            prev.find((a) => a.id === id) ? prev : [originalItem, ...prev],
          )
        }
        
        
        
        
        
        remontarCard(id)
        setCardError(id, mensagem ?? COPY_FALHA_GENERICA)
        return
      }

      
      setDecididas((n) => n + 1)
      removeCard(id)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    
    
    
    [items, router, run],
  )

  
  const onEditLaunch = useCallback(
    async (id: string, fields: { message: string; headline?: string; cta: string; link: string }): Promise<boolean> => {
      try {
        const res = await fetch(`/api/approvals/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
        if (!res.ok) return false
        setItems((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  action_args: {
                    ...(a.action_args ?? {}),
                    message: fields.message,
                    ...(fields.headline ? { headline: fields.headline } : {}),
                    cta: fields.cta,
                    link: fields.link,
                  },
                }
              : a,
          ),
        )
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const mockItems = useMemo(() => items.map((a) => toMockApproval(a, origens[a.id])), [items, origens])
  const isEmpty = items.length === 0

  
  const contagemPorTipo = useMemo(() => {
    const c = new Map<MockApproval['kind'], number>()
    for (const m of mockItems) c.set(m.kind, (c.get(m.kind) ?? 0) + 1)
    return c
  }, [mockItems])

  const visiveis = useMemo(
    () => (filtro ? mockItems.filter((m) => m.kind === filtro) : mockItems),
    [mockItems, filtro],
  )

  
  const selecionado = useMemo(
    () => visiveis.find((m) => m.id === selecionadoId) ?? visiveis[0] ?? null,
    [visiveis, selecionadoId],
  )

  
  const grupos = useMemo(() => {
    const porKind = new Map<MockApproval['kind'], MockApproval[]>()
    for (const m of visiveis) {
      const atual = porKind.get(m.kind)
      if (atual) atual.push(m)
      else porKind.set(m.kind, [m])
    }
    const conhecidos = ORDEM_DOS_GRUPOS.filter((k) => porKind.has(k))
    const resto = [...porKind.keys()].filter((k) => !ORDEM_DOS_GRUPOS.includes(k))
    return [...conhecidos, ...resto].map((kind) => ({ kind, itens: porKind.get(kind)! }))
  }, [visiveis])

  
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const alvo = e.target as HTMLElement | null
      const tag = alvo?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || alvo?.isContentEditable) return
      const passo = e.key === 'ArrowDown' || e.key === 'j' ? 1 : e.key === 'ArrowUp' || e.key === 'k' ? -1 : 0
      if (passo === 0 || visiveis.length === 0) return
      e.preventDefault()
      const atual = visiveis.findIndex((m) => m.id === selecionado?.id)
      const proximo = Math.min(visiveis.length - 1, Math.max(0, (atual < 0 ? 0 : atual) + passo))
      setSelecionadoId(visiveis[proximo].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visiveis, selecionado])

  
  useEffect(() => {
    if (!selecionado) return
    const linha = document.querySelector(`[data-item-da-fila="${CSS.escape(selecionado.id)}"]`)
    linha?.scrollIntoView({ block: 'nearest' })
  }, [selecionado])

  
  const [decididas, setDecididas] = useState(0)
  const totalDaSessao = decididas + items.length

  
  const avisoMesmoAlvo = selecionado
    ? avisoDeMesmoAlvo(outrosNoMesmoAlvo(mockItems, selecionado.id), selecionado.path)
    : null

  const cardSelecionado = selecionado ? (
    <div>
      {avisoMesmoAlvo && (
        <p
          style={{
            margin: 0,
            marginBottom: 10,
            padding: '9px 14px',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderLeft: '2px solid var(--wave-to)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {avisoMesmoAlvo}
        </p>
      )}
      {}
      {cardErrors[selecionado.id] && (
        <p
          role="alert"
          style={{
            margin: 0,
            marginBottom: 10,
            padding: '9px 14px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderLeft: '2px solid var(--reject)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {cardErrors[selecionado.id]}
        </p>
      )}
      <ApprovalCard
        
        
        key={`${selecionado.id}:${tentativas[selecionado.id] ?? 0}`}
        approval={selecionado}
        now={nowRef.current}
        onResolved={handleResolved}
        onEditLaunch={onEditLaunch}
        podeDecidir={ehDono}
        nomesDeAgente={nomesDeAgente}
      />
    </div>
  ) : null

  return (
    <div className={styles.pagina}>
      {}
      {isOffline && <OfflineBanner />}

      <header className={styles.cabecalho}>
        <div>
          <p className={styles.sobrancelha}>Aprovações</p>
          <h1 className={styles.titulo}>Os freios, visíveis</h1>
          {!isEmpty && (
            <p className={styles.subtitulo}>
              Você é o portão humano. Escolha um pedido na fila, veja o ato cru e decida.
            </p>
          )}
        </div>
        {!isEmpty && (
          <div className={styles.placar}>
            <span className={styles.placarNumero}>{items.length}</span>
            <span className={styles.placarRotulo}>
              esperando você
              {decididas > 0 ? ` · ${decididas} ${decididas === 1 ? 'decidida' : 'decididas'} agora` : ''}
            </span>
          </div>
        )}
      </header>

      {}
      {decididas > 0 && totalDaSessao > 0 && (
        <div className={styles.trilho} role="presentation">
          <div
            className={styles.trilhoPreenchido}
            style={{ width: `${Math.round((decididas / totalDaSessao) * 100)}%` }}
          />
        </div>
      )}

      {}
      {loading ? (
        
        <div className={styles.painel}>
          <div className={styles.fila}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <Skeleton width="100%" height={62} radius="var(--radius-md)" />
              </div>
            ))}
          </div>
          <div className={styles.detalhe}>
            <ApprovalSkeleton />
          </div>
        </div>
      ) : error ? (
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2vw, 24px)' }}>
          <ToolErrorCard
            title="Erro ao processar aprovação"
            tool="GitHub · Serviço de aprovações"
            message="A ação não foi concluída. O cérebro não foi tocado — a aprovação permanece pendente e pode ser tentada de novo."
          />
          {cardSelecionado}
        </div>
      ) : isEmpty ? (
        
        <div
          style={{
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            maxWidth: 720,
          }}
        >
          <EmptyState
            icon={<AllClearGlyph />}
            headline="Tudo em dia"
            sub="Nada precisa de você agora. O Nathan avisa quando uma decisão sua for necessária."
          />
        </div>
      ) : (
        <>
          {}
          {contagemPorTipo.size > 1 && (
            <div className={styles.filtros}>
              <button
                type="button"
                onClick={() => setFiltro(null)}
                aria-pressed={filtro === null}
                className={filtro === null ? `${styles.chip} ${styles.chipAtivo}` : styles.chip}
              >
                Tudo
                <span className={styles.chipContagem}>{mockItems.length}</span>
              </button>
              {ORDEM_DOS_GRUPOS.filter((k) => contagemPorTipo.has(k)).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setFiltro(filtro === kind ? null : kind)}
                  aria-pressed={filtro === kind}
                  className={filtro === kind ? `${styles.chip} ${styles.chipAtivo}` : styles.chip}
                >
                  {KIND_LABEL[kind]}
                  <span className={styles.chipContagem}>{contagemPorTipo.get(kind)}</span>
                </button>
              ))}
            </div>
          )}

          <div className={styles.painel}>
            <nav className={styles.fila} aria-label="Fila de aprovações">
              {grupos.map((g) => (
                <div key={g.kind} className={styles.grupo}>
                  <p className={styles.grupoTitulo}>
                    {KIND_LABEL[g.kind]}
                    <span className={styles.grupoContagem}>{g.itens.length}</span>
                  </p>
                  {g.itens.map((mock) => (
                    <ItemDaFila
                      key={mock.id}
                      mock={mock}
                      ativo={mock.id === selecionado?.id}
                      now={nowRef.current}
                      nomesDeAgente={nomesDeAgente}
                      onSelecionar={() => setSelecionadoId(mock.id)}
                    />
                  ))}
                </div>
              ))}
              <p className={styles.dica}>
                <span className={styles.tecla}>J</span>
                <span className={styles.tecla}>K</span>
                para andar pela fila
              </p>
            </nav>

            <div className={styles.detalhe}>{cardSelecionado}</div>
          </div>
        </>
      )}
    </div>
  )
}



interface AprovacoesClientProps {
  initialApprovals: Approval[]
  origens: Record<string, OrigemLabels>
  
  ehDono: boolean
  
  nomesDeAgente?: Record<string, string>
}

export function AprovacoesClient({ initialApprovals, origens, ehDono, nomesDeAgente }: AprovacoesClientProps) {
  return (
    <Suspense fallback={null}>
      <AprovacoesBody initialApprovals={initialApprovals} origens={origens} ehDono={ehDono} nomesDeAgente={nomesDeAgente} />
    </Suspense>
  )
}
