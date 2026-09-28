'use client'



import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { KindAnexo } from '@/lib/conversa/anexo'


export type EstadoAnexo = 'subindo' | 'pronto' | 'erro'

export interface AnexoStaged {
  
  key: string
  
  file: File
  
  nome: string
  kind: KindAnexo
  bytes: number
  estado: EstadoAnexo
  
  artifactId?: string
  
  erro?: string
}


export function formatarBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

const TAMANHO_THUMB = 30


function Miniatura({ file, kind, nome }: { file: File; kind: KindAnexo; nome: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (kind !== 'imagem') return
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => {
      URL.revokeObjectURL(u)
      setUrl(null)
    }
  }, [file, kind])

  const base: React.CSSProperties = {
    width: TAMANHO_THUMB,
    height: TAMANHO_THUMB,
    flexShrink: 0,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-hairline)',
    background: 'var(--surface)',
  }

  if (kind === 'imagem') {
    
    
    return url ? (
      <img src={url} alt={nome} style={{ ...base, objectFit: 'cover', display: 'block' }} />
    ) : (
      <span aria-hidden style={base} />
    )
  }

  return (
    <span style={{ ...base, display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)' }}>
      <DocGlyph />
    </span>
  )
}


export function AnexoBandeja({
  anexos,
  onRemover,
  onTentarDeNovo,
  reducedMotion,
}: {
  anexos: AnexoStaged[]
  onRemover: (key: string) => void
  onTentarDeNovo: (key: string) => void
  reducedMotion: boolean
}) {
  if (anexos.length === 0) return null

  return (
    <div
      data-no-pushtotalk
      aria-label="Arquivos anexados a esta mensagem"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
      }}
    >
      {anexos.map((a) => {
        const erro = a.estado === 'erro'
        return (
          <div
            key={a.key}
            style={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 210,
              padding: '5px 5px 5px 5px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              border: erro
                ? '1px solid color-mix(in srgb, var(--reject) 55%, transparent)'
                : '1px solid var(--border-hairline)',
              opacity: a.estado === 'subindo' ? 0.85 : 1,
              transition: 'opacity 140ms ease, border-color 140ms ease',
            }}
          >
            <Miniatura file={a.file} kind={a.kind} nome={a.nome} />

            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span
                title={a.nome}
                style={{
                  fontSize: 12,
                  lineHeight: 1.25,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.nome}
              </span>
              {erro ? (
                <button
                  type="button"
                  onClick={() => onTentarDeNovo(a.key)}
                  title={a.erro ?? 'Não consegui subir esse arquivo.'}
                  style={{
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 10.5,
                    lineHeight: 1.3,
                    color: 'var(--reject)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  não subiu · tentar de novo
                </button>
              ) : (
                <span style={{ fontSize: 10.5, lineHeight: 1.3, color: 'var(--text-tertiary)' }}>
                  {a.estado === 'subindo' ? 'subindo…' : formatarBytes(a.bytes)}
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={() => onRemover(a.key)}
              aria-label={`Remover ${a.nome}`}
              title="Remover"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 20,
                height: 20,
                flexShrink: 0,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'color 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <XGlyph />
            </button>

            {}
            {a.estado === 'subindo' && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2,
                  overflow: 'hidden',
                  background: 'var(--border-hairline)',
                }}
              >
                <motion.span
                  style={{
                    display: 'block',
                    width: '45%',
                    height: '100%',
                    background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                  }}
                  animate={reducedMotion ? { opacity: 0.7 } : { x: ['-100%', '320%'] }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 1.2, repeat: Infinity, ease: 'linear' }
                  }
                />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}




function DocGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M9.2 1.8H4.6a1.2 1.2 0 0 0-1.2 1.2v10a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.2L9.2 1.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9.1 2v3.3h3.3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function XGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 2.5l7 7M9.5 2.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
