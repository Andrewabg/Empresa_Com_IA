













import { processarIngressWebhook, ingressDepsReais } from '@/server/custom/ingress'
import { getCustomWebhooks } from '@/server/custom/registryWebhooks'
import { readBodyCapped, WEBHOOK_MAX_BYTES } from '@/server/http/readBodyCapped'

function ipDe(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim() || 'sem-ip'
  return 'sem-ip'
}

async function despachar(req: Request, slug: string): Promise<Response> {
  
  const body = await readBodyCapped(req, WEBHOOK_MAX_BYTES)
  if (!body.ok) {
    return Response.json({ error: body.reason }, { status: body.reason === 'too_large' ? 413 : 400 })
  }

  
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

  
  const query: Record<string, string> = {}
  new URL(req.url).searchParams.forEach((v, k) => { query[k] = v })

  const chaveRate = `${ipDe(req)}:${slug}`

  const { status } = await processarIngressWebhook(
    { slug, raw: body.text, headers, query, chaveRate },
    ingressDepsReais(),
  )
  return Response.json({ status }, { status })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params
  return despachar(req, slug)
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params
  
  const webhook = getCustomWebhooks().find((w) => w.slug === slug) ?? null
  if (!webhook || webhook.metodo !== 'GET_POST') {
    return Response.json({ error: 'método não suportado' }, { status: 405 })
  }
  return despachar(req, slug)
}
