




import { handleCanalWebhook } from '@/server/canais/webhookHandler'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { readBodyCapped, WEBHOOK_MAX_BYTES } from '@/server/http/readBodyCapped'


const CABECALHO_DE_ASSINATURA = 'x-hub-signature-256'




export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const esperado = await getSecret(SECRET_KEYS.instagram_verify_token)
  if (mode === 'subscribe' && esperado && token === esperado && challenge) {
    return new Response(challenge, { status: 200 }) 
  }
  return new Response('forbidden', { status: 403 })
}

export async function POST(req: Request): Promise<Response> {
  
  
  
  
  if (!req.headers.get(CABECALHO_DE_ASSINATURA)) {
    return Response.json({ error: 'assinatura inválida' }, { status: 401 })
  }
  const body = await readBodyCapped(req, WEBHOOK_MAX_BYTES)
  if (!body.ok) {
    const status = body.reason === 'too_large' ? 413 : 400
    return Response.json({ error: body.reason }, { status })
  }
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })
  const result = await handleCanalWebhook('instagram', body.text, headers, [])
  return Response.json(result.body, { status: result.status })
}
