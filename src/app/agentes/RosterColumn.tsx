'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import type { Agent } from './types'
import { AgentCard, Card } from './parts'

export function RosterColumn({ agents, selectedId, defaultModel, onSelect }: {
  agents: Agent[]
  selectedId: string | null
  defaultModel: string
  onSelect: (id: string) => void
}) {
  const reducedMotion = useReducedMotion()
  return (
    <Card label={`Time · ${agents.length}`} style={{ minWidth: 0 }}>
      {agents.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum agente ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {agents.map((a, i) => (
            
            
            <motion.div
              key={a.id}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.35, delay: i * 0.04 }}
              style={{ minWidth: 0 }}
            >
              <AgentCard
                agent={a}
                effectiveModel={a.model ?? defaultModel}
                selected={a.id === selectedId}
                onSelect={() => onSelect(a.id)}
                
                conversarHref={a.id !== 'curator-agent' ? `/conversa?agent=${a.id}` : null}
              />
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}
