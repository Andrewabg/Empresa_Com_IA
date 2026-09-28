// custom/saida/index.ts — revisa o texto do agente ANTES de ele sair para o cliente.
// Vale para os canais de atendimento (WhatsApp, Instagram), nos dois modos.
// Exemplo completo em custom/CLAUDE.md. Pra zerar: deixe `null` (NÃO delete o arquivo).
import { type RevisorDeSaida } from '@/server/custom/contrato'

// Exemplo (descomente e ajuste):
//
// import { definirRevisorDeSaida } from '@/server/custom/contrato'
//
// export const SAIDA = definirRevisorDeSaida({
//   async revisar(texto, ctx) {
//     if (ctx.mensagemDoCliente.toLowerCase().includes('hipertens')) {
//       return { texto: 'Para a sua segurança, um instrutor vai falar com você.' }
//     }
//     return null
//   },
// })

export const SAIDA: RevisorDeSaida | null = null
