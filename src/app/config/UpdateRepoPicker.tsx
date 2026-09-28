'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { guessMotorRepo } from '@/lib/motor-repo-guess'
import { tealButtonStyle } from './UpdateCard'
import type { RepoEntry, ListReposResponse, CreateRepoResponse } from './ui'

const MUTED = 'var(--text-tertiary)'


const FIELD_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: MUTED,
}


const LINK_STYLE: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: 0,
  border: 'none',
  background: 'none',
  color: MUTED,
  fontSize: 12.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}

type Mode = 'existing' | 'create' | 'manual'

interface SaveResponse {
  ok?: boolean
  repoConfigured?: boolean
  error?: string
}

export function UpdateRepoPicker({
  brainRepo,
  onSaved,
  currentRepo,
}: {
  brainRepo: string | null
  onSaved: () => void
  currentRepo?: string | null
}) {
  const [repos, setRepos] = useState<RepoEntry[] | null>(null)
  const [listError, setListError] = useState(false)
  const [mode, setMode] = useState<Mode>('existing')
  const [selected, setSelected] = useState('') 
  const [manual, setManual] = useState('') 
  const [newName, setNewName] = useState('') 
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  
  
  
  useEffect(() => {
    let alive = true
    void fetch('/api/config/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((r) => (r.ok ? (r.json() as Promise<ListReposResponse>) : null))
      .then((j) => {
        if (!alive) return
        if (j?.ok && j.repos && j.repos.length > 0) {
          setRepos(j.repos)
          setSelected(guessMotorRepo(j.repos, brainRepo) ?? '')
        } else {
          setListError(true)
          setMode('manual')
        }
      })
      .catch(() => {
        if (!alive) return
        setListError(true)
        setMode('manual')
      })
    return () => {
      alive = false
    }
  }, [brainRepo])

  
  const effectiveRepo = (mode === 'manual' ? manual : selected).trim()

  const createRepo = useCallback(async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/config/repos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = (await res.json().catch(() => null)) as CreateRepoResponse | null
      if (!mounted.current) return
      if (!res.ok || !json?.ok || !json.fullName) {
        setCreateError(
          json?.detail ? `Não foi possível criar (${json.detail}).` : 'Não foi possível criar o repositório.',
        )
        return
      }
      
      setRepos((prev) =>
        prev && prev.some((r) => r.fullName === json.fullName)
          ? prev
          : [{ fullName: json.fullName!, private: true }, ...(prev ?? [])],
      )
      setSelected(json.fullName)
      setMode('existing')
    } catch {
      if (mounted.current) setCreateError('Não foi possível criar o repositório.')
    } finally {
      if (mounted.current) setCreating(false)
    }
  }, [newName, creating])

  const save = useCallback(async () => {
    const slug = effectiveRepo
    if (!slug.includes('/')) {
      setError('Repo inválido — use o formato owner/nome (ex.: fulano/awave-motor).')
      return
    }
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/config/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_repo: slug }),
      })
      const json = (await res.json().catch(() => null)) as SaveResponse | null
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'Não foi possível salvar.')
        return
      }
      onSaved() 
    } catch {
      setError('Não foi possível salvar.')
    } finally {
      if (mounted.current) setSaving(false)
    }
  }, [effectiveRepo, saving, onSaved])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <label htmlFor="update_repo_select" style={LABEL_STYLE}>
          Repositório do Motor (onde publicar a atualização)
        </label>

        {currentRepo && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: MUTED }}>
            Atual: <code style={{ color: 'var(--text-secondary)' }}>{currentRepo}</code> — escolha ou digite o novo abaixo.
          </p>
        )}

        {}
        {mode === 'existing' && repos && (
          <>
            <select
              id="update_repo_select"
              aria-label="Escolher o repositório do Motor"
              value={repos.some((r) => r.fullName === selected) ? selected : ''}
              onChange={(e) => setSelected(e.target.value)}
              style={{ ...FIELD_STYLE, cursor: 'pointer' }}
            >
              <option value="">Selecione o repositório do Motor ({repos.length})…</option>
              {repos.map((r) => (
                <option key={r.fullName} value={r.fullName}>
                  {r.private ? '🔒 ' : ''}
                  {r.fullName}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { setMode('create'); setCreateError(null) }} style={LINK_STYLE}>
                ou criar um repositório novo
              </button>
              <button type="button" onClick={() => setMode('manual')} style={LINK_STYLE}>
                digitar manualmente
              </button>
            </div>
          </>
        )}

        {}
        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                id="update_repo_new"
                name="update_repo_new"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void createRepo()
                  }
                }}
                placeholder="awave-motor"
                autoComplete="off"
                spellCheck={false}
                aria-label="Nome do novo repositório"
                style={{ ...FIELD_STYLE, flex: 1, minWidth: 160 }}
              />
              <button
                type="button"
                onClick={() => void createRepo()}
                disabled={creating || newName.trim().length === 0}
                style={tealButtonStyle(creating || newName.trim().length === 0)}
              >
                {creating ? 'Criando...' : 'Criar privado'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: MUTED }}>
              Criamos um repositório <strong style={{ color: 'var(--text-secondary)' }}>privado</strong> só seu.
            </p>
            {createError && (
              <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}>
                ✗ {createError}
              </p>
            )}
            {repos && (
              <button type="button" onClick={() => setMode('existing')} style={LINK_STYLE}>
                ← escolher um repositório existente
              </button>
            )}
          </div>
        )}

        {}
        {mode === 'manual' && (
          <>
            <input
              id="update_repo"
              name="update_repo"
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
              }}
              placeholder="owner/nome"
              autoComplete="off"
              spellCheck={false}
              style={FIELD_STYLE}
            />
            {listError ? (
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: MUTED }}>
                Não deu pra listar seus repositórios — revise o GitHub em{' '}
                <a href="#essenciais" style={{ color: 'var(--wave-from)' }}>
                  Essenciais
                </a>
                , ou digite o repo acima.
              </p>
            ) : (
              repos && (
                <button type="button" onClick={() => setMode('existing')} style={LINK_STYLE}>
                  ← escolher da lista
                </button>
              )
            )}
          </>
        )}

        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: MUTED }}>
          O token do GitHub salvo em Essenciais precisa de acesso de escrita neste repo.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || effectiveRepo.length === 0}
          style={tealButtonStyle(saving || effectiveRepo.length === 0)}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {error && (
        <p role="status" style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}>
          ✗ {error}
        </p>
      )}
    </div>
  )
}
