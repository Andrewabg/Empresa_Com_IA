
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getCanalDoInstagram } from '@/server/instagram/canalDoInstagram'
import { instagramSpec } from '@/server/canais/registry'
import { GRAPH_BASE } from '@/server/canais/providers/whatsappCloud'
import { enderecoDeMidiaConfiavel } from '@/lib/instagram/enderecoDeMidia'

const CAMPOS = 'id,permalink,media_type,thumbnail_url,media_url,caption,timestamp'

export async function GET(): Promise<Response> {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  
  
  
  
  try {
    const canal = await getCanalDoInstagram()
    if (!canal) return Response.json({ midias: [], conectado: false })

    const { accessToken, igUserId } = await instagramSpec.resolverCreds(canal)
    if (!accessToken || !igUserId) return Response.json({ midias: [], conectado: false })

    const url = `${GRAPH_BASE}/${igUserId}/media?fields=${CAMPOS}&limit=50`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    
    
    
    if (!res.ok) return Response.json({ midias: [], conectado: true, falhou: true })
    const j = (await res.json()) as {
      data?: Array<{
        id?: string; permalink?: string; media_type?: string
        thumbnail_url?: string | null; media_url?: string | null
        caption?: string | null; timestamp?: string
      }>
    }
    const midias = (j.data ?? [])
      .filter((m) => m.id)
      .map((m) => ({
        id: m.id!,
        
        
        
        permalink: enderecoDeMidiaConfiavel(m.permalink) ?? '',
        
        thumbUrl: enderecoDeMidiaConfiavel(m.thumbnail_url ?? m.media_url),
        legenda: m.caption ?? null,
        tipo: m.media_type ?? 'IMAGE',
        publicadoEm: m.timestamp ?? null,
      }))
    return Response.json({ midias, conectado: true })
  } catch {
    return Response.json({ midias: [], conectado: true, falhou: true })
  }
}
