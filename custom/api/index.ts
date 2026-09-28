// custom/api/index.ts — SEUS endpoints. Cada um atende /api/c/<slug> (autenticado como operador).
// NUNCA delete este arquivo — esvazie o array.
import type { ApiCustom } from '@/server/custom/contrato'

// Exemplo (descomente, adapte e adicione ao array APIS):
//
// import { definirApiCustom } from '@/server/custom/contrato'
//
// const ping = definirApiCustom({
//   slug: 'ping',
//   GET: async (_req, ctx) => {
//     const nome = await ctx.getSetting('company_name')
//     return Response.json({ ok: true, empresa: nome })
//   },
// })

export const APIS: ApiCustom[] = []
