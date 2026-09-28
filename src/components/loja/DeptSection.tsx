'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import type { SecaoLoja } from '@/lib/marketing-store'
import { missaoDoDepartamento } from '@/lib/loja/deptMissions'
import { Chip } from './Chip'
import { LojaCard } from './LojaCard'

export interface DeptSectionProps {
  secao: SecaoLoja
  installedSet: Set<string>
  
  feriasSet?: Set<string>
  onOpen: (cardId: string) => void
}


export function DeptSection({ secao, installedSet, feriasSet, onOpen }: DeptSectionProps) {
  const reducedMotion = useReducedMotion()
  const missao = missaoDoDepartamento(secao.titulo)
  const noTime = secao.cards.filter((c) => installedSet.has(c.id) && !feriasSet?.has(c.id)).length
  const n = secao.cards.length

  return (
    <section>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          {secao.titulo}
        </h2>
        {missao && (
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 13.5,
              color: 'var(--text-tertiary)',
            }}
          >
            {missao}
          </span>
        )}
        <Chip>
          {n} especialista{n === 1 ? '' : 's'}
          {noTime > 0 ? ` · ${noTime} no time` : ''}
        </Chip>
      </header>

      <div
        style={{
          display: 'grid',
          
          
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 'clamp(16px, 2vw, 24px)',
          alignItems: 'stretch',
        }}
      >
        {secao.cards.map((card, i) => (
          
          <motion.div
            key={card.id}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.45, delay: i * 0.05 }}
            style={{ display: 'flex', minWidth: 0 }}
          >
            <LojaCard
              card={card}
              installed={installedSet.has(card.id)}
              deFerias={feriasSet?.has(card.id) ?? false}
              onOpen={onOpen}
            />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
