'use client'



import { IdentidadeEmpresaCard } from '../IdentidadeEmpresaCard'
import { FusoCard } from '../FusoCard'
import { InterfaceCard } from '../InterfaceCard'
import { MarcaCard } from '../MarcaCard'
import { AtalhosCard } from '../AtalhosCard'
import { FichaEmpresaCard } from '../FichaEmpresaCard'
import { IntegracaoCard } from '../IntegracaoCard'
import { SectionHeader } from '../SectionHeader'

export function PreferenciasSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Preferências"
        description="Ajustes finos da interface — a cara do app e como as fichas dos agentes aparecem para você."
      />
      {}
      <IdentidadeEmpresaCard />
      <FusoCard />
      <MarcaCard />
      <AtalhosCard />
      <FichaEmpresaCard />
      {}
      <IntegracaoCard />
      <InterfaceCard />
    </div>
  )
}
