// custom/webhooks/index.ts — SEUS webhooks de entrada. Cada um atende /api/hooks/<slug>.
// O core recebe, verifica a assinatura, responde 200 e processa async no heartbeat.
// Exemplo completo em custom/CLAUDE.md. Pra zerar: deixe o array vazio (NÃO delete o arquivo).
import { type WebhookCustom } from '@/server/custom/contrato'

// Exemplo (descomente e ajuste):
//
// import { definirWebhookCustom } from '@/server/custom/contrato'
//
// const vendas = definirWebhookCustom({
//   slug: 'vendas',
//   auth: { tipo: 'token', em: 'query', param: 'hottok', segredo: 'custom_hotmart_hottok' },
//   dedupDe: 'body.data.purchase.transaction',
//   processar: async (evento, ctx) => {
//     const b = evento.body as { event?: string; data?: { buyer?: { name?: string } } }
//     if (b.event !== 'PURCHASE_APPROVED') return
//     await ctx.acoes.notificar({ titulo: 'Venda nova', corpo: `${b.data?.buyer?.name} comprou.` })
//   },
// })

export const WEBHOOKS: WebhookCustom[] = []
