
import { cookies } from 'next/headers'
import { requireDono } from '@/server/auth/membro'
import { listarRotinas } from '@/data/rotinas'
import { listAgentsSummary } from '@/data/agents'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'
import { RotinasClient } from './RotinasClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Rotinas',
  description: 'O trabalho que a sua empresa faz sozinha.',
}

export default async function RotinasPage() {
  await requireDono(await cookies()) 

  const [rotinas, elenco, tzBruto] = await Promise.all([
    listarRotinas(),
    listAgentsSummary(),
    getSetting('operator_timezone'),
  ])

  return (
    <RotinasClient
      initialRotinas={rotinas}
      agentes={elenco.map((a) => ({ id: a.id, nome: a.name, ativo: a.enabled }))}
      tz={validarTz(tzBruto ?? TZ_DEFAULT)}
      agora={new Date().toISOString()}
    />
  )
}
