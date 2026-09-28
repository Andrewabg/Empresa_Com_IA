'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ConnectionActivateModal } from './ConnectionActivateModal'
import { takePrefetched } from './prefetch'
import { isIconUrl } from '@/lib/integracoes/icon'
import { guiaDoToolkit } from '@/lib/guiaDoToolkit'

interface ToolkitConnection {
  slug: string
  name: string
  connected: boolean
  status?: string
  requiredBy: string[]
  
  icon?: string
  category?: string
  
  semAuth?: boolean
}



function titleCase(slug: string): string {
  return slug.split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}


type MetaHealth = 'ok' | 'expired' | 'absent' | 'unconfigured'
const META_SLUG = 'metaads'

interface ConnectionsReport {
  configured: boolean
  healthOk: boolean
  toolkits: ToolkitConnection[]
  pendingRequired: string[]
}

export function ConnectionsSection() {
  const [report, setReport] = useState<ConnectionsReport | null>(null)
  const [metaHealth, setMetaHealth] = useState<MetaHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<{ slug: string; name: string } | null>(null)

  const mounted = useRef(true)

  const load = useCallback(() => {
    setLoading(true)
    
    
    
    const healthP: Promise<MetaHealth | null> = fetch('/api/trafego/meta-health')
      .then((r) => (r.ok ? r.json() : null))
      .then((h: { status?: MetaHealth } | null) => h?.status ?? null)
      .catch(() => null)
    ;(takePrefetched('/api/config/connections') ?? fetch('/api/config/connections'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ConnectionsReport | null) => {
        if (!mounted.current || !j) return
        setReport(j)
        
        
        if (j.toolkits.some((t) => t.slug === META_SLUG)) {
          void healthP
            .then((h) => {
              if (mounted.current) setMetaHealth(h)
            })
            .catch(() => {})
        } else {
          setMetaHealth(null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  
  
  
  
  const pollAfterConnect = useCallback((slug: string) => {
    let tries = 0
    const tick = async () => {
      if (!mounted.current) return
      const j = (await fetch('/api/config/connections')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)) as ConnectionsReport | null
      if (!mounted.current) return
      let connected = false
      if (j) {
        setReport(j)
        connected = !!j.toolkits.find((t) => t.slug === slug)?.connected
        if (j.toolkits.some((t) => t.slug === META_SLUG)) {
          const h = (await fetch('/api/trafego/meta-health?fresh=1')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)) as { status?: MetaHealth } | null
          if (mounted.current) setMetaHealth(h?.status ?? null)
          if (slug === META_SLUG) connected = h?.status === 'ok' || h?.status === 'expired'
        }
      }
      if (!connected && ++tries < 7 && mounted.current) setTimeout(tick, 1500)
    }
    void tick()
  }, [])

  useEffect(() => {
    
    
    mounted.current = true
    load()
    return () => {
      mounted.current = false
    }
  }, [load])

  const deferred = report && (!report.configured || !report.healthOk)

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Conexões
        </h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Ative as ferramentas externas que seus agentes precisam — Gmail, Meta Ads e centenas de apps. Cada uma é autorizada uma vez aqui.
        </p>
        <Link
          href="/integracoes"
          style={{ fontSize: 12.5, color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          Explorar todas em Integrações →
        </Link>
      </div>

      {loading && !report && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>Carregando conexões…</p>
      )}

      {deferred && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Configure e valide a chave do Composio acima para conectar ferramentas.
        </p>
      )}

      {report && !deferred && report.toolkits.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Nenhuma ferramenta para conectar ainda.
        </p>
      )}

      {report && !deferred && report.toolkits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {report.toolkits.map((tk) => (
            <ToolkitRow
              key={tk.slug}
              tk={tk}
              health={tk.slug === META_SLUG ? metaHealth : null}
              onActivate={() => setActive({ slug: tk.slug, name: tk.name })}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {active && (
        <ConnectionActivateModal
          slug={active.slug}
          name={active.name}
          open={!!active}
          onOpenChange={(o) => {
            if (!o) setActive(null)
          }}
          onConnected={() => {
            const s = active?.slug
            if (s) pollAfterConnect(s)
          }}
        />
      )}
    </section>
  )
}

function ToolkitRow({
  tk,
  health,
  onActivate,
  onRefresh,
}: {
  tk: ToolkitConnection
  
  health: MetaHealth | null
  onActivate: () => void
  onRefresh: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [failed, setFailed] = useState(false)

  
  
  
  
  
  const metaKnown = health != null
  const effConnected = metaKnown ? health === 'ok' || health === 'expired' : tk.connected
  const expired = metaKnown && health === 'expired'
  
  const pending = !effConnected && !tk.semAuth && tk.requiredBy.length > 0
  const guia = guiaDoToolkit(tk.slug)

  async function handleDisconnect() {
    if (disconnecting) return
    setDisconnecting(true)
    setFailed(false)
    try {
      const r = await fetch('/api/config/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: tk.slug }),
      })
      const j = (await r.json().catch(() => null)) as { ok?: boolean } | null
      if (r.ok && j?.ok) {
        setConfirming(false)
        onRefresh() 
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '11px 14px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {tk.icon && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              fontSize: 16,
              overflow: 'hidden',
            }}
          >
            {isIconUrl(tk.icon) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tk.icon} alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
            ) : (
              tk.icon
            )}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {tk.name || titleCase(tk.slug)}
            </span>
            {tk.category && (
              <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                {tk.category}
              </span>
            )}
          </span>
          {tk.requiredBy.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              necessário para {tk.requiredBy.join(', ')}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {tk.semAuth ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--approve)' }}>
            ✓ pronto para usar, não precisa conectar
          </span>
        ) : expired ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'rgb(214 158 46)' }}>
            <span aria-hidden>⚠</span> token expirado — reconectar
          </span>
        ) : effConnected ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--approve)' }}>
            ✓ conectado
          </span>
        ) : pending ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'rgb(214 158 46)' }}>
            <span aria-hidden>⚠</span> pendente
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {tk.status ? tk.status.toLowerCase() : 'não conectado'}
          </span>
        )}

        {tk.semAuth ? null : effConnected ? (
          confirming ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Desconectar?
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface)',
                  color: 'var(--reject)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  cursor: disconnecting ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {disconnecting ? 'Desconectando…' : 'Sim, desconectar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={disconnecting}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {failed && (
                <span style={{ fontSize: 12, color: 'var(--reject)' }}>falhou</span>
              )}
              <button
                type="button"
                onClick={onActivate}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Reconectar
              </button>
              <button
                type="button"
                onClick={() => {
                  setFailed(false)
                  setConfirming(true)
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Desconectar
              </button>
            </span>
          )
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            {}
            {guia && (
              <a
                href={guia}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12.5, color: 'var(--text-tertiary)', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                Como conectar
              </a>
            )}
            <button
              type="button"
              onClick={onActivate}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ativar
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
