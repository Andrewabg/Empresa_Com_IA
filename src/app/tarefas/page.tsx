
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { listarObjetivosRecentes, listarStatusDosFilhos } from '@/data/tasks'
import { listAgentsSummary } from '@/data/agents'
import { COPY_TAREFAS } from '@/lib/tarefas/copy'
import { sinaisPorObjetivo } from '@/lib/tarefas/filtro'
import type { StatusTarefa } from '@/lib/tarefas/linhaDoTempo'
import { TarefasClient } from './TarefasClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: COPY_TAREFAS.tituloDaPagina,
  description: COPY_TAREFAS.subtitulo,
}

export default async function TarefasPage() {
  const membro = await requireMembro(await cookies())

  
  const [objetivosRes, elencoRes] = await Promise.allSettled([
    listarObjetivosRecentes(),
    listAgentsSummary(),
  ])
  if (objetivosRes.status === 'rejected') console.error('[/tarefas] listarObjetivosRecentes falhou:', objetivosRes.reason)
  if (elencoRes.status === 'rejected') console.error('[/tarefas] listAgentsSummary falhou:', elencoRes.reason)
  const objetivos = objetivosRes.status === 'fulfilled' ? objetivosRes.value : []

  
  
  const filhos = await listarStatusDosFilhos(objetivos.map((o) => o.id)).catch((err) => {
    console.error('[/tarefas] listarStatusDosFilhos falhou:', err)
    return []
  })

  return (
    <TarefasClient
      objetivos={objetivos}
      sinais={sinaisPorObjetivo(objetivos as Array<{ id: string; status: StatusTarefa }>, filhos)}
      agentes={(elencoRes.status === 'fulfilled' ? elencoRes.value : []).map((a) => ({ id: a.id, nome: a.name }))}
      ehDono={membro.papel === 'dono'}
      agora={new Date().toISOString()}
    />
  )
}
