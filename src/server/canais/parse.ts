

import { descreverInbound } from '@/lib/canais/inboundRico'
import type { CanalEvent, InboundMidia } from './types'

const MIDIA_TYPES = ['image', 'audio', 'video', 'document', 'sticker'] as const
const CAP_TEXTO = 4000 


export function parseInboundWhatsapp(rawBody: string, agoraIso?: string): CanalEvent[] {
  let payload: unknown
  try { payload = JSON.parse(rawBody) } catch { return [] }
  const p = payload as { object?: string; entry?: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }> }
  if (p?.object !== 'whatsapp_business_account' || !Array.isArray(p.entry)) return []

  const out: CanalEvent[] = []
  for (const entry of p.entry) {
    for (const change of (Array.isArray(entry.changes) ? entry.changes : [])) {
      const v = change.value as {
        metadata?: { phone_number_id?: string }
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
        messages?: Array<Record<string, unknown>>
        statuses?: Array<{
          id?: string; status?: string
          errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>
          pricing?: { billable?: boolean; category?: string }
        }>
      } | undefined
      const canalExternalId = v?.metadata?.phone_number_id
      if (!canalExternalId) continue

      for (const s of v?.statuses ?? []) {
        if (!s.id || !s.status) continue
        if (!['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue
        
        
        const e = s.errors?.[0]
        const erro = typeof e?.code === 'number'
          ? { erro: { codigo: e.code, titulo: e.title ?? '', ...((e.error_data?.details ?? e.message) ? { detalhe: e.error_data?.details ?? e.message } : {}) } }
          : {}
        const cobranca = typeof s.pricing?.billable === 'boolean' && s.pricing?.category
          ? { cobranca: { billable: s.pricing.billable, categoria: s.pricing.category } }
          : {}
        out.push({
          kind: 'status', canalExternalId, externalId: s.id,
          status: s.status as 'sent' | 'delivered' | 'read' | 'failed',
          ...erro, ...cobranca,
        })
      }

      const contatoNome = v?.contacts?.[0]?.profile?.name ?? ''
      for (const m of v?.messages ?? []) {
        const tipo = m.type as string | undefined
        const from = m.from as string | undefined
        const id = m.id as string | undefined
        const ts = m.timestamp as string | undefined
        if (!tipo || !from || !id) continue
        
        

        let texto = ''
        let midia: InboundMidia | null = null
        if (tipo === 'text') {
          texto = ((m.text as { body?: string })?.body ?? '').slice(0, CAP_TEXTO)
        } else if ((MIDIA_TYPES as readonly string[]).includes(tipo)) {
          const obj = m[tipo] as { id?: string; mime_type?: string; caption?: string } | undefined
          midia = { kind: tipo, ...(obj?.id ? { media_id: obj.id } : {}), ...(obj?.mime_type ? { mime: obj.mime_type } : {}) }
          texto = (obj?.caption ?? '').slice(0, CAP_TEXTO)
        } else {
          
          
          const rico = descreverInbound(tipo, m)
          midia = rico
            ? { kind: tipo, dados: rico.dados, texto_estruturado: rico.texto }
            : { kind: tipo }
        }
        const timestamp = ts && /^\d+$/.test(ts) ? new Date(Number(ts) * 1000).toISOString() : (agoraIso ?? new Date().toISOString())
        
        const respostaA = (m.context as { id?: string } | undefined)?.id
        out.push({
          kind: 'mensagem', canalExternalId, contato: { externalId: from, nome: contatoNome },
          externalId: id, timestamp, texto, midia, origem: 'contato',
          ...(respostaA ? { respostaA } : {}),
        })
      }
    }
  }
  return out
}
