

import { serverDb } from '@/server/supabase'
import { carregarGrafoFk } from '@/server/reset/fkGraph'
import { planDeletion } from '@/lib/reset/plan'
import type { ResetFlags } from '@/lib/reset/tipos'
import {
  BYO_SECRET_KEYS,
  UAZAPI_ADMIN_TOKEN,
  uazapiTokenKey,
  uazapiWebhookSecretKey,
  deleteSecret,
  invalidateSecretsCache,
} from '@/server/secrets'
import { invalidateCompanyProfileCache, releaseSetting } from '@/data/settings'
import { CATALOG_CACHE_KEY } from '@/server/catalog/cache'
import { epochCerebro } from '@/server/reset/epochCerebro'


export async function executarReset(
  flags: ResetFlags,
): Promise<{ apagado: Record<string, number> }> {
  const db = serverDb()

  
  const grafo = await carregarGrafoFk()
  const plano = planDeletion(grafo, flags)
  const efetivas = new Set(plano.categoriasEfetivas)

  
  
  
  
  let canaisAntes: { id: string }[] = []
  if (efetivas.has('credenciais') || efetivas.has('agentes')) {
    const { data, error } = await db.from('canais').select('id')
    if (error) {
      console.warn('[executarReset] Nao foi possivel listar canais (continuando):', error.message)
    } else {
      canaisAntes = (data ?? []).map((r) => ({ id: r.id as string }))
    }
  }

  
  
  
  
  let fontesAntes: { id: string; secret_ref: string }[] = []
  if (efetivas.has('credenciais')) {
    const { data, error } = await db.from('fontes').select('id, secret_ref')
    if (error) {
      console.warn('[executarReset] Nao foi possivel listar fontes (continuando):', error.message)
    } else {
      fontesAntes = (data ?? []) as { id: string; secret_ref: string }[]
    }
  }

  
  
  
  
  
  if (efetivas.has('cerebro')) {
    try {
      const resultado = await epochCerebro()
      if (resultado.ok) {
        console.log(`[executarReset] epoch Cerebro ok — ${resultado.removed} nota(s) removida(s)${resultado.reason ? ` (${resultado.reason})` : ''}`)
      } else {
        console.warn(`[executarReset] epoch Cerebro falhou (nao-fatal): ${resultado.reason ?? 'desconhecido'}`)
      }
    } catch (err) {
      
      console.warn('[executarReset] epochCerebro lancou inesperadamente (nao-fatal):', err)
    }
  }

  
  const { data, error } = await db.rpc('factory_reset', { p_ops: plano.ops })
  if (error) {
    throw new Error(`[executarReset] factory_reset falhou: ${error.message}`)
  }
  const apagado = (data ?? {}) as Record<string, number>

  
  const tentativas: Promise<void>[] = []

  
  if (efetivas.has('credenciais')) {
    
    for (const key of BYO_SECRET_KEYS) {
      tentativas.push(
        deleteSecret(key).catch((e) =>
          console.warn(`[executarReset] deleteSecret(${key}) falhou:`, e),
        ),
      )
    }

    
    tentativas.push(
      deleteSecret(UAZAPI_ADMIN_TOKEN).catch((e) =>
        console.warn('[executarReset] deleteSecret(uazapi_admin_token) falhou:', e),
      ),
    )
  }

  
  
  
  
  if (canaisAntes.length > 0) {
    let sobreviventes: string[] = []
    const { data: dataApos, error: erroApos } = await db.from('canais').select('id')
    if (erroApos) {
      console.warn('[executarReset] Nao foi possivel re-listar canais (continuando):', erroApos.message)
    } else {
      sobreviventes = (dataApos ?? []).map((r) => r.id as string)
    }
    const sobreviventesSet = new Set(sobreviventes)
    const apagados = canaisAntes.filter((c) => !sobreviventesSet.has(c.id))

    for (const { id } of apagados) {
      tentativas.push(
        deleteSecret(uazapiTokenKey(id)).catch((e) =>
          console.warn(`[executarReset] deleteSecret(uazapi_token_${id}) falhou:`, e),
        ),
      )
      tentativas.push(
        deleteSecret(uazapiWebhookSecretKey(id)).catch((e) =>
          console.warn(`[executarReset] deleteSecret(uazapi_webhook_secret_${id}) falhou:`, e),
        ),
      )
    }
  }

  
  if (fontesAntes.length > 0) {
    let sobreviventes = new Set<string>()
    const { data: fontesApos, error: erroFontes } = await db.from('fontes').select('id')
    if (erroFontes) {
      console.warn('[executarReset] Nao foi possivel reconferir fontes (continuando):', erroFontes.message)
    } else {
      sobreviventes = new Set((fontesApos ?? []).map((r) => r.id as string))
    }
    for (const f of fontesAntes) {
      if (sobreviventes.has(f.id)) continue
      tentativas.push(
        deleteSecret(f.secret_ref).catch((e) =>
          console.warn(`[executarReset] deleteSecret(${f.secret_ref}) falhou:`, e),
        ),
      )
    }
  }

  if (tentativas.length > 0) {
    await Promise.allSettled(tentativas)
  }

  
  try {
    invalidateSecretsCache()
  } catch (e) {
    console.warn('[executarReset] invalidateSecretsCache falhou:', e)
  }
  try {
    invalidateCompanyProfileCache()
  } catch (e) {
    console.warn('[executarReset] invalidateCompanyProfileCache falhou:', e)
  }
  
  
  if (efetivas.has('credenciais') || efetivas.has('identidade')) {
    try { await releaseSetting(CATALOG_CACHE_KEY) } catch (e) { console.warn('[executarReset] limpeza catalog_cache falhou:', e) }
  }

  return { apagado }
}
