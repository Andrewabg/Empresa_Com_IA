


export const FERRAMENTAS_SEM_TERCEIRO: ReadonlySet<string> = new Set([
  
  
  'ajustarNotificacoes',
  'gerenciarLembretes',
  'gerenciarRotinas',
  'vigiar',
  
  'proporMemoria',
  'rascunharMemoria',
  'registrarConhecimento',
  'registrarEntrevista',
  'adiarEntrevista',
  'registrarDiretriz',
  'anotarAprendizado',
  'ajustarEstilo',
  'proporConhecimentoAtendimento',
  
  'contratarAgente',
  'delegarTarefa',
  'planejarObjetivo',
  'detalharFuncionario',
  'transferir',
  
  'emitirArtefato',
  'gerarImagem',
  
  
  'pedirCriativo',
  'pedirCopy',
  'anotarMemoriaConta',
  
  'pedirArte',
  'produzirArtesDaCampanha',
])


export function ferramentaIngereTerceiro(nome: string | undefined | null): boolean {
  if (!nome) return true
  return !FERRAMENTAS_SEM_TERCEIRO.has(nome)
}


const FONTE_DE_FORA = 'import'


export interface NotaParaProcedencia {
  origem?: 'nota' | 'episodic'
  fonte?: string | null
}


export function notaTrazTerceiro(nota: NotaParaProcedencia): boolean {
  if (nota.origem === 'episodic') return false
  if (nota.fonte === undefined) return true
  if (nota.fonte === null) return false
  return nota.fonte
    .split(';')
    .map((parte) => parte.trim().toLowerCase())
    .some((parte) => parte === FONTE_DE_FORA || parte.startsWith(`${FONTE_DE_FORA}:`))
}


export function algumaNotaTrazTerceiro(notas: readonly NotaParaProcedencia[] | undefined): boolean {
  return !!notas?.some(notaTrazTerceiro)
}
