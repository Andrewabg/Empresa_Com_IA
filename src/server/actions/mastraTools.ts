

import { MastraProvider } from '@composio/mastra'
import type { Tool, ExecuteToolFn } from '@composio/core'
import { listAvailableActions, runAction } from './actions'
import { getComposioClient, type ComposioClient } from './composio'
import { getTurnContext } from '../agent/turnContext'
import { COMPOSIO_TOOLS_LIMIT } from '@/lib/toolkit-gating'






const WRAP_TTL_MS = 60_000





const WRAP_MAX_ENTRADAS = 64
const _wrapCache = new Map<string, { tools: Record<string, unknown>; expiresAt: number }>()

export function invalidateComposioToolsCache(): void { _wrapCache.clear() }


function wrapCacheKey(userId: string, toolkits?: string[] | null, limit?: number): string {
  const norm = (toolkits && toolkits.length)
    ? [...new Set(toolkits.map((t) => t.toLowerCase()))].sort().join(',')
    : '*'
  return `${userId}::${norm}::${limit ?? ''}`
}

export async function buildComposioMastraTools(
  ctx: { userId: string; toolkits?: string[] | null; limit?: number },
  composio?: ComposioClient | null,
  makeExecuteFn?: (toolkitBySlug: Map<string, string>) => ExecuteToolFn,
): Promise<Record<string, unknown>> {
  const useDefault = composio === undefined
  const limit = ctx.limit ?? COMPOSIO_TOOLS_LIMIT
  const key = wrapCacheKey(ctx.userId, ctx.toolkits, limit)
  
  const memo = _wrapCache.get(key)
  if (useDefault && makeExecuteFn === undefined && memo && memo.expiresAt > Date.now()) {
    _wrapCache.delete(key)
    _wrapCache.set(key, memo)
    return memo.tools
  }

  const c = useDefault ? await getComposioClient() : composio
  if (!c) return {}   

  
  
  
  
  const raw = await listAvailableActions({ userId: ctx.userId, limit, toolkits: ctx.toolkits }, c)

  
  let tools: Record<string, unknown> = {}
  if (raw.length > 0) {
    const provider = new MastraProvider()
    
    
    
    
    
    
    
    
    
    
    
    
    const toolkitBySlug = new Map<string, string>()
    for (const t of raw as Tool[]) if (t.toolkit?.slug) toolkitBySlug.set(t.slug, t.toolkit.slug)
    const executeFn = makeExecuteFn
      ? makeExecuteFn(toolkitBySlug)
      : (async (toolSlug: string, input: Record<string, unknown>) => {
          
          
          const turno = getTurnContext()
          return runAction(
            { slug: toolSlug, args: input ?? {}, userId: ctx.userId, agent: turno.actingAgentId ?? 'jarvis', conversationId: turno.conversationId ?? null },
            c,
          )
        }) as ExecuteToolFn
    
    
    
    
    
    
    
    
    
    
    const rawForWrap = (raw as Tool[]).map((t) => ({ ...t, outputParameters: undefined }))
    
    tools = provider.wrapTools(rawForWrap as Tool[], executeFn) as unknown as Record<string, unknown>
  }

  
  
  
  
  
  
  
  
  if (useDefault && makeExecuteFn === undefined && raw.length > 0) {
    _wrapCache.delete(key) 
    _wrapCache.set(key, { tools, expiresAt: Date.now() + WRAP_TTL_MS })
    if (_wrapCache.size > WRAP_MAX_ENTRADAS) {
      const maisAntiga = _wrapCache.keys().next().value
      if (maisAntiga !== undefined) _wrapCache.delete(maisAntiga)
    }
  }
  return tools
}
