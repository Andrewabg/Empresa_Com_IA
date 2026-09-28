
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { normalizarConsulta } from '@/server/fontes/entrada'
import { criarConsulta, getFonte, contarConsultasDaFonte } from '@/data/fontes'
import { proximaExecucao } from '@/lib/rotinas/agenda'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'


import {
  ERRO_FONTE_NAO_ENCONTRADA_CONSULTA,
  ERRO_SALVAR_CONSULTA,
  ERRO_LIMITE_DE_CONSULTAS,
} from '@/server/fontes/copyDasRotas'
import { ERRO_NOTA_PATH_EM_USO } from '@/lib/fontes/mensagens'
import { MAX_CONSULTAS_POR_FONTE } from '@/lib/fontes/tipos'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entrada = normalizarConsulta(body)
  if (!entrada.ok) return Response.json({ error: entrada.erro }, { status: 400 })

  try {
    if (!(await getFonte(entrada.valor.fonteId))) {
      return Response.json({ error: ERRO_FONTE_NAO_ENCONTRADA_CONSULTA }, { status: 404 })
    }
    
    
    if ((await contarConsultasDaFonte(entrada.valor.fonteId)) >= MAX_CONSULTAS_POR_FONTE) {
      return Response.json({ error: ERRO_LIMITE_DE_CONSULTAS }, { status: 409 })
    }
    const tz = validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT)
    const consulta = await criarConsulta({
      ...entrada.valor,
      proximaExecucao: proximaExecucao(entrada.valor.agenda, new Date().toISOString(), tz),
    })
    
    
    
    if (!consulta) return Response.json({ error: ERRO_NOTA_PATH_EM_USO }, { status: 409 })
    return Response.json({ consulta })
  } catch (err) {
    console.error('[POST /api/fontes/consultas]', err)
    return Response.json({ error: ERRO_SALVAR_CONSULTA }, { status: 500 })
  }
}
