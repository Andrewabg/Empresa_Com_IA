
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getCustomConfigs } from '@/server/custom/registryConfig'
import { validarEntradaConfigCustom } from '@/server/custom/validarEntradaConfig'
import { getSecretCustom, setSecretCustom } from '@/server/custom/segredos'
import { getSetting, setSetting } from '@/data/settings'
import { listarRecentes } from '@/data/webhookEvents'
import type { ConfigCustom } from '@/server/custom/contrato'

export const dynamic = 'force-dynamic'

interface CampoResposta {
  chave: string
  rotulo: string
  tipo: ConfigCustom['tipo']
  obrigatorio: boolean
  ajuda: string | null
  
  configurado: boolean
  
  valor: string
}

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let configs: ConfigCustom[]
  try {
    configs = getCustomConfigs()
  } catch (err) {
    
    console.warn('[config/custom] getCustomConfigs falhou (não-fatal):', err instanceof Error ? err.message : err)
    return Response.json({ campos: [], eventos: [] })
  }

  try {
    const campos: CampoResposta[] = await Promise.all(
      configs.map(async (c): Promise<CampoResposta> => {
        if (c.tipo === 'segredo') {
          const presente = (await getSecretCustom(c.chave)) !== null
          return {
            chave: c.chave, rotulo: c.rotulo, tipo: c.tipo,
            obrigatorio: !!c.obrigatorio, ajuda: c.ajuda ?? null,
            configurado: presente, valor: '', 
          }
        }
        const valor = (await getSetting(c.chave)) ?? ''
        return {
          chave: c.chave, rotulo: c.rotulo, tipo: c.tipo,
          obrigatorio: !!c.obrigatorio, ajuda: c.ajuda ?? null,
          configurado: valor.trim() !== '', valor,
        }
      }),
    )

    
    let eventos: Array<{ id: string; slug: string; status: string; received_at: string; last_error: string | null }> = []
    try {
      const rows = await listarRecentes(20)
      eventos = rows.map((r) => ({
        id: r.id, slug: r.slug, status: r.status,
        received_at: r.received_at, last_error: r.last_error,
      }))
    } catch (err) {
      console.warn('[config/custom] listarRecentes falhou (não-fatal):', err instanceof Error ? err.message : err)
    }

    return Response.json({ campos, eventos })
  } catch (err) {
    console.error('[GET /api/config/custom]', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Não foi possível carregar as integrações.' }, { status: 500 })
  }
}

async function salvar(req: Request): Promise<Response> {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  let configs: ConfigCustom[]
  try {
    configs = getCustomConfigs()
  } catch {
    return Response.json({ error: 'Integrações indisponíveis.' }, { status: 400 })
  }

  
  const valores: Record<string, string> = {}
  for (const [k, v] of Object.entries(body)) {
    valores[k] = typeof v === 'string' ? v : (v as string) 
  }

  const erros = validarEntradaConfigCustom(configs, valores as Record<string, string>)
  if (erros.length) {
    return Response.json({ error: erros.join(' · '), erros }, { status: 400 })
  }

  const porChave = new Map(configs.map((c) => [c.chave, c]))
  try {
    
    
    await Promise.all(
      Object.keys(valores).map((chave) => {
        const decl = porChave.get(chave)!
        const valor = valores[chave]
        return decl.tipo === 'segredo'
          ? setSecretCustom(chave, valor)
          : setSetting(chave, valor)
      }),
    )
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/config/custom]', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Não foi possível salvar. Tente de novo.' }, { status: 500 })
  }
}

export async function POST(req: Request) { return salvar(req) }
export async function PUT(req: Request) { return salvar(req) }
