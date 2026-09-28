'use client'



import { useState } from 'react'

interface Conflito { campo: string; base: string; vivo: string; meu: string }


const CAMPO_LABEL: Record<string, string> = {
  name: 'Nome',
  system_prompt: 'Instruções',
  model: 'Modelo',
  tools: 'Ferramentas',
  skills: 'Skills',
  enabled: 'Ativo',
}
function rotuloCampo(campo: string): string {
  if (CAMPO_LABEL[campo]) return CAMPO_LABEL[campo]
  if (campo.startsWith('persona:')) return 'Persona · ' + campo.slice('persona:'.length)
  if (campo.startsWith('diretriz:')) return 'Regra fixa'
  return campo
}

export function PublicarBar({
  agentId,
  temRascunho,
  onChanged,
}: {
  agentId: string
  temRascunho: boolean
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<null | 'publicar' | 'descartar' | 'reverter'>(null)
  const [conflitos, setConflitos] = useState<Conflito[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  function limparFeedback() { setErro(null); setOk(null) }

  async function publicar(confirmar: boolean) {
    limparFeedback()
    setBusy('publicar')
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmar }),
      })
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const j = (await res.json()) as { error?: string }; if (j?.error) detail = j.error } catch {  }
        setErro(`Não foi possível publicar (${detail}).`)
        return
      }
      const j = (await res.json()) as { ok?: boolean; conflitos?: Conflito[] }
      if (j.ok === false && Array.isArray(j.conflitos) && j.conflitos.length > 0) {
        
        setConflitos(j.conflitos)
        return
      }
      
      setConflitos(null)
      setOk('Publicado. A produção já roda a nova versão.')
      onChanged()
    } catch (e) {
      setErro(`Não foi possível publicar (${e instanceof Error ? e.message : String(e)}).`)
    } finally {
      setBusy(null)
    }
  }

  async function descartar() {
    if (!window.confirm('Descartar o rascunho? As mudanças não publicadas serão perdidas.')) return
    limparFeedback()
    setBusy('descartar')
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft/discard', { method: 'POST' })
      if (!res.ok) { setErro('Não foi possível descartar o rascunho.'); return }
      setConflitos(null)
      setOk('Rascunho descartado.')
      onChanged()
    } catch {
      setErro('Não foi possível descartar o rascunho.')
    } finally {
      setBusy(null)
    }
  }

  async function reverter() {
    if (!window.confirm('Reverter a última publicação? A produção volta para a versão anterior.')) return
    limparFeedback()
    setBusy('reverter')
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft/revert', { method: 'POST' })
      if (!res.ok) { setErro('Não foi possível reverter.'); return }
      const j = (await res.json()) as { ok?: boolean }
      if (j.ok === false) { setErro('Não há publicação anterior para reverter.'); return }
      setConflitos(null)
      setOk('Publicação anterior restaurada.')
      onChanged()
    } catch {
      setErro('Não foi possível reverter.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      paddingTop: 14, borderTop: '1px solid var(--border-hairline)',
    }}>
      {}
      {conflitos && conflitos.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '11px 13px', borderRadius: 'var(--radius-md)',
          border: '1px solid rgb(214 158 46 / 0.35)', background: 'rgb(214 158 46 / 0.06)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            A produção mudou desde que você começou
          </span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conflitos.map((c, i) => (
              <li key={`${c.campo}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  {rotuloCampo(c.campo)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  no ar agora:{' '}
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {c.vivo.length > 120 ? c.vivo.slice(0, 120) + '…' : c.vivo}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  sua versão:{' '}
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {c.meu.length > 120 ? c.meu.slice(0, 120) + '…' : c.meu}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void publicar(true)}
            disabled={busy !== null}
            style={{
              alignSelf: 'flex-start', marginTop: 2,
              padding: '7px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgb(214 158 46 / 0.4)', background: 'rgb(214 158 46 / 0.14)',
              color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'publicar' ? 'Publicando…' : 'Publicar mesmo assim'}
          </button>
        </div>
      )}

      {}
      {ok && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--approve)' }}>✓ {ok}</p>}
      {erro && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{erro}</p>}

      {}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => void publicar(false)}
          disabled={busy !== null || !temRascunho}
          title={temRascunho ? undefined : 'Não há rascunho para publicar'}
          style={{
            padding: '10px 24px', borderRadius: 'var(--radius-md)',
            border: '1px solid transparent', background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 14, fontWeight: 500,
            cursor: busy !== null || !temRascunho ? 'not-allowed' : 'pointer',
            opacity: busy !== null || !temRascunho ? 0.5 : 1,
          }}
        >
          {busy === 'publicar' && !conflitos ? 'Publicando…' : 'Publicar'}
        </button>
        <button
          type="button"
          onClick={() => void descartar()}
          disabled={busy !== null || !temRascunho}
          style={{
            padding: '10px 18px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface)',
            color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 500,
            cursor: busy !== null || !temRascunho ? 'not-allowed' : 'pointer',
            opacity: busy !== null || !temRascunho ? 0.5 : 1,
          }}
        >
          {busy === 'descartar' ? 'Descartando…' : 'Descartar rascunho'}
        </button>
        <button
          type="button"
          onClick={() => void reverter()}
          disabled={busy !== null}
          style={{
            marginLeft: 'auto',
            padding: '10px 18px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface)',
            color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500,
            cursor: busy !== null ? 'not-allowed' : 'pointer', opacity: busy !== null ? 0.5 : 1,
          }}
        >
          {busy === 'reverter' ? 'Revertendo…' : 'Reverter última publicação'}
        </button>
      </div>
    </div>
  )
}
