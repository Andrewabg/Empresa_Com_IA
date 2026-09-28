
import { getSetting } from '@/data/settings'
import { saudeDoMotor, CHAVE_ULTIMO_HEARTBEAT, intervaloDoHeartbeatS } from '@/lib/saudeDoMotor'

export async function GET(request: Request): Promise<Response> {
  const profundo = new URL(request.url).searchParams.get('deep') === '1'
  if (!profundo) return Response.json({ ok: true })

  try {
    const ultimoIso = await getSetting(CHAVE_ULTIMO_HEARTBEAT)
    const intervaloSegundos = intervaloDoHeartbeatS(process.env.HEARTBEAT_INTERVAL_SECONDS)
    const motor = saudeDoMotor({
      ultimoIso,
      agoraIso: new Date().toISOString(),
      intervaloSegundos,
      uptimeSegundos: process.uptime(),
    })
    const corpo = { ok: motor.estado !== 'parado', motor: motor.estado, ultimoTrabalhoEm: ultimoIso, paradoHaMinutos: motor.paradoHaMinutos }
    return Response.json(corpo, { status: motor.estado === 'parado' ? 503 : 200 })
  } catch (err) {
    
    
    console.error('[GET /api/health?deep=1]', err)
    return Response.json({ ok: false, motor: 'desconhecido', erro: 'nao_consegui_medir' }, { status: 503 })
  }
}
