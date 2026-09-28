
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { getMembro } from '@/server/auth/membro'
import { listNotes } from '@/data/brainNotes'
import { getBrain, NotConfiguredError, type Brain } from '@/server/brain/runtime'
import { CerebroClient } from './CerebroClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cérebro',
  description: 'Memórias e conhecimento.',
}

export default async function CerebroPage() {
  const cookieStore = await cookies()
  await requireOperator(cookieStore)

  let brain: Brain | null = null
  let degraded = false
  try {
    brain = await getBrain()
  } catch (err) {
    
    
    if (!(err instanceof NotConfiguredError)) {
      console.warn('[cerebro] Cérebro inacessível — renderizando só o índice do DB:', err)
      degraded = true
    }
    brain = null
  }

  const initialNotes = await listNotes(brain)

  
  
  
  let ignorados: string[] = []
  try {
    const repo = brain?.repo as { listarIgnoradosInesperados?: () => Promise<string[]> } | undefined
    if (repo?.listarIgnoradosInesperados) ignorados = await repo.listarIgnoradosInesperados()
  } catch (err) {
    console.warn('[cerebro] leitura dos arquivos ignorados falhou (fail-open):', err)
  }

  
  
  
  let podeEditar = false
  try {
    podeEditar = (await getMembro(cookieStore))?.papel === 'dono'
  } catch (err) {
    console.warn('[cerebro] leitura do papel falhou (esconde o Editar):', err)
  }

  return (
    <CerebroClient
      initialNotes={initialNotes}
      degraded={degraded}
      podeEditar={podeEditar}
      ignorados={ignorados}
    />
  )
}
