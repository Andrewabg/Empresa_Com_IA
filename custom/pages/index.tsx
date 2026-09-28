// custom/pages/index.tsx — SUAS telas. Cada uma abre em /c/<slug> (com o menu lateral).
// NUNCA delete este arquivo — esvazie o array.
import type { PaginaCustom } from '@/server/custom/contrato'

// Exemplo (descomente, adapte e adicione ao array PAGINAS):
//
// import { definirPaginaCustom } from '@/server/custom/contrato'
//
// function MinhaTela() {
//   return <div className="p-8">Olá! Esta tela é sua — abre em /c/minha-tela.</div>
// }
//
// const minhaTela = definirPaginaCustom({
//   slug: 'minha-tela',
//   titulo: 'Minha tela',
//   Componente: MinhaTela,
// })

export const PAGINAS: PaginaCustom[] = []
