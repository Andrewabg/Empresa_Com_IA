
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { buscarCerebro } from '@/server/tools/buscarCerebro'

const K = 6

export async function GET(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ ok: true, notas: [] })

  try {
    const notas = await buscarCerebro(q, K)
    return NextResponse.json({ ok: true, notas: notas.map((n) => ({ titulo: n.título ?? '', trecho: n.trecho })) })
  } catch (err) {
    console.error('[GET /api/design/cerebro]', err)
    return NextResponse.json({ ok: true, notas: [] })
  }
}
