'use client'



import { LicenseSection } from '../LicenseSection'
import { UpdateCard } from '../UpdateCard'
import { SectionHeader } from '../SectionHeader'

export function LicencaSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Licença"
        description="O estado da sua licença Awave. Ela destrava a Loja e as atualizações — o motor roda para sempre mesmo sem licença ativa."
      />
      <LicenseSection />
      <UpdateCard />
    </div>
  )
}
