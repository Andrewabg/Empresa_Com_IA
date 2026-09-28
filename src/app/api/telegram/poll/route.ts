import { timingSafeEqual } from 'node:crypto'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { pollCiclo } from '@/server/canais/telegramPoll'

export const maxDuration = 60 

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function POST(request: Request) {
  const secret = await getSecret(SECRET_KEYS.cron_secret)
  if (!secret) return Response.json({ error: 'not_configured' }, { status: 503 })

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token || !constantTimeEqual(token, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return Response.json(await pollCiclo())
  } catch (err) {
    console.error('[POST /api/telegram/poll]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
