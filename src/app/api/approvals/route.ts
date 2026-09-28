
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { listPending } from '@/server/approvals/service'
import { resolverAprovacao } from '@/server/approvals/resolver'
import { getApproval } from '@/data/approvals'
import { espelharDecisaoNoTelegram } from '@/server/approvals/telegramMirror'



export async function GET() {
  const cookieStore = await cookies()

  try {
    await requireOperator(cookieStore)
  } catch (err) {
    const isRedirect =
      typeof (err as { digest?: unknown })?.digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    if (isRedirect) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw err
  }

  try {
    const approvals = await listPending()
    return Response.json({ approvals })
  } catch (err) {
    console.error('[GET /api/approvals]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}



export async function POST(request: Request) {
  const cookieStore = await cookies()

  
  
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  
  let body: { id?: unknown; action?: unknown; correcao?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : null
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : null
  
  
  const correcao = typeof body.correcao === 'string' ? body.correcao : undefined

  if (!id) {
    return Response.json({ error: 'id is required and must be a non-empty string' }, { status: 400 })
  }
  if (!action) {
    return Response.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    )
  }

  
  
  const r = await resolverAprovacao(id, action, undefined, { correcaoDoPlano: correcao })

  if (r.ok) {
    
    
    
    
    
    
    void espelharAprovacaoNoTelegram(id).catch((e) =>
      console.warn('[POST /api/approvals] espelhar no Telegram falhou (fail-open):', e))
    return Response.json({ ok: true })
  }

  switch (r.motivo) {
    case 'not_found':
      return Response.json({ ok: false, error: 'not found' }, { status: 404 })
    case 'needs_config':
      
      return Response.json({ needsConfig: true }, { status: 200 })
    case 'composio_off':
      
      return Response.json({ ok: false, error: 'Composio não configurado' }, { status: 409 })
    case 'permanente':
      
      
      return Response.json({ ok: false, error: r.mensagem, permanente: true }, { status: 409 })
    default:
      
      
      return Response.json(
        { ok: false, error: 'Não foi possível concluir a ação. Tente de novo.' },
        { status: 500 },
      )
  }
}


async function espelharAprovacaoNoTelegram(id: string): Promise<void> {
  const approval = await getApproval(id)
  if (!approval) return
  await espelharDecisaoNoTelegram(approval)
}
