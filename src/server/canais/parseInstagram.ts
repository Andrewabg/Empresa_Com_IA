





import type { CanalEvent } from './types'

const CAP_TEXTO = 4000 


function paraIso(valor: unknown, agoraIso: string): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return agoraIso
  
  const ms = valor < 1e11 ? valor * 1000 : valor
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? agoraIso : d.toISOString()
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.slice(0, CAP_TEXTO).trim() : ''
}

export function parseInboundInstagram(rawBody: string, agoraIso?: string): CanalEvent[] {
  const agora = agoraIso ?? new Date().toISOString()
  let payload: unknown
  try { payload = JSON.parse(rawBody) } catch { return [] }
  const p = payload as {
    object?: string
    entry?: Array<{
      id?: string; time?: number
      changes?: Array<{ field?: string; value?: Record<string, unknown> }>
      messaging?: Array<Record<string, unknown>>
    }>
  }
  if (p?.object !== 'instagram' || !Array.isArray(p.entry)) return []

  const out: CanalEvent[] = []
  for (const entry of p.entry) {
    const canalExternalId = entry?.id
    if (!canalExternalId) continue
    const tsEntry = paraIso(entry.time, agora)

    
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (change.field !== 'comments' && change.field !== 'live_comments') continue
      const v = change.value as {
        id?: string
        from?: { id?: string; username?: string }
        media?: { id?: string; permalink?: string }
        parent_id?: string
        text?: string
      } | undefined
      const externalId = v?.id
      const deId = v?.from?.id
      const midiaId = v?.media?.id
      const t = texto(v?.text)
      
      
      if (!externalId || !deId || !midiaId || !t) continue
      out.push({
        kind: 'comentario',
        canalExternalId,
        externalId,
        midiaId,
        permalink: v?.media?.permalink ?? null,
        parentId: v?.parent_id ?? null,
        de: { externalId: deId, nome: v?.from?.username ?? null },
        texto: t,
        timestamp: tsEntry,
        proprio: deId === canalExternalId,
      })
    }

    
    for (const m of Array.isArray(entry.messaging) ? entry.messaging : []) {
      const msg = (m as { message?: Record<string, unknown> }).message
      if (!msg) continue 
      const mid = typeof msg.mid === 'string' ? msg.mid : ''
      const t = texto(msg.text)
      if (!mid || !t) continue
      const eco = msg.is_echo === true
      
      
      
      
      const sender = (m as { sender?: { id?: string } }).sender?.id
      const recipient = (m as { recipient?: { id?: string } }).recipient?.id
      const contraparte = eco ? recipient : sender
      if (!contraparte) continue
      const story = (msg.reply_to as { story?: { id?: string } } | undefined)?.story?.id
      out.push({
        kind: 'mensagem',
        canalExternalId,
        contato: { externalId: contraparte, nome: '' },
        externalId: mid,
        timestamp: paraIso((m as { timestamp?: number }).timestamp, tsEntry),
        texto: t,
        midia: null,
        origem: eco ? 'proprio' : 'contato',
        ...(story ? { origemStory: { storyId: story } } : {}),
      })
    }
  }
  return out
}
