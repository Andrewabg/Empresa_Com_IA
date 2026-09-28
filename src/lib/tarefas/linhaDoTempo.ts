

export type StatusTarefa =
  | 'queued' | 'running' | 'needs_approval' | 'needs_children' | 'done' | 'failed' | 'cancelled'

const TERMINAIS: ReadonlySet<StatusTarefa> = new Set<StatusTarefa>(['done', 'failed', 'cancelled'])

export interface TarefaCrua {
  id: string
  objective: string
  status: StatusTarefa
  agent_id: string
  parent_task_id: string | null
  plan_id: string | null
  approval_id: string | null
  created_at: string
  updated_at: string
  
  result?: string | null
}

export interface TransicaoCrua {
  task_id: string
  de: StatusTarefa | null
  para: StatusTarefa
  motivo: string | null
  agent_id: string | null
  at: string
}

export interface PassoDaLinha {
  de: StatusTarefa | null
  para: StatusTarefa
  motivo: string | null
  em: string
  
  desdeMs: number | null
}


export interface ResumoDoResultado {
  texto: string
  truncado: boolean
}

export interface NoDaArvore {
  id: string
  objetivo: string
  status: StatusTarefa
  agenteId: string
  aprovacaoId: string | null
  
  duracaoMs: number | null
  linha: PassoDaLinha[]
  
  resultado: ResumoDoResultado | null
  filhos: NoDaArvore[]
}

export interface ArvoreDaTarefa {
  raiz: NoDaArvore
  
  travadoEm: string | null
}


const ORDEM_DE_TRAVA: readonly StatusTarefa[] = ['failed', 'needs_approval', 'running']

export function montarArvore(
  tarefas: TarefaCrua[],
  transicoes: TransicaoCrua[],
  agoraMs: number,
): ArvoreDaTarefa | null {
  if (tarefas.length === 0) return null

  const porId = new Map(tarefas.map((t) => [t.id, t]))
  const linhasPorTarefa = new Map<string, TransicaoCrua[]>()
  for (const tr of transicoes) {
    const atual = linhasPorTarefa.get(tr.task_id)
    if (atual) atual.push(tr)
    else linhasPorTarefa.set(tr.task_id, [tr])
  }
  for (const linhas of linhasPorTarefa.values()) {
    linhas.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }

  
  const raizes = tarefas.filter((t) => !t.parent_task_id || !porId.has(t.parent_task_id))
  const raiz = raizes[0] ?? tarefas[0]

  const filhosPorPai = new Map<string, TarefaCrua[]>()
  for (const t of tarefas) {
    if (!t.parent_task_id || !porId.has(t.parent_task_id)) continue
    const atual = filhosPorPai.get(t.parent_task_id)
    if (atual) atual.push(t)
    else filhosPorPai.set(t.parent_task_id, [t])
  }
  for (const lista of filhosPorPai.values()) {
    lista.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  }

  
  
  const visitados = new Set<string>()
  function montarNo(t: TarefaCrua): NoDaArvore {
    visitados.add(t.id)
    const linhas = linhasPorTarefa.get(t.id) ?? []
    const linha: PassoDaLinha[] = linhas.map((tr, i) => ({
      de: tr.de,
      para: tr.para,
      motivo: tr.motivo,
      em: tr.at,
      desdeMs: i === 0 ? null : Date.parse(tr.at) - Date.parse(linhas[i - 1].at),
    }))
    return {
      id: t.id,
      objetivo: t.objective,
      status: t.status,
      agenteId: t.agent_id,
      aprovacaoId: t.approval_id,
      duracaoMs: duracaoDoNo(t, linhas, agoraMs),
      linha,
      resultado: resultadoDoNo(t.result ?? null),
      filhos: (filhosPorPai.get(t.id) ?? [])
        .filter((f) => !visitados.has(f.id))
        .map(montarNo),
    }
  }

  return { raiz: montarNo(raiz), travadoEm: acharTravado(tarefas) }
}


function duracaoDoNo(t: TarefaCrua, linhas: TransicaoCrua[], agoraMs: number): number | null {
  if (linhas.length === 0) return null
  const inicio = Date.parse(linhas[0].at)
  const fim = TERMINAIS.has(t.status) ? Date.parse(linhas[linhas.length - 1].at) : agoraMs
  return Math.max(0, fim - inicio)
}


export function resumoDoResultado(result: string | null, limite = 2000): ResumoDoResultado {
  const t = (result ?? '').trim()
  if (!t) return { texto: '', truncado: false }
  if (t.length <= limite) return { texto: t, truncado: false }
  return { texto: t.slice(0, limite), truncado: true }
}


function resultadoDoNo(result: string | null): ResumoDoResultado | null {
  const resumo = resumoDoResultado(result)
  return resumo.texto ? resumo : null
}


function acharTravado(tarefas: TarefaCrua[]): string | null {
  for (const status of ORDEM_DE_TRAVA) {
    const achado = tarefas.find((t) => t.status === status)
    if (achado) return achado.id
  }
  return null
}
