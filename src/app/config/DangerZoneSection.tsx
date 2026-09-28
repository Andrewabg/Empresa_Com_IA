'use client'



import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ORDEM_CATEGORIAS } from '@/lib/reset/categorias'
import { montarRotulos } from '@/lib/reset/rotulos'
import type { CategoriaId } from '@/lib/reset/tipos'
import type { ConfigController } from './controller'


interface ItemPrevia {
  titulo: string
  descricao: string
}
interface PreviaReset {
  perde: ItemPrevia[]
  mantem: ItemPrevia[]
}



const CARD_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-lg)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const HINT_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--text-secondary)',
}


function CheckBox({ checked, disabled, onChange, label }: {
  checked: boolean
  disabled: boolean
  onChange: () => void
  label: string
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, marginTop: 2 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          margin: 0,
          width: 17,
          height: 17,
          borderRadius: 5,
          border: `1px solid ${checked ? 'rgb(229 99 77 / 0.55)' : 'var(--border-hairline)'}`,
          background: checked ? 'var(--reject)' : 'var(--surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      />
      {checked && (
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden
          style={{ position: 'absolute', top: 3, left: 3, pointerEvents: 'none' }}
        >
          <path d="M2 6.2l2.6 2.6L10 3.2" stroke="var(--bg-base)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}



export function DangerZoneSection({ ctrl }: { ctrl: ConfigController }) {
  
  
  const ROTULOS = useMemo(() => montarRotulos(ctrl.assistantName), [ctrl.assistantName])

  const [selecionadas, setSelecionadas] = useState<Set<CategoriaId>>(new Set())
  const [previa, setPrevia] = useState<PreviaReset | null>(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [confirmacaoNome, setConfirmacaoNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroReset, setErroReset] = useState<string | null>(null)

  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const abortRef = useRef<AbortController | null>(null)

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const buscarPrevia = useCallback((cats: Set<CategoriaId>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (cats.size === 0) {
      setPrevia(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      if (!aliveRef.current) return
      
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setCarregandoPrevia(true)
      try {
        const res = await fetch('/api/config/reset/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorias: [...cats] }),
          signal: ac.signal,
        })
        const json = (await res.json().catch(() => null)) as { ok?: boolean; previa?: PreviaReset } | null
        if (!aliveRef.current) return
        if (res.ok && json?.ok && json.previa) {
          setPrevia(json.previa)
        } else {
          setPrevia(null)
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (aliveRef.current) setPrevia(null)
      } finally {
        if (aliveRef.current) setCarregandoPrevia(false)
      }
    }, 300)
  }, [])

  function alternarCategoria(cat: CategoriaId) {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      if (cat === 'identidade') {
        if (next.has('identidade')) {
          
          next.clear()
        } else {
          
          for (const c of ORDEM_CATEGORIAS) next.add(c)
        }
      } else {
        if (next.has(cat)) {
          next.delete(cat)
        } else {
          next.add(cat)
        }
      }
      buscarPrevia(next)
      return next
    })
  }

  const identidadeAtiva = selecionadas.has('identidade')
  const nomeConfirmado =
    confirmacaoNome.trim().length > 0 &&
    confirmacaoNome.trim() === ctrl.companyName.trim()
  const podeResetar = selecionadas.size > 0 && nomeConfirmado && !enviando

  async function executarReset() {
    if (!podeResetar) return
    setEnviando(true)
    setErroReset(null)
    try {
      const res = await fetch('/api/config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorias: [...selecionadas],
          confirmacaoNome: confirmacaoNome.trim(),
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | { ok: true; redirect?: string | null }
        | { ok: false; error?: string }
        | null

      if (!aliveRef.current) return

      if (res.ok && json?.ok) {
        
        
        const raw = (json as { ok: true; redirect?: string | null }).redirect ?? null
        const destino = raw && /^\/[^/\\]/.test(raw) ? raw : '/config'
        window.location.href = destino
        return
      }
      const mensagem =
        (json as { ok: false; error?: string } | null)?.error ??
        `Erro ${res.status} ao executar o reset. Tente de novo.`
      setErroReset(mensagem)
    } catch {
      if (aliveRef.current) setErroReset('Não foi possível executar o reset. Verifique a conexão e tente de novo.')
    } finally {
      if (aliveRef.current) setEnviando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {}
      <header className="config-section__head">
        <div className="config-section__titlerow">
          <h1
            className="config-section__title"
            style={{ color: 'var(--reject)' }}
          >
            Zona de perigo
          </h1>
        </div>
        <p className="config-section__desc">
          Resetar apaga dados de forma irreversível. Escolha apenas o que precisa apagar.
          A licença e o seu acesso de Dono nunca são tocados.
        </p>
      </header>

      {}
      <div
        style={{
          ...CARD_STYLE,
          border: '1px solid rgb(229 99 77 / 0.22)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--reject)', opacity: 0.8 }}>
            O que apagar
          </span>
          <p style={HINT_STYLE}>
            Marque as categorias. Selecionar a identidade da empresa inclui tudo e leva de volta ao ritual de nascimento.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ORDEM_CATEGORIAS.map((cat) => {
            const rotulo = ROTULOS[cat]
            const checked = selecionadas.has(cat)
            
            const desabilitado = cat !== 'identidade' && identidadeAtiva

            return (
              <label
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${checked ? 'rgb(229 99 77 / 0.3)' : 'var(--border-hairline)'}`,
                  background: checked ? 'rgb(229 99 77 / 0.05)' : 'var(--surface-elevated)',
                  cursor: desabilitado ? 'not-allowed' : 'pointer',
                  opacity: desabilitado ? 0.5 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                  userSelect: 'none',
                }}
              >
                <CheckBox
                  checked={checked}
                  disabled={desabilitado}
                  onChange={() => alternarCategoria(cat)}
                  label={rotulo.titulo}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: checked ? 'var(--reject)' : 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {rotulo.titulo}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {rotulo.descricao}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {}
      {selecionadas.size > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              O que acontece
            </span>
            {carregandoPrevia ? (
              <p style={{ ...HINT_STYLE, color: 'var(--text-tertiary)' }}>Calculando…</p>
            ) : previa ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginTop: 8,
                }}
              >
                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--reject)',
                    }}
                  >
                    Você perde
                  </span>
                  {previa.perde.length === 0 ? (
                    <p style={{ ...HINT_STYLE, color: 'var(--text-tertiary)', fontSize: 12.5 }}>Nada.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {previa.perde.map((item) => (
                        <div
                          key={item.titulo}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgb(229 99 77 / 0.18)',
                            background: 'rgb(229 99 77 / 0.05)',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--reject)', display: 'block' }}>
                            {item.titulo}
                          </span>
                          {item.descricao && (
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
                              {item.descricao}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--approve)',
                    }}
                  >
                    Você mantém
                  </span>
                  {previa.mantem.length === 0 ? (
                    <p style={{ ...HINT_STYLE, color: 'var(--text-tertiary)', fontSize: 12.5 }}>Nada.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {previa.mantem.map((item) => (
                        <div
                          key={item.titulo}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgb(63 185 132 / 0.15)',
                            background: 'rgb(63 185 132 / 0.04)',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--approve)', display: 'block' }}>
                            {item.titulo}
                          </span>
                          {item.descricao && (
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
                              {item.descricao}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {}
      {selecionadas.size > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Confirmar
            </span>
            <p id="reset-confirm-hint" style={HINT_STYLE}>
              Para confirmar, digite o nome da empresa exatamente como configurado.
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label htmlFor="reset-confirmacao-nome" style={LABEL_STYLE}>
              Nome da empresa
            </label>
            <input
              id="reset-confirmacao-nome"
              aria-describedby="reset-confirm-hint"
              type="text"
              value={confirmacaoNome}
              onChange={(e) => {
                setConfirmacaoNome(e.target.value)
                setErroReset(null)
              }}
              placeholder={ctrl.companyName || 'Nome da empresa'}
              autoComplete="off"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${nomeConfirmado ? 'rgb(63 185 132 / 0.4)' : 'var(--border-hairline)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '11px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => void executarReset()}
            disabled={!podeResetar}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgb(229 99 77 / 0.4)',
              background: podeResetar ? 'rgb(229 99 77 / 0.12)' : 'transparent',
              color: podeResetar ? 'var(--reject)' : 'var(--text-tertiary)',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: podeResetar ? 'pointer' : 'not-allowed',
              opacity: podeResetar ? 1 : 0.5,
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {enviando ? 'Resetando…' : 'Resetar'}
          </button>

          {erroReset && (
            <p
              role="alert"
              style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}
            >
              {erroReset}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
