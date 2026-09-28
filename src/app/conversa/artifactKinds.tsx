'use client'


import { useState } from 'react'
import { prettyJsonOrRaw, type ArtifactKind } from '@/lib/artifacts'
import type { ArtifactRow } from '@/data/artifacts'
import { Markdown } from '@/components/markdown/Markdown'
import { useSignedUrl } from './useSignedUrl'

export function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
export function downloadBlobText(content: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const KIND_LABEL: Record<ArtifactKind, string> = {
  documento: 'Documento',
  html: 'Página',
  codigo: 'Código',
  dados: 'Dados',
  imagem: 'Imagem',
}

export const KIND_MIME: Record<ArtifactKind, string> = {
  documento: 'text/markdown;charset=utf-8',
  html: 'text/html;charset=utf-8',
  codigo: 'text/plain;charset=utf-8',
  dados: 'application/json;charset=utf-8',
  imagem: 'image/png',
}


export function documentExcerpt(content: string): string {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? ''
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`>#-]+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}


export function codeMeta(content: string): string {
  const lines = content ? content.split('\n').length : 0
  return `${lines} linha${lines === 1 ? '' : 's'}`
}



export function KindFull({ artifact }: { artifact: ArtifactRow }) {
  switch (artifact.kind) {
    case 'documento':
      return (
        <div style={{ padding: '18px 20px' }}>
          <Markdown>{artifact.content ?? ''}</Markdown>
        </div>
      )
    case 'html':
      return <HtmlFull content={artifact.content ?? ''} />
    case 'codigo':
      return <PreBlock text={artifact.content ?? ''} mono />
    case 'dados':
      return <PreBlock text={prettyJsonOrRaw(artifact.content ?? '')} mono />
    case 'imagem':
      return <ImageFull artifact={artifact} />
    default:
      return <PreBlock text={artifact.content ?? ''} />
  }
}

function PreBlock({ text, mono = false }: { text: string; mono?: boolean }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: '16px 18px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'var(--font-ui)',
        fontSize: mono ? 12.5 : 13.5,
        lineHeight: 1.6,
        color: 'var(--text-secondary)',
      }}
    >
      {text}
    </pre>
  )
}

function HtmlFull({ content }: { content: string }) {
  const [showSource, setShowSource] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flexShrink: 0, padding: '6px 14px', display: 'flex', gap: 6, borderBottom: '1px solid var(--border-hairline)' }}>
        <button type="button" onClick={() => setShowSource(false)} style={toggleStyle(!showSource)}>Visualizar</button>
        <button type="button" onClick={() => setShowSource(true)} style={toggleStyle(showSource)}>Ver código</button>
      </div>
      {showSource ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} className="awave-scroll-fantasma">
          <PreBlock text={content} mono />
        </div>
      ) : (
        <iframe
          
          sandbox="allow-scripts"
          srcDoc={content}
          title="Pré-visualização do artefato HTML"
          style={{ flex: 1, minHeight: 0, width: '100%', border: 'none', background: '#fff' }}
        />
      )}
    </div>
  )
}

function ImageFull({ artifact }: { artifact: ArtifactRow }) {
  const { url, error, indisponivel, reload } = useSignedUrl(artifact.id)
  return (
    <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
      {error ? (
        
        
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          {indisponivel ? 'Esse arquivo não está mais disponível.' : 'Não consegui carregar a imagem agora.'}
        </p>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={artifact.title} onError={reload} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }} />
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Carregando imagem…</p>
      )}
    </div>
  )
}



export function ImageThumb({ artifact }: { artifact: ArtifactRow }) {
  const { url, error, indisponivel, reload } = useSignedUrl(artifact.id)
  return (
    <div style={{ width: '100%', height: 140, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border-hairline)', display: 'grid', placeItems: 'center' }}>
      {error ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          {indisponivel ? 'arquivo indisponível' : 'Imagem'}
        </span>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={artifact.title} onError={reload} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Carregando…</span>
      )}
    </div>
  )
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-hairline)',
    background: active ? 'var(--surface-elevated)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
    fontSize: 11.5,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
  }
}
