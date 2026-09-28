'use client'



import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TITULO_MAX, validarEdicao, AVISO_INDICE_ATRASADO, type EdicaoNota } from '@/lib/brain/edicaoDeNota'

type Fase = 'carregando' | 'editando' | 'salvando' | 'erro_ao_abrir' | 'salvo_com_aviso'

const campo: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13.5,
  padding: '8px 10px',
  outline: 'none',
}

const botao: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export function EditarNota({
  path,
  tituloDaLista,
  onFechar,
}: {
  path: string
  
  tituloDaLista: string
  onFechar: () => void
}) {
  const router = useRouter()
  const idTitulo = useId()
  const idCorpo = useId()

  const [fase, setFase] = useState<Fase>('carregando')
  const [titulo, setTitulo] = useState(tituloDaLista)
  const [corpo, setCorpo] = useState('')
  
  const [original, setOriginal] = useState<EdicaoNota>({ titulo: tituloDaLista, corpo: '' })
  const [erro, setErro] = useState<string | null>(null)
  
  const [urlDoPedido, setUrlDoPedido] = useState<string | null>(null)
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  useEffect(() => {
    let ativo = true
    fetch(`/api/cerebro/nota?path=${encodeURIComponent(path)}`)
      .then(async (r) => ({ ok: r.ok, body: (await r.json().catch(() => null)) as Record<string, unknown> | null }))
      .catch(() => null)
      .then((res) => {
        if (!ativo) return
        const nota = res?.ok ? res.body : null
        if (!nota || typeof nota.corpo !== 'string') {
          setErro(
            typeof res?.body?.error === 'string'
              ? (res.body.error as string)
              : 'Não consegui abrir essa nota agora.',
          )
          setFase('erro_ao_abrir')
          return
        }
        const carregado: EdicaoNota = {
          titulo: typeof nota.titulo === 'string' && nota.titulo ? nota.titulo : tituloDaLista,
          corpo: nota.corpo,
        }
        setTitulo(carregado.titulo)
        setCorpo(carregado.corpo)
        setOriginal(carregado)
        setFase('editando')
      })
    return () => {
      ativo = false
    }
  }, [path, tituloDaLista])

  const veredito = validarEdicao({ titulo, corpo }, original)
  const podeSalvar = fase === 'editando' && veredito.ok

  async function salvar() {
    if (!podeSalvar) return
    setFase('salvando')
    setErro(null)
    setUrlDoPedido(null)
    try {
      const res = await fetch('/api/cerebro/nota', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, titulo, corpo }),
      })
      const j = (await res.json().catch(() => null)) as
        | { error?: string; indice_atrasado?: true; url?: string }
        | null
      if (!vivo.current) return
      if (!res.ok) {
        
        
        
        setErro(j?.error ?? 'Não consegui salvar a edição.')
        setUrlDoPedido(typeof j?.url === 'string' ? j.url : null)
        setFase('editando')
        return
      }
      
      
      router.refresh()
      if (j?.indice_atrasado) {
        
        
        
        
        
        setFase('salvo_com_aviso')
        return
      }
      onFechar()
    } catch {
      if (!vivo.current) return
      setErro('Não consegui falar com o servidor. Sua edição não foi salva.')
      setFase('editando')
    }
  }

  if (fase === 'erro_ao_abrir') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
        <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{erro}</p>
        <div>
          <button type="button" onClick={onFechar} style={botao}>Fechar</button>
        </div>
      </div>
    )
  }

  if (fase === 'salvo_com_aviso') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0' }}>
        <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{AVISO_INDICE_ATRASADO}</p>
        <div>
          <button type="button" onClick={onFechar} style={botao}>Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label htmlFor={idTitulo} style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Título
        </label>
        <input
          id={idTitulo}
          type="text"
          value={titulo}
          maxLength={TITULO_MAX}
          disabled={fase !== 'editando'}
          onChange={(e) => setTitulo(e.target.value)}
          style={campo}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label htmlFor={idCorpo} style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Texto da nota
        </label>
        <textarea
          id={idCorpo}
          value={corpo}
          rows={14}
          disabled={fase !== 'editando'}
          placeholder={fase === 'carregando' ? 'Abrindo a nota…' : undefined}
          onChange={(e) => setCorpo(e.target.value)}
          style={{ ...campo, resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-mono, var(--font-ui))' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={!podeSalvar}
          style={{ ...botao, opacity: podeSalvar ? 1 : 0.55, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}
        >
          {fase === 'salvando' ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onFechar} disabled={fase === 'salvando'} style={{ ...botao, background: 'transparent', color: 'var(--text-secondary)' }}>
          Cancelar
        </button>
        {erro ? (
          <span role="status" style={{ fontSize: 12, color: 'var(--reject)' }}>
            {erro}
            {urlDoPedido && (
              <>
                {' '}
                <a href={urlDoPedido} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)' }}>
                  Ver o pedido
                </a>
              </>
            )}
          </span>
        ) : (
          !veredito.ok &&
          fase === 'editando' && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{veredito.aviso}</span>
          )
        )}
      </div>

      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Salvar grava a nota no repositório do Cérebro e reindexa a busca. Seus agentes passam
        a usar o texto novo na próxima conversa.
      </p>
    </div>
  )
}
