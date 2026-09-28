
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { listPending } from '@/server/approvals/service'
import { resolverOrigens } from '@/server/aprovacoes/origem'
import { carregarNomesDeAgente } from '@/server/aprovacoes/nomesDeAgente'
import { AprovacoesClient } from './AprovacoesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Aprovações',
  description: 'Ações pendentes esperando sua decisão.',
}

export default async function AprovacoesPage() {
  const cookieStore = await cookies()
  
  
  const membro = await requireMembro(cookieStore)

  const approvals = await listPending()
  
  
  const origens = await resolverOrigens(approvals).catch(() => ({}))
  
  
  const nomesDeAgente = await carregarNomesDeAgente()

  return <AprovacoesClient initialApprovals={approvals} origens={origens} nomesDeAgente={nomesDeAgente} ehDono={membro.papel === 'dono'} />
}
