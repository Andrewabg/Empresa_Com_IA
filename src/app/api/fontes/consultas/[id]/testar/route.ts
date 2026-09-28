
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getConsulta, getFonte, registrarAvisoDaFonte } from '@/data/fontes'
import { getSecret } from '@/server/secrets'
import { adaptadorBanco, poderDaConexao } from '@/server/fontes/adaptadores/banco'
import { motivoDaRecusa } from '@/server/fontes/recusa'
import { RecusaDoNucleo } from '@/server/fontes/recusaDoNucleo'
import { agregadoSuspeito } from '@/lib/fontes/agregadoSeguro'
import {
  mensagemDeErroDaFonte,
  RECUSA_CONEXAO_COM_PODER_DEMAIS,
  AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO,
} from '@/lib/fontes/mensagens'


import {
  ERRO_CONSULTA_NAO_ENCONTRADA_TESTAR,
  ERRO_FONTE_NAO_ENCONTRADA_TESTAR,
  ERRO_CONEXAO_NAO_GUARDADA_TESTAR,
  ERRO_FONTE_DESLIGADA_TESTAR,
} from '@/server/fontes/copyDasRotas'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  
  
  
  try {
    const consulta = await getConsulta(id)
    if (!consulta) return Response.json({ error: ERRO_CONSULTA_NAO_ENCONTRADA_TESTAR }, { status: 404 })

    const recusa = motivoDaRecusa(consulta.corpo, consulta.nota_path ?? '')
    if (recusa) return Response.json({ error: recusa }, { status: 400 })

    const fonte = await getFonte(consulta.fonte_id)
    if (!fonte) return Response.json({ error: ERRO_FONTE_NAO_ENCONTRADA_TESTAR }, { status: 404 })
    
    
    
    if (!fonte.ativa) return Response.json({ error: ERRO_FONTE_DESLIGADA_TESTAR }, { status: 400 })
    const credencial = await getSecret(fonte.secret_ref)
    if (!credencial) {
      return Response.json({ error: ERRO_CONEXAO_NAO_GUARDADA_TESTAR }, { status: 400 })
    }

    
    
    
    
    
    const poder = await poderDaConexao(credencial)
    if (poder === 'poder_demais') {
      return Response.json({ error: RECUSA_CONEXAO_COM_PODER_DEMAIS }, { status: 400 })
    }
    const aviso = poder === 'nao_deu_para_conferir' ? AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO : null
    
    
    
    
    await registrarAvisoDaFonte(fonte.id, aviso)

    const agregado = await adaptadorBanco.obter(credencial, consulta.corpo)

    
    
    
    
    
    const motivoDoAgregado = agregadoSuspeito(agregado)
    if (motivoDoAgregado) return Response.json({ error: motivoDoAgregado }, { status: 400 })

    return Response.json({ agregado, aviso: aviso ?? undefined })
  } catch (err) {
    const cru = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/fontes/consultas/[id]/testar]', err)
    
    
    
    
    if (err instanceof RecusaDoNucleo) return Response.json({ error: err.message }, { status: 400 })
    return Response.json({ error: mensagemDeErroDaFonte(cru) }, { status: 502 })
  }
}
