'use client'


import { useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { artifactFilename, type ArtifactKind } from '@/lib/artifacts'
import type { ArtifactRow } from '@/data/artifacts'
import { KIND_LABEL, KIND_MIME, documentExcerpt, codeMeta, ImageThumb, triggerDownload, downloadBlobText } from './artifactKinds'
import styles from './ArtifactCard.module.css'

export function ArtifactCard({ artifact, onOpen }: { artifact: ArtifactRow; onOpen: (id: string) => void }) {
  const reducedMotion = useReducedMotion() ?? false
  const [copied, setCopied] = useState(false)
  
  
  
  const [erroDownload, setErroDownload] = useState<string | null>(null)
  const isImage = artifact.kind === 'imagem'
  const content = artifact.content ?? ''

  const falharDownload = (msg: string) => {
    setErroDownload(msg)
    setTimeout(() => setErroDownload(null), 2500)
  }

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      
    }
  }
  const onDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const filename = artifactFilename(artifact.title, artifact.kind)
    if (isImage) {
      try {
        const res = await fetch(`/api/artifacts/${artifact.id}/url`)
        if (!res.ok) {
          falharDownload(res.status === 404 ? 'Indisponível' : 'Falhou')
          return
        }
        const { url } = (await res.json()) as { url?: string }
        if (!url) {
          falharDownload('Falhou')
          return
        }
        const blob = await (await fetch(url)).blob()
        const obj = URL.createObjectURL(blob)
        triggerDownload(obj, filename)
        setTimeout(() => URL.revokeObjectURL(obj), 0)
      } catch {
        falharDownload('Falhou')
      }
      return
    }
    downloadBlobText(content, KIND_MIME[artifact.kind], filename)
  }

  const meta =
    artifact.kind === 'documento'
      ? documentExcerpt(content)
      : artifact.kind === 'codigo'
        ? codeMeta(content)
        : KIND_LABEL[artifact.kind]

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Abrir entrega: ${artifact.title}`}
      onClick={() => onOpen(artifact.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(artifact.id)
        }
      }}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : springPreset}
      className={styles.card}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
        cursor: 'pointer',
      }}
    >
      {isImage ? (
        <ImageThumb artifact={artifact} />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <KindGlyph kind={artifact.kind} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={artifact.title}
          >
            {artifact.title}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {artifact.kind === 'documento' && meta ? meta : `${KIND_LABEL[artifact.kind]}${artifact.kind === 'codigo' ? ` · ${meta}` : ''}`}
          </div>
        </div>
      </div>

      {}
      {artifact.kind === 'codigo' && content ? (
        <pre
          style={{
            margin: 0,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 11.5,
            lineHeight: 1.5,
            color: 'var(--text-tertiary)',
            overflow: 'hidden',
            maxHeight: 40,
            whiteSpace: 'pre',
          }}
        >
          {content.split('\n').slice(0, 2).join('\n')}
        </pre>
      ) : null}
      {artifact.kind === 'html' ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>toque pra ver a página</span>
      ) : null}

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {!isImage && (
          <button type="button" onClick={onCopy} aria-live="polite" className={styles.actionBtn} style={actionBtn} title="Copiar conteúdo">
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
        <button type="button" onClick={onDownload} aria-live="polite" className={styles.actionBtn} style={actionBtn} title="Baixar arquivo">
          {erroDownload ?? 'Baixar'}
        </button>
      </div>
    </motion.div>
  )
}

const actionBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 11.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}

function KindGlyph({ kind }: { kind: ArtifactKind }) {
  
  const paths: Record<ArtifactKind, string> = {
    documento: 'M4 2h6l3 3v9H4zM10 2v3h3',
    html: 'M2 4h13v9H2zM2 7h13',
    codigo: 'M6 5l-3 3 3 3M11 5l3 3-3 3',
    dados: 'M8 2c3 0 5 1 5 2v9c0 1-2 2-5 2s-5-1-5-2V4c0-1 2-2 5-2zM3 8c0 1 2 2 5 2s5-1 5-2',
    imagem: 'M2 3h13v11H2zM5 9l2 2 3-4 3 4',
  }
  return (
    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden style={{ flexShrink: 0, color: 'var(--text-tertiary)', marginTop: 1 }}>
      <path d={paths[kind]} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
