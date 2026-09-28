






import { formaDeLeitura } from '@/lib/fontes/formaDeLeitura'
import { renderTabela } from '@/lib/bancada/renderTabela'
import { esquemaDaBancada, mensagemDeErroSql } from '@/lib/bancada/esquema'
import { neutralizarCerca } from '@/lib/cercaDoPrompt'
import {
  AVISO_HISTORICO_CORTADO, AVISO_SAIDA_CORTADA, AVISO_SEM_HISTORICO, GUARDA_DA_BANCADA,
  RECUSA_BANCADA_OCUPADA, RECUSA_CONSULTA_INTERROMPIDA, RECUSA_CONSULTA_PESADA,
  RECUSA_FORMA_DA_CONSULTA, RECUSA_TETO_DE_CALCULOS, dicaDeForma,
} from '@/lib/bancada/mensagens'
import { ERRO_INTERROMPIDO, ERRO_PRAZO, HEAP_DA_BANCADA, TETO_LINHAS_DA_SAIDA } from '@/lib/bancada/tipos'
import { rodarNaBancada as rodarDefault } from '@/server/bancada/rodarNaBancada'
import { comVagaNaBancada as comVagaDefault, BancadaOcupada } from '@/server/bancada/semaforo'
import { obterBancada as obterDefault } from '@/server/bancada/bancadaDoTurno'
import { obterInvestigacao as obterInvestigacaoDefault, reservarCalculo as reservarCalculoDefault } from '@/server/bancada/investigacaoDoTurno'
import { carregarHistorico as carregarDefault } from '@/server/bancada/carregarHistorico'
import { registrarCalculo, registrarFirme } from '@/lib/trafego/graph/ledger'

export interface CalcularInput { sql: string; porque?: string; conclusaoParcial?: string }
export interface CalcularCtx { operatorId?: string; hojeISO: string }
export interface CalcularDeps {
  rodar?: typeof rodarDefault
  comVaga?: typeof comVagaDefault
  carregarHistorico?: (b: ReturnType<typeof obterDefault>, ctx: CalcularCtx) => Promise<{ historico: number; cortou: boolean; normal: number }>
  obterBancada?: typeof obterDefault
  obterInvestigacao?: typeof obterInvestigacaoDefault
  reservarCalculo?: typeof reservarCalculoDefault
  abortSignal?: AbortSignal
}

function cercar(corpo: string): string {
  return `${GUARDA_DA_BANCADA}\n«bancada»\n${corpo}\n«/bancada»`
}


function comGuarda(texto: string): string {
  return `${GUARDA_DA_BANCADA}\n${texto}`
}

export async function calcular(input: CalcularInput, ctx: CalcularCtx, deps: CalcularDeps = {}): Promise<{ output: string }> {
  const forma = formaDeLeitura(String(input.sql ?? ''))
  if (forma.motivo !== null) return { output: `${RECUSA_FORMA_DA_CONSULTA}\n${dicaDeForma(forma.motivo)}` }

  const bancada = (deps.obterBancada ?? obterDefault)()
  const inv = (deps.obterInvestigacao ?? obterInvestigacaoDefault)()
  
  
  
  if (input.conclusaoParcial) registrarFirme(inv.ledger, String(input.conclusaoParcial))
  
  
  
  if (!(deps.reservarCalculo ?? reservarCalculoDefault)(inv)) {
    return { output: comGuarda(RECUSA_TETO_DE_CALCULOS) }
  }
  const carregar = deps.carregarHistorico ?? ((b, c) => carregarDefault(b, c))
  let hist: { historico: number; cortou: boolean; normal: number }
  try {
    hist = await carregar(bancada, ctx)
  } catch {
    hist = { historico: 0, cortou: false, normal: 0 }
  }
  const avisos: string[] = []
  if (hist.historico === 0) avisos.push(AVISO_SEM_HISTORICO)
  if (hist.cortou) avisos.push(AVISO_HISTORICO_CORTADO)

  const rodar = deps.rodar ?? rodarDefault
  const comVaga = deps.comVaga ?? comVagaDefault
  let saida
  try {
    saida = await comVaga(() => rodar({
      tabelas: [...bancada.tabelas.values()],
      sql: forma.limpo,
      tetoLinhas: TETO_LINHAS_DA_SAIDA,
      heapBytes: HEAP_DA_BANCADA,
    }, { signal: deps.abortSignal }))
  } catch (e) {
    if (e instanceof BancadaOcupada) return { output: comGuarda([RECUSA_BANCADA_OCUPADA, ...avisos].join('\n')) }
    return { output: comGuarda([mensagemDeErroSql(e instanceof Error ? e.message : String(e), esquemaDaBancada(bancada)), ...avisos].join('\n')) }
  }

  if (!saida.ok) {
    if (saida.erro === ERRO_PRAZO) return { output: comGuarda([RECUSA_CONSULTA_PESADA, ...avisos].join('\n')) }
    
    if (saida.erro === ERRO_INTERROMPIDO) return { output: comGuarda([RECUSA_CONSULTA_INTERROMPIDA, ...avisos].join('\n')) }
    return { output: comGuarda([mensagemDeErroSql(saida.erro, esquemaDaBancada(bancada)), ...avisos].join('\n')) }
  }

  const porque = input.porque ? String(input.porque) : ''
  registrarCalculo(inv.ledger, { porque, colunas: saida.colunas, linhas: saida.linhas, total: saida.linhas.length }, Date.now())

  const r = renderTabela(saida.colunas, saida.linhas)
  const cabecalho = [
    input.porque ? `Cálculo: ${neutralizarCerca(String(input.porque)).replace(/\s+/g, ' ').trim().slice(0, 120)}` : null,
    `${saida.linhas.length}${saida.cortou ? '+' : ''} linhas${r.linhasMostradas < saida.linhas.length || saida.cortou ? `, mostrando ${r.linhasMostradas}` : ''}, ${saida.ms} ms`,
    ...avisos,
    (r.cortouLinhas || r.cortouChars || saida.cortou) ? AVISO_SAIDA_CORTADA : null,
  ].filter((s): s is string => Boolean(s)).join('\n')
  return { output: cercar(`${cabecalho}\n${r.texto}`) }
}
