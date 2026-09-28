


export const ROTULO_POR_TOOL: Readonly<Record<string, string>> = {
  buscarCerebro: 'CONSULTANDO O CÉREBRO…',
  rascunharMemoria: 'ANOTANDO…',
  consultarFuncionario: 'FALANDO COM A EQUIPE…',
  delegarTarefa: 'PASSANDO PARA A EQUIPE…',
  buscarMetricasTrafego: 'PUXANDO OS NÚMEROS…',
  
  
  
  consultarMeta: 'LENDO A META…',
  calcular: 'CRUZANDO OS NÚMEROS…',
  gerarRelatorio: 'PUXANDO OS NÚMEROS…',
  gerarImagem: 'CRIANDO A ARTE…',
  gerarPeca: 'ESCREVENDO…',
  gerarCriativo: 'ESCREVENDO…',
  gerarContrato: 'NO CONTRATO…',
  analisarContrato: 'LENDO O CONTRATO…',
}


export const ROTULO_GENERICO = 'TRABALHANDO…'


export function rotuloDoTrabalho(tool: string): string {
  const limpo = tool.trim()
  if (!limpo) return ROTULO_GENERICO
  return ROTULO_POR_TOOL[limpo] ?? ROTULO_GENERICO
}
