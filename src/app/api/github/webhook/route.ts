

import { handleWebhook } from '@/server/webhook/handler'
import { readBodyCapped, WEBHOOK_MAX_BYTES } from '@/server/http/readBodyCapped'

export async function POST(req: Request): Promise<Response> {
  
  
  
  const body = await readBodyCapped(req, WEBHOOK_MAX_BYTES)
  if (!body.ok) {
    const status = body.reason === 'too_large' ? 413 : 400
    return new Response(JSON.stringify({ status, error: body.reason }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const rawBody = body.text

  
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const result = await handleWebhook(rawBody, headers)

  return new Response(JSON.stringify(result), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
