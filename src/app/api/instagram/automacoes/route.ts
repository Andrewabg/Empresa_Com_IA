
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { validarAutomacao } from '@/lib/instagram/validarAutomacao'
import { listAutomacoes, criarAutomacao, substituirPassos } from '@/data/igAutomacoes'
import { getCanalDoInstagram, agenteDoInstagram } from '@/server/instagram/canalDoInstagram'
import { TEXTOS_ROTA_IG } from '@/lib/instagram/copyRota'

export async function GET(): Promise<Response> {
  try {
    const auth = await requireOperatorApi(await cookies())
    if (auth instanceof Response) return auth
    return await listar()
  } catch (e) {
    
    
    console.warn('[instagram/automacoes] GET falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaListar }, { status: 500 })
  }
}

async function listar(): Promise<Response> {
  const canal = await getCanalDoInstagram()
  if (!canal) return Response.json({ automacoes: [], conectado: false })
  return Response.json({ automacoes: await listAutomacoes(canal.id), conectado: true })
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireOperatorApi(await cookies())
    if (auth instanceof Response) return auth
    return await criar(request)
  } catch (e) {
    console.warn('[instagram/automacoes] POST falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaCriar }, { status: 500 })
  }
}

async function criar(request: Request): Promise<Response> {
  const canal = await getCanalDoInstagram()
  if (!canal) {
    return Response.json(
      { error: TEXTOS_ROTA_IG.semConta },
      { status: 409 },
    )
  }

  const corpo = await request.json().catch(() => ({}))
  const v = validarAutomacao(corpo)
  if (!v.ok) return Response.json({ error: v.erro }, { status: 400 })

  const aut = await criarAutomacao({
    canalId: canal.id,
    
    
    
    agentId: await agenteDoInstagram(canal),
    nome: v.valor.nome,
    gatilho: v.valor.gatilho,
    midiaId: v.valor.midiaId,
    
    
    midiaPermalink: v.valor.midiaPermalink ?? null,
    midiaThumbUrl: v.valor.midiaThumbUrl ?? null,
    storyId: v.valor.storyId,
    palavras: v.valor.palavras,
    modoCasamento: v.valor.modoCasamento,
    respostaPublica: v.valor.respostaPublica,
    respostaPublicaTexto: v.valor.respostaPublicaTexto,
    
    
    status: 'rascunho',
    
    
    
    expiraEm: null,
  })

  await substituirPassos(aut.id, v.valor.passos)
  return Response.json({ automacao: aut })
}
