'use client'



import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { takePrefetched } from './prefetch'
import { DbUrlHelp } from './DbUrlHelp'
import { DeployWebhookHelp } from './DeployWebhookHelp'
import { UpdateRepoPicker } from './UpdateRepoPicker'
import { avisoDeOutroProjeto } from '@/lib/outroProjeto'
import { ROTULO_GATILHO, AVISO_DEPLOY_AUTOMATICO } from '@/lib/avisoDeployAutomatico'

type UpdatePhase = 'baixando' | 'extraindo' | 'publicando' | 'aguardando_rebuild' | 'erro'

interface UpdateState {
  phase: UpdatePhase
  target: string
  error?: string
  at: string
}


type DeployTriggerResult = { kind: 'fired' | 'failed' | 'absent'; detail?: string; at: string }

interface UpdateStatus {
  current: string | null
  latest: string | null
  updateAvailable: boolean
  repoConfigured: boolean
  migrationsAuto: boolean
  latestUnrecognized?: boolean
  state: UpdateState | null
  
  hasWebhook?: boolean
  deployWebhookHint?: string | null
  
  github_repo?: string | null
  
  
  update_repo?: string | null
  
  
  canCheckUpdates?: boolean
  licenseState?: string
  
  
  deployTriggerResult?: DeployTriggerResult | null
}

const OK = 'var(--approve)'
const AMBER = 'rgb(214 158 46)'
const MUTED = 'var(--text-tertiary)'
const TEAL = 'var(--wave-from)'


const LINE_LABEL_STYLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: MUTED,
}


function LinkButton({
  onClick, disabled, children,
}: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 0, border: 'none', background: 'none', color: MUTED,
        fontSize: 12.5, fontFamily: 'var(--font-ui)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
        textDecoration: 'underline', textUnderlineOffset: 3,
      }}
    >
      {children}
    </button>
  )
}


const PHASE_LABEL: Record<Exclude<UpdatePhase, 'erro'>, string> = {
  baixando: 'Baixando atualização…',
  extraindo: 'Preparando…',
  publicando: 'Publicando no seu repositório…',
  aguardando_rebuild: 'Aguardando o EasyPanel reconstruir…',
}


const DB_URL_BLOCKER_TITLE =
  'Configure SUPABASE_DB_URL no EasyPanel para atualizar com 1 clique (DEPLOY.md §2.1).'


export const tealButtonStyle = (disabled: boolean): CSSProperties => ({
  alignSelf: 'flex-start',
  padding: '8px 20px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgb(40 224 200 / 0.18)',
  background: 'rgb(40 224 200 / 0.07)',
  color: 'var(--wave-from)',
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  whiteSpace: 'nowrap',
})


function RebuildWait({
  phase, trigger, onAcionar, acionando,
}: {
  phase: UpdatePhase
  trigger: DeployTriggerResult | null
  
  onAcionar: () => void
  acionando: boolean
}) {
  const pulse = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }} role="status">
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: TEAL,
          flexShrink: 0,
          animation: 'awave-live-dot 1.4s ease-in-out infinite',
        }}
      />
      <span style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-secondary)' }}>{text}</span>
    </div>
  )

  if (phase !== 'aguardando_rebuild') return pulse(PHASE_LABEL[phase as Exclude<UpdatePhase, 'erro'>])
  if (!trigger || trigger.kind === 'fired') {
    return pulse(
      trigger?.kind === 'fired'
        ? 'Deploy acionado — aguardando o EasyPanel reconstruir…'
        : PHASE_LABEL.aguardando_rebuild,
    )
  }

  
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        border: '1px solid rgb(214 158 46 / 0.3)',
        borderRadius: 'var(--radius-md)',
        background: 'rgb(214 158 46 / 0.06)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: AMBER }}>
        {trigger.kind === 'failed' ? (
          <>
            Publiquei a atualização no seu GitHub, mas{' '}
            <strong>não consegui acionar o Gatilho de Implantação do EasyPanel</strong>
            {trigger.detail ? (
              <>
                {' '}(<code>{trigger.detail}</code>)
              </>
            ) : null}
            .
          </>
        ) : (
          <>
            Publiquei a atualização no seu GitHub, mas{' '}
            <strong>sem webhook nada reconstrói sozinho</strong>.
          </>
        )}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {trigger.kind === 'failed'
          ? 'Dá pra tentar acionar daqui mesmo. Se insistir, confira a URL do webhook ou rode o Deploy na mão no EasyPanel.'
          : 'Cole o webhook do EasyPanel no card e eu aciono daqui. Enquanto isso, rode o Deploy na mão no EasyPanel.'}
      </p>
      {trigger.kind === 'failed' && (
        <button type="button" onClick={onAcionar} disabled={acionando} style={tealButtonStyle(acionando)}>
          {acionando ? 'Acionando…' : 'Acionar o deploy'}
        </button>
      )}
    </div>
  )
}


function NotaCustom({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: MUTED }}>{children}</p>
}


function RepoLine({ repo, onTrocar }: { repo: string | null | undefined; onTrocar: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={LINE_LABEL_STYLE}>Repositório (GitHub)</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <code style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{repo ?? '—'}</code>
        <LinkButton onClick={onTrocar}>trocar</LinkButton>
      </div>
    </div>
  )
}


function DeployWebhookEditor({ blocking, onSaved }: { blocking: boolean; onSaved: () => void }) {
  const [webhook, setWebhook] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const save = useCallback(async () => {
    const wh = webhook.trim()
    if (!wh || saving) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/config/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ easypanel_deploy_webhook: wh }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!mounted.current) return
      if (!res.ok || !json?.ok) { setError(json?.error ?? 'Não foi possível salvar o webhook.'); return }
      setWebhook('')
      onSaved()
    } catch {
      if (mounted.current) setError('Não foi possível salvar o webhook.')
    } finally {
      if (mounted.current) setSaving(false)
    }
  }, [webhook, saving, onSaved])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: AMBER }}>
        {blocking ? (
          <>
            Sem webhook, atualizar publica o código no seu GitHub mas{' '}
            <strong>nada reconstrói sozinho</strong> — você teria que dar Deploy na mão no
            EasyPanel. Cole o webhook pra automatizar.
          </>
        ) : (
          <>
            Cole o <strong>Gatilho de Implantação</strong> do EasyPanel e as próximas
            atualizações reconstroem sozinhas, sem você entrar no painel.
          </>
        )}
      </p>
      <DeployWebhookHelp />
      <input
        id="deploy_webhook_input"
        name="deploy_webhook_input"
        type="password"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://…"
        autoComplete="off"
        spellCheck={false}
        aria-label="Webhook de deploy do EasyPanel"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)', padding: '11px 14px', color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none', width: '100%',
        }}
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || webhook.trim().length === 0}
        style={tealButtonStyle(saving || webhook.trim().length === 0)}
      >
        {saving ? 'Salvando…' : 'Salvar webhook'}
      </button>
      {error && (
        <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}>
          ✗ {error}
        </p>
      )}
    </div>
  )
}


function DeployLine({
  hasWebhook, hint, onChanged,
}: { hasWebhook: boolean; hint: string | null | undefined; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const remove = useCallback(async () => {
    if (removing) return
    setRemoving(true)
    try {
      const res = await fetch('/api/config/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ easypanel_deploy_webhook: '' }), 
      })
      if (!mounted.current) return
      if (res.ok) onChanged()
    } catch {
      
    } finally {
      if (mounted.current) setRemoving(false)
    }
  }, [removing, onChanged])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LINE_LABEL_STYLE}>{ROTULO_GATILHO}</span>
      {hasWebhook && !editing ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: OK, flexShrink: 0, alignSelf: 'center' }} />
          <code style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{hint ?? 'configurado ✓'}</code>
          <LinkButton onClick={() => setEditing(true)}>trocar</LinkButton>
          <LinkButton onClick={() => void remove()} disabled={removing}>
            {removing ? 'removendo…' : 'remover'}
          </LinkButton>
          {}
          <span style={{ flexBasis: '100%', fontSize: 12, lineHeight: 1.5, color: MUTED }}>
            {AVISO_DEPLOY_AUTOMATICO}
          </span>
        </div>
      ) : (
        <>
          <DeployWebhookEditor
            blocking={!hasWebhook}
            onSaved={() => { setEditing(false); onChanged() }}
          />
          {editing && hasWebhook && (
            <LinkButton onClick={() => setEditing(false)}>cancelar</LinkButton>
          )}
        </>
      )}
    </div>
  )
}

export function UpdateCard() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [acionandoDeploy, setAcionandoDeploy] = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)
  
  
  
  const [justReverted, setJustReverted] = useState(false)
  
  
  const [divergence, setDivergence] = useState<{
    status: string
    modified: string[]
    added: string[]
    removed: string[]
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  
  const [changingRepo, setChangingRepo] = useState(false)

  const mounted = useRef(true)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const polling = useRef(false)
  
  
  const revertingRef = useRef(false)
  
  
  
  const appliedTargetRef = useRef<string | null>(null)
  useEffect(() => {
    
    
    
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  
  
  const load = useCallback((usePrefetch: boolean) => {
    const req = usePrefetch
      ? (takePrefetched('/api/config/updates') ?? fetch('/api/config/updates'))
      : fetch('/api/config/updates')
    return req
      .then((r) => (r.ok ? r.json() : null))
      .then((j: UpdateStatus | null) => {
        if (mounted.current && j) setStatus(j)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const stopPolling = useCallback(() => {
    polling.current = false
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  
  
  
  const pollOnce = useCallback(async () => {
    if (!polling.current) return
    let nextPhase: UpdatePhase | null = null
    try {
      const r = await fetch('/api/config/updates')
      const j = r.ok ? ((await r.json()) as UpdateStatus) : null
      if (!mounted.current) return
      if (j) {
        setStatus(j)
        
        
        
        
        if (
          j.state === null &&
          j.current !== null &&
          j.current === appliedTargetRef.current
        ) {
          stopPolling()
          setApplying(false)
          if (revertingRef.current) setJustReverted(true)
          else setJustUpdated(true)
          return
        }
        nextPhase = j.state?.phase ?? null
        if (nextPhase === 'erro') {
          stopPolling()
          setApplying(false)
          return
        }
      }
    } catch {
      
    }
    if (!polling.current || !mounted.current) return
    
    
    const delay = nextPhase === null || nextPhase === 'aguardando_rebuild' ? 10_000 : 3_000
    pollTimer.current = setTimeout(() => void pollOnce(), delay)
  }, [stopPolling])

  const runApply = useCallback(async (target: string | null) => {
    if (applying) return
    
    appliedTargetRef.current = target
    revertingRef.current = false 
    setApplying(true)
    setApplyError(null)
    setJustUpdated(false)
    setJustReverted(false)
    
    
    polling.current = true
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = setTimeout(() => void pollOnce(), 3_000)
    try {
      const res = await fetch('/api/config/updates/apply', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as (UpdateStatus & { error?: string }) | null
      if (!mounted.current) return
      if (res.ok && json && 'updateAvailable' in json) {
        
        setStatus(json)
      } else if (res.status === 502 && json && 'state' in json) {
        
        setStatus(json)
        stopPolling()
        setApplying(false)
      } else {
        
        stopPolling()
        setApplying(false)
        setApplyError(json?.error ?? 'Não foi possível atualizar.')
      }
    } catch {
      if (!mounted.current) return
      stopPolling()
      setApplying(false)
      setApplyError('Não foi possível atualizar.')
    }
  }, [applying, pollOnce, stopPolling])

  
  
  
  
  
  const runRevert = useCallback(async () => {
    if (applying) return
    appliedTargetRef.current = status?.current ?? null 
    revertingRef.current = true 
    setApplying(true); setApplyError(null); setJustUpdated(false); setJustReverted(false)
    polling.current = true
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = setTimeout(() => void pollOnce(), 3_000)
    try {
      const res = await fetch('/api/config/updates/revert', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as (UpdateStatus & { error?: string }) | null
      if (!mounted.current) return
      if (res.ok && json && 'updateAvailable' in json) setStatus(json)
      else if (res.status === 502 && json && 'state' in json) { setStatus(json); stopPolling(); setApplying(false) }
      else { stopPolling(); setApplying(false); setApplyError(json?.error ?? 'Não foi possível reverter.') }
    } catch { if (mounted.current) { stopPolling(); setApplying(false); setApplyError('Não foi possível reverter.') } }
  }, [applying, status, pollOnce, stopPolling])

  
  
  
  const runDeploy = useCallback(async () => {
    if (acionandoDeploy || applying) return
    setAcionandoDeploy(true); setApplyError(null)
    try {
      const res = await fetch('/api/config/updates/deploy', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; detail?: string } | null
      if (!mounted.current) return
      if (res.ok && json?.ok) {
        
        polling.current = true
        if (pollTimer.current) clearTimeout(pollTimer.current)
        pollTimer.current = setTimeout(() => void pollOnce(), 3_000)
        await load(false)
      } else {
        setApplyError(json?.error ?? json?.detail ?? 'Não consegui acionar o deploy.')
      }
    } catch {
      if (mounted.current) setApplyError('Não consegui acionar o deploy.')
    } finally {
      if (mounted.current) setAcionandoDeploy(false)
    }
  }, [acionandoDeploy, applying, pollOnce, load])

  
  
  
  const previewThenApply = useCallback(
    async (target: string | null) => {
      if (applying || previewing) return
      setPreviewing(true)
      setApplyError(null)
      try {
        const r = await fetch('/api/config/updates/preview', { method: 'POST' })
        const j = r.ok ? await r.json() : null
        if (!mounted.current) return
        if (j && j.status === 'divergente') {
          setDivergence(j) 
          return
        }
        
        await runApply(target)
      } catch {
        if (mounted.current) await runApply(target) 
      } finally {
        if (mounted.current) setPreviewing(false)
      }
    },
    [applying, previewing, runApply],
  )

  
  useEffect(() => () => stopPolling(), [stopPolling])

  
  if (loading) {
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
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
          Carregando atualizações…
        </p>
      </section>
    )
  }

  
  if (!status || status.current === null) return null

  const { current, latest, updateAvailable, repoConfigured, migrationsAuto } = status
  const latestUnrecognized = status.latestUnrecognized ?? false
  
  
  
  const canCheckUpdates = status.canCheckUpdates ?? true
  const noLicenseCopy =
    status.licenseState === 'revoked' || status.licenseState === 'expired'
      ? 'Sua licença está inativa — reative para voltar a receber atualizações.'
      : status.licenseState === 'in_use_elsewhere'
        ? 'Esta licença está ativa em outra instância.'
        : 'Conecte uma licença ativa para ver e receber atualizações.'
  
  
  const hasWebhook = status.hasWebhook ?? false
  const deployWebhookHint = status.deployWebhookHint ?? null
  const phase = status.state?.phase ?? null
  
  const errMsg = phase === 'erro' ? (status.state?.error ?? 'Falha ao atualizar.') : applyError
  
  
  
  const applyInFlight =
    applying ||
    phase === 'baixando' ||
    phase === 'extraindo' ||
    phase === 'publicando' ||
    phase === 'aguardando_rebuild'
  
  
  const applyBlockedNoDbUrl = updateAvailable && repoConfigured && !migrationsAuto

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
          Atualizações
        </h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          A versão do seu Motor comparada à última publicada. Atualizar é opcional — o
          sistema segue funcionando na versão atual.
        </p>
      </div>

      {}
      {!canCheckUpdates && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '10px 14px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: 99, background: MUTED, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
              Motor {current}
            </span>
          </div>
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED, paddingLeft: 15 }}>
            {noLicenseCopy}
          </span>
        </div>
      )}

      {}
      {canCheckUpdates && !updateAvailable && (
        <>
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
            lineHeight: 1.45,
            color: latestUnrecognized ? AMBER : MUTED,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: 99,
              background: latestUnrecognized ? AMBER : OK,
              flexShrink: 0,
            }}
          />
          {latestUnrecognized ? (
            <span>
              Versão do Hub não reconhecida (<code>{latest}</code>) — contate o suporte.
            </span>
          ) : justUpdated ? (
            `Atualizado ✅ agora na ${current}`
          ) : (
            `Motor ${current} · atualizado`
          )}
        </div>
        {repoConfigured && !changingRepo && !applyInFlight && (
          <RepoLine repo={status.update_repo} onTrocar={() => setChangingRepo(true)} />
        )}
        {repoConfigured && changingRepo && (
          <UpdateRepoPicker
            brainRepo={status.github_repo ?? null}
            currentRepo={status.update_repo}
            onSaved={() => {
              setChangingRepo(false)
              void load(false)
            }}
          />
        )}
        {}
        {repoConfigured && (
          <DeployLine hasWebhook={hasWebhook} hint={deployWebhookHint} onChanged={() => void load(false)} />
        )}
        </>
      )}

      {}
      {canCheckUpdates && updateAvailable && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '14px 16px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: 99, background: TEAL, flexShrink: 0 }}
            />
            <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--wave-from)', fontWeight: 600 }}>
                {latest} disponível
              </strong>
              <span style={{ color: MUTED }}> · você está na {current}</span>
            </span>
          </div>

          {repoConfigured && !changingRepo && !applyInFlight && (
            <RepoLine repo={status.update_repo} onTrocar={() => setChangingRepo(true)} />
          )}
          {repoConfigured && changingRepo && (
            <UpdateRepoPicker
              brainRepo={status.github_repo ?? null}
              currentRepo={status.update_repo}
              onSaved={() => {
                setChangingRepo(false)
                void load(false)
              }}
            />
          )}
          {repoConfigured && (
            <DeployLine hasWebhook={hasWebhook} hint={deployWebhookHint} onChanged={() => void load(false)} />
          )}

          {}
          {justReverted && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: OK, flexShrink: 0 }} />
              <span style={{ fontSize: 13, lineHeight: 1.45, color: OK }}>
                Revertido pra {current} ✅ — a {latest} não subiu; você pode tentar de novo quando quiser.
              </span>
            </div>
          )}

          {!repoConfigured ? (
            <UpdateRepoPicker
              brainRepo={status.github_repo ?? null}
              onSaved={() => void load(false)}
            />
          ) : (applying || phase === 'aguardando_rebuild') && phase && phase !== 'erro' ? (
            
            <RebuildWait
              phase={phase}
              trigger={status.deployTriggerResult ?? null}
              onAcionar={() => void runDeploy()}
              acionando={acionandoDeploy}
            />
          ) : errMsg ? (
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <p
                role="status"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}
              >
                ✗ {errMsg}
              </p>
              {applyBlockedNoDbUrl && <DbUrlHelp variant="blocker" />}
              <button
                type="button"
                onClick={() => void runApply(latest)}
                disabled={applying || applyBlockedNoDbUrl}
                title={applyBlockedNoDbUrl ? DB_URL_BLOCKER_TITLE : undefined}
                style={tealButtonStyle(applying || applyBlockedNoDbUrl)}
              >
                Tentar de novo
              </button>
              {}
              {hasWebhook && (
                <button
                  type="button"
                  onClick={() => void runDeploy()}
                  disabled={applying || acionandoDeploy}
                  style={tealButtonStyle(applying || acionandoDeploy)}
                >
                  {acionandoDeploy ? 'Acionando…' : 'Só acionar o deploy'}
                </button>
              )}
              {}
              <button
                type="button"
                onClick={() => void runRevert()}
                disabled={applying}
                style={tealButtonStyle(applying)}
              >
                Voltar pra versão anterior
              </button>
            </div>
          ) : (
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {applyBlockedNoDbUrl && <DbUrlHelp variant="blocker" />}

              {}
              {divergence && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '12px 14px',
                    border: '1px solid rgb(214 158 46 / 0.3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgb(214 158 46 / 0.06)',
                  }}
                  role="status"
                >
                  {}
                  {(() => {
                    const aviso = avisoDeOutroProjeto(divergence, `awave-backup/pre-${latest}`)
                    return aviso ? (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: AMBER, fontWeight: 600 }}>
                        {aviso}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: AMBER }}>
                        Detectamos que estes arquivos foram modificados por você (ou por um dev).
                        Atualizar vai
                        <strong> sobrescrevê-los</strong> — salvamos um backup no branch{' '}
                        <code>awave-backup/pre-{latest}</code>.
                      </p>
                    )
                  })()}
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      maxHeight: 140,
                      overflow: 'auto',
                    }}
                  >
                    {[...divergence.modified, ...divergence.added, ...divergence.removed]
                      .slice(0, 20)
                      .map((f) => (
                        <li key={f}>
                          <code>{f}</code>
                        </li>
                      ))}
                    {divergence.modified.length +
                      divergence.added.length +
                      divergence.removed.length >
                      20 && (
                      <li>
                        … e mais{' '}
                        {divergence.modified.length +
                          divergence.added.length +
                          divergence.removed.length -
                          20}
                      </li>
                    )}
                  </ul>
                  <NotaCustom>
                    O que está em <code>custom/</code> é seu e é preservado — este aviso é só
                    sobre os arquivos do core acima.
                  </NotaCustom>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDivergence(null)
                        void runApply(latest)
                      }}
                      style={tealButtonStyle(false)}
                    >
                      Atualizar mesmo assim
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivergence(null)}
                      style={{
                        ...tealButtonStyle(false),
                        border: '1px solid var(--border-hairline)',
                        background: 'none',
                        color: MUTED,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {}
              {!divergence && (
                <>
                  <button
                    type="button"
                    onClick={() => void previewThenApply(latest)}
                    disabled={applying || previewing || applyBlockedNoDbUrl}
                    title={applyBlockedNoDbUrl ? DB_URL_BLOCKER_TITLE : undefined}
                    style={tealButtonStyle(applying || previewing || applyBlockedNoDbUrl)}
                  >
                    {previewing ? 'Verificando…' : applying ? 'Atualizando…' : hasWebhook ? 'Atualizar agora' : 'Atualizar (deploy manual)'}
                  </button>
                  <NotaCustom>
                    Suas customizações em <code>custom/</code> são preservadas nas atualizações.
                  </NotaCustom>
                  {!hasWebhook && (
                    <NotaCustom>
                      Publica no seu GitHub; depois você clica <strong>Deploy</strong> na mão no EasyPanel.
                      Cole o webhook acima pra automatizar.
                    </NotaCustom>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {}
      {canCheckUpdates && !migrationsAuto && !applyBlockedNoDbUrl && <DbUrlHelp variant="info" />}
    </section>
  )
}
