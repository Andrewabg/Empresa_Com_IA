// custom/tools/index.ts — SUAS tools de agente. Registre aqui; ligue por agente em /agentes.
// Exemplo completo no custom/CLAUDE.md. NUNCA delete este arquivo — esvazie o array.
import type { ToolCustom } from '@/server/custom/contrato'

// Exemplo (descomente, adapte e adicione ao array TOOLS):
//
// import { z } from 'zod'
// import { definirToolCustom } from '@/server/custom/contrato'
//
// const consultarEstoque = definirToolCustom({
//   id: 'consultar_estoque',
//   titulo: 'Consultar estoque',
//   descricao: 'Use quando o usuário perguntar quantas unidades de um produto existem em estoque.',
//   inputSchema: z.object({ sku: z.string().describe('Código do produto') }),
//   execute: async (ctx, input) => {
//     const { sku } = input // já tipado a partir do inputSchema (sem cast)
//     const { data } = await ctx.db().from('meu_estoque').select('quantidade').eq('sku', sku).maybeSingle()
//     return { sku, quantidade: data?.quantidade ?? 0 }
//   },
// })

export const TOOLS: ToolCustom[] = []
