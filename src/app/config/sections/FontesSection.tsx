'use client'



import { FontesCard } from '../columns/FontesCard'
import { SectionHeader } from '../SectionHeader'
import { TEXTOS_FONTES } from '@/lib/fontes/copyDaTela'

export function FontesSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title={TEXTOS_FONTES.tituloSecao} description={TEXTOS_FONTES.descricaoSecao} />
      <FontesCard />
    </div>
  )
}
