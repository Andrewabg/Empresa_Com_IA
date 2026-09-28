'use client'




import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { useArtifactUrl } from './useArtifactUrl'


export function ImgCriativo({
  artifactId,
  alt,
  ratio,
  style,
}: {
  artifactId: string
  alt: string
  ratio: number
  style?: React.CSSProperties
}) {
  const url = useArtifactUrl(artifactId)
  const reducedMotion = useReducedMotion() ?? false

  if (url === null) {
    return reducedMotion ? (
      <div
        aria-hidden
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          aspectRatio: ratio,
          ...style,
        }}
      />
    ) : (
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        style={{
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          aspectRatio: ratio,
          ...style,
        }}
      />
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      style={{
        display: 'block',
        width: '100%',
        aspectRatio: ratio,
        objectFit: 'contain',
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    />
  )
}
