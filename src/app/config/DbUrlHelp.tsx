'use client'



import { useEffect, useRef, useState } from 'react'
import { supabaseRefFromUrl, poolerHintTemplate } from '@/lib/db-url-hint'
import { conexaoDoBrowser } from '@/lib/supabase-browser'

const AMBER = 'rgb(214 158 46)'
const MUTED = 'var(--text-tertiary)'

const LEAD: Record<'blocker' | 'info', string> = {
  blocker: 'Configure a conexão do banco pra atualizar com 1 clique — senão o app novo sobe contra o schema antigo.',
  info: 'As atualizações do banco estão em modo manual. Pra ligar o automático, configure a conexão do banco:',
}

export function DbUrlHelp({ variant }: { variant: 'blocker' | 'info' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const template = poolerHintTemplate(supabaseRefFromUrl(conexaoDoBrowser().url))

  
  
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )

  const copy = () => {
    navigator.clipboard?.writeText(template).then(
      () => {
        setCopied(true)
        if (copiedTimer.current) clearTimeout(copiedTimer.current)
        copiedTimer.current = setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p
        role="status"
        style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: AMBER }}
      >
        <span aria-hidden style={{ width: 7, height: 7, marginTop: 5, borderRadius: 99, background: AMBER, flexShrink: 0 }} />
        <span>{LEAD[variant]}</span>
      </p>

      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 15 }}>
          <ol style={{ margin: 0, paddingLeft: 20, listStyleType: 'decimal', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            <li>No Supabase: <strong>Settings → Database → Connection string</strong>.</li>
            <li>Aba <strong>Session pooler</strong> (porta <strong>5432</strong>) — NÃO a <strong>Direct connection</strong> (<code>db.…</code>, não funciona no EasyPanel) nem o Transaction pooler (6543).</li>
            <li>Deve ficar assim:</li>
          </ol>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 18 }}>
            <code style={{ flex: 1, minWidth: 220, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-primary)', background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', wordBreak: 'break-all' }}>
              {template}
            </code>
            <button
              type="button"
              onClick={copy}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface)', color: MUTED, fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {copied ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
          <p style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            Cole em <code>SUPABASE_DB_URL</code> nas variáveis do EasyPanel e faça o redeploy.
          </p>
          <p style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: MUTED }}>
            Se colar a porta 6543 por engano, a gente corrige pro 5432 sozinho no boot.
          </p>
          <p style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: MUTED }}>
            Prefere atualizar na mão? Siga o §7 do <code>DEPLOY.md</code>.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ alignSelf: 'flex-start', marginLeft: 15, padding: 0, border: 'none', background: 'none', color: MUTED, fontSize: 12.5, fontFamily: 'var(--font-ui)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Como configurar ↓
        </button>
      )}
    </div>
  )
}
