import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { definirSenhaDeMembro } from '@/data/equipe'
import { erroDaSenha } from '@/lib/equipe'


export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: { userId?: unknown; senha?: unknown }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.userId !== 'string' || typeof body.senha !== 'string') {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 })
  }

  
  
  
  if (body.userId === auth.user.id) {
    return Response.json({ ok: false, error: 'Você não muda a sua própria senha por aqui. Veja "Esqueci a senha" na Central de Ajuda.' }, { status: 400 })
  }

  const invalida = erroDaSenha(body.senha)
  if (invalida) return Response.json({ ok: false, error: invalida }, { status: 400 })

  try {
    const definiu = await definirSenhaDeMembro(body.userId, body.senha)
    if (!definiu) {
      return Response.json({ ok: false, error: 'Essa pessoa não está na sua equipe.' }, { status: 404 })
    }
    
    console.info('[POST /api/config/equipe/senha] senha redefinida', { alvo: body.userId, por: auth.user.id })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/config/equipe/senha]', err)
    return Response.json({ ok: false, error: 'Não foi possível definir a senha.' }, { status: 500 })
  }
}
