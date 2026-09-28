// custom/rotinas/index.ts — SUAS rotinas periódicas (polling/sync). Rodam no heartbeat.
// Exemplo completo em custom/CLAUDE.md. Pra zerar: deixe o array vazio (NÃO delete o arquivo).
import { type RotinaCustom } from '@/server/custom/contrato'

// Exemplo (descomente e ajuste):
//
// import { definirRotinaCustom } from '@/server/custom/contrato'
//
// const syncCrm = definirRotinaCustom({
//   id: 'sync_crm',
//   cadaMinutos: 30,
//   executar: async (ctx) => {
//     const key = await ctx.getSecret('custom_crm_key')
//     // fetch no CRM com `key`, gravar em ctx.db()...
//   },
// })

export const ROTINAS: RotinaCustom[] = []
