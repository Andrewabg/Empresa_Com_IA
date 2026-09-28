




import { handleCanalWebhook } from '@/server/canais/webhookHandler'
import { getProvider } from '@/server/canais/registry'
import { readBodyCapped, WEBHOOK_MAX_BYTES } from '@/server/http/readBodyCapped'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string; caminho?: string[] }> },
): Promise<Response> {
  const { provider, caminho } = await ctx.params
  const spec = getProvider(provider)
  if (!spec) return new Response('provider desconhecido', { status: 404 })

  const body = await readBodyCapped(req, WEBHOOK_MAX_BYTES)
  if (!body.ok) {
    return Response.json({ error: body.reason }, { status: body.reason === 'too_large' ? 413 : 400 })
  }

  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

  const result = await handleCanalWebhook(spec.slug, body.text, headers, caminho ?? [])
  return Response.json(result.body, { status: result.status })
}
