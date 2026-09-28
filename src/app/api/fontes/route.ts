
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { normalizarFonte } from '@/server/fontes/entrada'
import { criarFonte, listarFontes, listarConsultasDasFontes, contarFontes } from '@/data/fontes'
import { fonteSecretKey, setSecret, deleteSecret } from '@/server/secrets'
import { poderDaConexao } from '@/server/fontes/adaptadores/banco'
import {
  RECUSA_CONEXAO_COM_PODER_DEMAIS,
  AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO,
} from '@/lib/fontes/mensagens'
import { MAX_FONTES } from '@/lib/fontes/tipos'




import {
  ERRO_LISTAR_FONTES,
  ERRO_GRAVAR_SEGREDO,
  ERRO_SALVAR_FONTE,
  ERRO_LIMITE_DE_FONTES,
} from '@/server/fontes/copyDasRotas'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const fontes = await listarFontes()
    
    
    
    const consultas = await listarConsultasDasFontes(fontes.map((f) => f.id))
    const porFonte = new Map<string, typeof consultas>()
    for (const c of consultas) {
      const lista = porFonte.get(c.fonte_id)
      if (lista) lista.push(c)
      else porFonte.set(c.fonte_id, [c])
    }
    const comConsultas = fontes.map((f) => ({ ...f, consultas: porFonte.get(f.id) ?? [] }))
    return Response.json({ fontes: comConsultas })
  } catch (err) {
    console.error('[GET /api/fontes]', err)
    return Response.json({ error: ERRO_LISTAR_FONTES }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entrada = normalizarFonte(body)
  if (!entrada.ok) return Response.json({ error: entrada.erro }, { status: 400 })

  
  
  
  
  
  try {
    if ((await contarFontes()) >= MAX_FONTES) {
      return Response.json({ error: ERRO_LIMITE_DE_FONTES }, { status: 409 })
    }
  } catch (err) {
    console.warn('[POST /api/fontes] contagem de fontes falhou (fail-open):', err)
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const poder = await poderDaConexao(entrada.valor.credencial)
  if (poder === 'poder_demais') {
    return Response.json({ error: RECUSA_CONEXAO_COM_PODER_DEMAIS }, { status: 400 })
  }
  const aviso = poder === 'nao_deu_para_conferir' ? AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO : null

  
  
  
  
  const id = randomUUID()
  const secretRef = fonteSecretKey(id)
  try {
    await setSecret(secretRef, entrada.valor.credencial)
  } catch (err) {
    console.error('[POST /api/fontes] setSecret', err)
    return Response.json({ error: ERRO_GRAVAR_SEGREDO }, { status: 500 })
  }

  try {
    const fonte = await criarFonte({ id, nome: entrada.valor.nome, tipo: 'banco', secretRef, aviso })
    
    return Response.json({ fonte, aviso: aviso ?? undefined })
  } catch (err) {
    console.error('[POST /api/fontes] criarFonte', err)
    
    
    
    
    
    
    
    await deleteSecret(secretRef).catch((e) =>
      console.warn(`[POST /api/fontes] deleteSecret(${secretRef}) de compensação falhou:`, e),
    )
    return Response.json({ error: ERRO_SALVAR_FONTE }, { status: 500 })
  }
}
