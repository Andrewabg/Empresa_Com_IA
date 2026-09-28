
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getFonte } from '@/data/fontes'
import { getSecret } from '@/server/secrets'
import { adaptadorBanco } from '@/server/fontes/adaptadores/banco'
import { reconhecerFonte, AVISO_ORCAMENTO } from '@/server/fontes/reconhecer'
import { FalhaAoPropor, copyDaFalhaDoModelo } from '@/server/fontes/erroDoModelo'
import { mensagemDeErroDaFonte, ERRO_PROPOSTA_FALHOU } from '@/lib/fontes/mensagens'


import {
  ERRO_FONTE_NAO_ENCONTRADA_RECONHECER,
  ERRO_CONEXAO_NAO_GUARDADA,
} from '@/server/fontes/copyDasRotas'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  try {
    const fonte = await getFonte(id)
    if (!fonte) return Response.json({ error: ERRO_FONTE_NAO_ENCONTRADA_RECONHECER }, { status: 404 })
    const credencial = await getSecret(fonte.secret_ref)
    if (!credencial) {
      return Response.json({ error: ERRO_CONEXAO_NAO_GUARDADA }, { status: 400 })
    }

    const { propostas, recusadas } = await reconhecerFonte(adaptadorBanco, credencial)
    return Response.json({ propostas, recusadas })
  } catch (err) {
    const cru = err instanceof Error ? err.message : String(err)
    
    if (cru === AVISO_ORCAMENTO) return Response.json({ error: cru }, { status: 400 })
    console.error('[POST /api/fontes/[id]/reconhecer]', err)
    
    
    
    if (err instanceof FalhaAoPropor) {
      return Response.json(
        { error: copyDaFalhaDoModelo(err.causa, ERRO_PROPOSTA_FALHOU) },
        { status: 502 },
      )
    }
    
    
    return Response.json({ error: mensagemDeErroDaFonte(cru) }, { status: 502 })
  }
}
