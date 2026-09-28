


export interface GrupoDeAviso {
  
  chave: string
  
  quantos: number
  
  rotulo: string
  
  href: string | null
}

interface Definicao {
  chave: string
  
  rotulo: (n: number) => string
  href: string | null
}


const POR_TIPO: Record<string, Definicao> = {
  anomalia_trafego: {
    chave: 'trafego',
    rotulo: (n) => (n === 1 ? '1 alerta de tráfego' : `${n} alertas de tráfego`),
    href: '/trafego',
  },
  aprovacao: {
    chave: 'aprovacao',
    rotulo: (n) => (n === 1 ? '1 aprovação esperando' : `${n} aprovações esperando`),
    href: '/aprovacoes',
  },
  tarefa_concluida: {
    chave: 'entrega',
    rotulo: (n) => (n === 1 ? '1 entrega de tarefa' : `${n} entregas de tarefa`),
    href: '/tarefas',
  },
  plano_concluido: {
    chave: 'entrega',
    rotulo: (n) => (n === 1 ? '1 entrega de tarefa' : `${n} entregas de tarefa`),
    href: '/tarefas',
  },
  tarefa_falhou: {
    chave: 'travou',
    rotulo: (n) => (n === 1 ? '1 tarefa que travou' : `${n} tarefas que travaram`),
    href: '/tarefas',
  },
  plano_falhou: {
    chave: 'travou',
    rotulo: (n) => (n === 1 ? '1 tarefa que travou' : `${n} tarefas que travaram`),
    href: '/tarefas',
  },
  atendimento_escalado: {
    chave: 'atendimento',
    rotulo: (n) => (n === 1 ? '1 atendimento na sua mão' : `${n} atendimentos na sua mão`),
    href: '/inbox',
  },
  atendimento_sem_resposta: {
    chave: 'atendimento',
    rotulo: (n) => (n === 1 ? '1 atendimento na sua mão' : `${n} atendimentos na sua mão`),
    href: '/inbox',
  },
  canal_desconectado: {
    chave: 'canal',
    rotulo: (n) => (n === 1 ? '1 canal fora do ar' : `${n} canais fora do ar`),
    href: '/config#canais',
  },
  canal_qualidade_ruim: {
    chave: 'canal',
    rotulo: (n) => (n === 1 ? '1 canal fora do ar' : `${n} canais fora do ar`),
    href: '/config#canais',
  },
  instagram_conexao: {
    chave: 'canal',
    rotulo: (n) => (n === 1 ? '1 canal fora do ar' : `${n} canais fora do ar`),
    href: '/config#canais',
  },
  memoria_escalada: {
    chave: 'cerebro',
    rotulo: (n) => (n === 1 ? '1 pendência no Cérebro' : `${n} pendências no Cérebro`),
    href: '/cerebro',
  },
  lint_acervo: {
    chave: 'cerebro',
    rotulo: (n) => (n === 1 ? '1 pendência no Cérebro' : `${n} pendências no Cérebro`),
    href: '/cerebro',
  },
  
  
  
  lembrete: {
    chave: 'lembrete',
    rotulo: (n) => (n === 1 ? '1 lembrete marcado' : `${n} lembretes marcados`),
    href: null,
  },
}

const OUTROS: Definicao = {
  chave: 'outros',
  rotulo: (n) => (n === 1 ? '1 outro aviso' : `${n} outros avisos`),
  href: null,
}


export const TETO_GRUPOS_NO_PAINEL = 4


export function agruparAvisos(tipos: readonly string[]): GrupoDeAviso[] {
  const contagem = new Map<string, { def: Definicao; quantos: number }>()
  for (const t of tipos) {
    const def = POR_TIPO[t] ?? OUTROS
    const atual = contagem.get(def.chave)
    if (atual) atual.quantos += 1
    else contagem.set(def.chave, { def, quantos: 1 })
  }
  return [...contagem.values()]
    .sort((a, b) => b.quantos - a.quantos || a.def.chave.localeCompare(b.def.chave))
    .map(({ def, quantos }) => ({
      chave: def.chave,
      quantos,
      rotulo: def.rotulo(quantos),
      href: def.href,
    }))
}


export function gruposParaOPainel(
  grupos: readonly GrupoDeAviso[],
  teto: number = TETO_GRUPOS_NO_PAINEL,
): { mostrados: GrupoDeAviso[]; restantes: number } {
  const limite = Number.isFinite(teto) && teto > 0 ? Math.floor(teto) : 0
  const mostrados = grupos.slice(0, limite)
  const restantes = grupos.slice(limite).reduce((s, g) => s + g.quantos, 0)
  return { mostrados, restantes }
}


export function restantesNoPainel(restantes: number): string {
  if (!Number.isFinite(restantes) || restantes <= 0) return ''
  return restantes === 1
    ? 'E mais 1 aviso de outro assunto.'
    : `E mais ${restantes} avisos de outros assuntos.`
}
