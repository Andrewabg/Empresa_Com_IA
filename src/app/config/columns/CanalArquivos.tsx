'use client'



import { useCallback, useEffect, useRef, useState } from 'react'

interface ArquivoRow {
  id: string
  slug: string
  rotulo: string
  descricao: string
  mime: string
  bytes: number
  enabled: boolean
}

const CHIP: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
  borderRadius: 99, fontSize: 10.5, fontWeight: 500, flexShrink: 0,
}

function tamanho(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function CanalArquivos({ canalId }: { canalId: string }) {
  const [arquivos, setArquivos] = useState<ArquivoRow[] | null>(null)
  const [aberto, setAberto] = useState(false)
  const [rotulo, setRotulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/canais/midia?canal=${encodeURIComponent(canalId)}`)
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; arquivos?: ArquivoRow[] }
      if (j.ok && Array.isArray(j.arquivos)) setArquivos(j.arquivos)
    } catch {
      
    }
  }, [canalId])

  useEffect(() => { if (aberto && arquivos === null) void load() }, [aberto, arquivos, load])

  async function subir(file: File) {
    setBusy(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('canalId', canalId)
      fd.append('file', file)
      fd.append('rotulo', rotulo.trim() || file.name)
      fd.append('descricao', descricao.trim())
      const res = await fetch('/api/canais/midia', { method: 'POST', body: fd })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; detalhe?: string; aviso?: string; reason?: string }
      if (j.ok) {
        setRotulo('')
        setDescricao('')
        
        setMsg({ ok: true, texto: j.aviso ? `Adicionado — ${j.aviso}.` : 'Arquivo adicionado.' })
        await load()
      } else {
        setMsg({ ok: false, texto: j.detalhe ?? 'Não consegui adicionar esse arquivo.' })
      }
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : 'Falhou.' })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function alternar(a: ArquivoRow) {
    
    setArquivos((prev) => prev?.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)) ?? prev)
    await fetch('/api/canais/midia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, enabled: !a.enabled }),
    }).catch(() => {})
    await load()
  }

  async function remover(a: ArquivoRow) {
    setBusy(true)
    await fetch('/api/canais/midia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    }).catch(() => {})
    setBusy(false)
    await load()
  }

  const total = arquivos?.length ?? 0

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        style={{
          alignSelf: 'flex-start', padding: 0, border: 'none', background: 'transparent',
          color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer',
        }}
      >
        {aberto ? '▾' : '▸'} Arquivos que o atendente pode enviar
        {arquivos !== null && total > 0 && <span style={{ color: 'var(--text-secondary)' }}> · {total}</span>}
      </button>

      {aberto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 14 }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            O atendente só consegue mandar o que estiver nesta lista. Ele escolhe pela descrição,
            então escreva <em>quando</em> usar cada arquivo.
          </p>

          {arquivos?.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                background: 'var(--surface)', border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)', flexWrap: 'wrap',
                opacity: a.enabled ? 1 : 0.55,
              }}
            >
              <span
                style={{
                  ...CHIP,
                  background: a.enabled ? 'rgb(63 185 132 / 0.12)' : 'rgb(255 255 255 / 0.05)',
                  color: a.enabled ? 'var(--approve)' : 'var(--text-tertiary)',
                  border: `1px solid ${a.enabled ? 'rgb(63 185 132 / 0.2)' : 'rgb(255 255 255 / 0.07)'}`,
                }}
              >
                {a.enabled ? '● ativo' : '○ inativo'}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{a.rotulo}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', flex: 1, minWidth: 90 }}>
                {a.descricao || <em>sem descrição — o agente não vai saber quando usar</em>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tamanho(a.bytes)}</span>
              <button
                type="button"
                onClick={() => void alternar(a)}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
                  background: 'transparent', color: a.enabled ? 'var(--reject)' : 'var(--approve)',
                  fontSize: 11.5, fontFamily: 'var(--font-ui)', cursor: 'pointer',
                }}
              >
                {a.enabled ? 'Desativar' : 'Ativar'}
              </button>
              <button
                type="button"
                onClick={() => void remover(a)}
                disabled={busy}
                title="Remover do catálogo"
                style={{
                  padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
                  background: 'transparent', color: 'var(--text-tertiary)', fontSize: 11.5,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                }}
              >
                Remover
              </button>
            </div>
          ))}

          {arquivos !== null && total === 0 && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
              Nenhum arquivo liberado ainda — o atendente não oferece arquivo nenhum.
            </p>
          )}

          {}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Nome (ex.: Tabela de preços 2026)"
              style={{
                flex: '1 1 180px', minWidth: 140, background: 'var(--surface)',
                border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
                padding: '7px 10px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                fontSize: 12.5, outline: 'none',
              }}
            />
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Quando usar (ex.: quando pedirem preço)"
              style={{
                flex: '1 1 200px', minWidth: 150, background: 'var(--surface)',
                border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
                padding: '7px 10px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
                fontSize: 12.5, outline: 'none',
              }}
            />
            <input
              ref={fileRef}
              type="file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f) }}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: busy ? 'var(--surface)' : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                color: busy ? 'var(--text-tertiary)' : '#fff', fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--font-ui)', cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0,
              }}
            >
              {busy ? 'Enviando…' : '+ Adicionar arquivo'}
            </button>
          </div>

          {msg && (
            <p role="status" style={{ margin: 0, fontSize: 12, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
              {msg.ok ? '✓' : '✗'} {msg.texto}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
