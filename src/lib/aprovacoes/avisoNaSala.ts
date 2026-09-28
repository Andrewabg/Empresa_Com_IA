


export const AVISO_PLANO_ESPERANDO = 'O plano ficou pronto e está esperando a sua aprovação.'


const ONDE_RESOLVER = 'Abra Aprovações no menu para ver as etapas e decidir. Nada começa a rodar antes disso.'


export function avisoDePlanoEsperando(objetivo?: string | null): string {
  const o = (objetivo ?? '').trim()
  if (!o) return `${AVISO_PLANO_ESPERANDO} ${ONDE_RESOLVER}`
  const curto = o.length > 120 ? `${o.slice(0, 120).trimEnd()}…` : o
  return `${AVISO_PLANO_ESPERANDO} Ele é sobre: "${curto}". ${ONDE_RESOLVER}`
}
