'use client'


import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import type { CriativoView } from '@/lib/design/types'
import { CriativoCard } from './CriativoCard'
import type { EdicaoDaArte } from './EditorDeArte'
import { criativoEmFoco } from '@/lib/design/criativoEmFoco'
import { BriefCard } from './BriefCard'
import { useArtifactUrl } from './useArtifactUrl'

const STATUS_LABEL: Record<CriativoView['status'], string> = {
  brief: 'Brief',
  rascunho: 'Rascunho',
  revisao: 'Em revisão',
  aprovada: 'Aprovada',
  arquivada: 'Arquivada',
}

interface DesignCanvasProps {
  criativos: CriativoView[]
  
  focoId: string | null
  
  revelando: boolean
  onFocar: (id: string) => void
  onFinalizar: (id: string, variacao: number) => void
  finalizandoId: string | null
  onRevisar: (id: string) => void
  onArquivar: (id: string) => void
  
  onLancar?: (artifactId: string) => void
  lancandoArtifactId?: string | null
  
  onAbrir?: (artifactId: string) => void
  
  edicao?: EdicaoDaArte
  
  
  referencias: { id: string; titulo: string }[]
  
  onPreencherBrief: (id: string, patch: Record<string, unknown>) => void | Promise<void>
  
  onGerar: (id: string) => void | Promise<void>
  
  onPickReferencia: () => void
}


function Thumbnail({ artifactId, alt }: { artifactId: string; alt: string }) {
  const url = useArtifactUrl(artifactId)
  const reducedMotion = useReducedMotion() ?? false

  if (url === null) {
    return reducedMotion ? (
      <div
        aria-hidden
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-elevated)',
        }}
      />
    ) : (
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-elevated)',
        }}
      />
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        objectFit: 'cover',
        borderRadius: 'var(--radius-sm)',
        display: 'block',
      }}
    />
  )
}


function MiniCriativoCard({
  criativo,
  onClick,
}: {
  criativo: CriativoView
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const primeiraVariacao = criativo.variacoes[0]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${criativo.titulo || criativo.formato} — ${STATUS_LABEL[criativo.status]}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: hover ? 'var(--surface-elevated)' : 'var(--surface)',
        cursor: 'pointer',
        transition: 'background 140ms ease',
        minWidth: 0,
      }}
    >
      {primeiraVariacao ? (
        <Thumbnail artifactId={primeiraVariacao.artifactId} alt={criativo.titulo || criativo.formato} />
      ) : (
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {criativo.titulo || criativo.formato}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {STATUS_LABEL[criativo.status]}
        </span>
      </div>
    </div>
  )
}


function RevelandoPlaceholder({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      animate={reducedMotion ? false : { opacity: [0.55, 1, 0.55] }}
      transition={
        reducedMotion
          ? undefined
          : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
      }
      style={{
        borderRadius: 'var(--radius-lg)',
        
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
        padding: '28px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        O Téo está trabalhando…
      </p>
    </motion.div>
  )
}


function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        marginBottom: 8,
      }}
    >
      {children}
    </span>
  )
}

export function DesignCanvas({
  criativos,
  focoId,
  revelando,
  onFocar,
  onFinalizar,
  finalizandoId,
  onRevisar,
  onArquivar,
  onLancar,
  lancandoArtifactId,
  onAbrir,
  edicao,
  referencias,
  onPreencherBrief,
  onGerar,
  onPickReferencia,
}: DesignCanvasProps) {
  const reducedMotion = useReducedMotion() ?? false

  
  
  
  
  const grande = criativoEmFoco(criativos, focoId)

  
  const outros = grande ? criativos.filter((c) => c.id !== grande.id) : criativos
  const ativos = outros.filter(
    (c) => c.status !== 'aprovada' && c.status !== 'arquivada',
  )
  const aprovados = outros.filter((c) => c.status === 'aprovada')
  const arquivados = outros.filter((c) => c.status === 'arquivada')

  
  if (!revelando && !grande) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 'clamp(16px, 2.5vw, 28px)',
      }}
    >
      {}
      {revelando && <RevelandoPlaceholder reducedMotion={reducedMotion} />}

      {}
      {grande && (
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={grande.id}
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
          >
            {grande.status === 'brief' ? (
              <BriefCard
                criativo={grande}
                referencias={referencias}
                onPreencher={onPreencherBrief}
                onGerar={onGerar}
                onPickReferencia={onPickReferencia}
                onDescartar={onArquivar}
              />
            ) : (
              <CriativoCard
                criativo={grande}
                emFoco
                onFinalizar={onFinalizar}
                finalizandoId={finalizandoId}
                onRevisar={onRevisar}
                onArquivar={onArquivar}
                onLancar={onLancar}
                lancandoArtifactId={lancandoArtifactId}
                onAbrir={onAbrir}
                edicao={edicao}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {}
      {ativos.length > 0 && (
        <div>
          <SecaoTitulo>Em andamento</SecaoTitulo>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
            }}
          >
            {ativos.map((c) => (
              <MiniCriativoCard key={c.id} criativo={c} onClick={() => onFocar(c.id)} />
            ))}
          </div>
        </div>
      )}

      {}
      {aprovados.length > 0 && (
        <div>
          <SecaoTitulo>Aprovados</SecaoTitulo>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
            }}
          >
            {aprovados.map((c) => (
              <MiniCriativoCard key={c.id} criativo={c} onClick={() => onFocar(c.id)} />
            ))}
          </div>
        </div>
      )}

      {}
      {arquivados.length > 0 && (
        <details>
          <summary
            style={{
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              userSelect: 'none',
              listStyle: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span aria-hidden style={{ fontSize: 10 }}>›</span>
            Arquivados ({arquivados.length})
          </summary>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
              marginTop: 8,
            }}
          >
            {arquivados.map((c) => (
              <MiniCriativoCard key={c.id} criativo={c} onClick={() => onFocar(c.id)} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
