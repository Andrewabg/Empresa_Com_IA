'use client'



import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { takePrefetched } from './prefetch'
import { DEFAULT_BRANDING, NAME_MAX, type Branding } from '@/lib/branding'

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}

const BUTTON_STYLE: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const HINT_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
}

const ACCEPT = 'image/png,image/jpeg,image/webp'
const MAX_BYTES = 2 * 1024 * 1024

export function MarcaCard() {
  
  
  
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [appName, setAppName] = useState(DEFAULT_BRANDING.appName)
  const [accentFrom, setAccentFrom] = useState(DEFAULT_BRANDING.accent.from)
  const [accentTo, setAccentTo] = useState(DEFAULT_BRANDING.accent.to)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingLogo, setSendingLogo] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    ;(takePrefetched('/api/config/brand') ?? fetch('/api/config/brand'))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null) 
      .then((j: { branding?: Branding } | null) => {
        if (!alive) return
        if (j?.branding) {
          setAppName(j.branding.appName)
          setAccentFrom(j.branding.accent.from)
          setAccentTo(j.branding.accent.to)
          setLogoUrl(j.branding.logoUrl)
        } else {
          
          
          setMsg({ ok: false, text: 'Não deu para carregar a marca salva — mostrando os valores padrão.' })
        }
        setLoaded(true)
      })
    return () => { alive = false }
  }, [])

  async function salvar() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName,
          accent: { from: accentFrom, to: accentTo },
        }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setMsg({ ok: true, text: 'Salvo. Sua marca já está no menu.' })
        router.refresh()
      } else {
        setMsg({ ok: false, text: j?.error ?? 'Não foi possível salvar. Tente de novo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível salvar. Tente de novo.' })
    } finally {
      if (aliveRef.current) setSaving(false)
    }
  }

  async function enviarLogo(file: File) {
    if (file.size > MAX_BYTES) {
      setMsg({ ok: false, text: 'Arquivo grande demais (máx. 2MB).' })
      return
    }
    setSendingLogo(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/config/brand-logo', { method: 'POST', body: form })
      const j = (await res.json().catch(() => null)) as
        | { ok?: boolean; logoUrl?: string; error?: string }
        | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok && j.logoUrl) {
        setLogoUrl(j.logoUrl)
        setMsg({ ok: true, text: 'Logo enviado. Ele já aparece no menu e na aba do navegador.' })
        router.refresh()
      } else {
        setMsg({ ok: false, text: j?.error ?? 'Não foi possível enviar o logo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível enviar o logo.' })
    } finally {
      if (aliveRef.current) setSendingLogo(false)
      if (fileRef.current) fileRef.current.value = '' 
    }
  }

  async function removerLogo() {
    setSendingLogo(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/brand-logo', { method: 'DELETE' })
      if (!aliveRef.current) return
      if (res.ok) {
        setLogoUrl(null)
        setMsg({ ok: true, text: 'Logo removido. Voltamos ao visual original.' })
        router.refresh()
      } else {
        setMsg({ ok: false, text: 'Não foi possível remover o logo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível remover o logo.' })
    } finally {
      if (aliveRef.current) setSendingLogo(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Marca
        </span>
        <p style={HINT_STYLE}>
          Deixe o app com a cara da sua empresa: nome, logo e cores. As mudanças aparecem
          na hora, sem recarregar.
        </p>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="brand-app-name" style={LABEL_STYLE}>Nome do app</label>
        <input
          id="brand-app-name"
          type="text"
          value={appName}
          maxLength={NAME_MAX}
          disabled={!loaded}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Awave"
          autoComplete="off"
          style={INPUT_STYLE}
        />
        <p style={HINT_STYLE}>Aparece no topo do menu, no lugar de “Awave”.</p>
        <p style={HINT_STYLE}>
          O nome do assistente se ajusta na tela <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Agentes</strong> — renomeie
          o agente principal e o novo nome aparece no menu e na saudação.
        </p>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL_STYLE}>Logo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            aria-hidden={!logoUrl}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo atual" width={32} height={32} style={{ objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Onda</span>
            )}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void enviarLogo(f)
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sendingLogo}
            style={{ ...BUTTON_STYLE, opacity: sendingLogo ? 0.6 : 1, cursor: sendingLogo ? 'not-allowed' : 'pointer' }}
          >
            {sendingLogo ? 'Enviando…' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => void removerLogo()}
              disabled={sendingLogo}
              style={{ ...BUTTON_STYLE, background: 'transparent', color: 'var(--text-secondary)' }}
            >
              Remover
            </button>
          )}
        </div>
        <p style={HINT_STYLE}>
          PNG, JPG ou WebP até 2MB. Vira também o ícone da aba do navegador, então prefira
          uma imagem quadrada. Sem logo, mostramos a Onda.
        </p>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL_STYLE}>Cores da marca</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color"
            value={accentFrom}
            disabled={!loaded}
            onChange={(e) => setAccentFrom(e.target.value)}
            aria-label="Primeira cor do gradiente"
            style={{ width: 44, height: 34, padding: 2, border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer' }}
          />
          <span
            aria-hidden
            style={{
              flex: '0 0 96px',
              height: 8,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
            }}
          />
          <input
            type="color"
            value={accentTo}
            disabled={!loaded}
            onChange={(e) => setAccentTo(e.target.value)}
            aria-label="Segunda cor do gradiente"
            style={{ width: 44, height: 34, padding: 2, border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer' }}
          />
        </div>
        <p style={HINT_STYLE}>
          As duas pontas do degradê que colore os detalhes do app. A animação da Onda
          mantém as cores originais.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving || !loaded}
          style={{ ...BUTTON_STYLE, opacity: saving || !loaded ? 0.6 : 1, cursor: saving || !loaded ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && (
          <p role="status" style={{ ...HINT_STYLE, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}
