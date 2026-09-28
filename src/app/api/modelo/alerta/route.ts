
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { alertaDoModelo } from '@/server/modelo/alerta'

export async function GET() {
  const cookieStore = await cookies()

  try {
    await requireOperator(cookieStore)
  } catch (err) {
    const isRedirect =
      typeof (err as { digest?: unknown })?.digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    if (isRedirect) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    throw err
  }

  
  
  return Response.json({ alerta: await alertaDoModelo() })
}
