







export const MSG_TAREFA_SEM_TEXTO = '(tarefa concluída sem texto)'


export const AVISO_TAREFA_SEM_RESPOSTA =
  'A tarefa terminou sem nenhuma resposta escrita, então não tenho o que te mostrar. Parte do trabalho pode já ter sido feita, então confira antes de pedir a mesma coisa outra vez.'




export function ehSocorroDeTarefa(status: string, texto: string): boolean {
  return status !== 'done' || texto === MSG_TAREFA_SEM_TEXTO
}


export function terminouSemResposta(status: string, texto: string | undefined): boolean {
  return status === 'done' && (texto ?? '').trim() === MSG_TAREFA_SEM_TEXTO
}


export const MSG_TAREFA_VAZIA =
  'A tarefa terminou sem fazer nada: o agente não escreveu nem executou nada desta vez. Como nada chegou a acontecer, pode pedir de novo.'


export const MSG_TAREFA_MODELO_MUDO =
  'A tarefa parou porque o modelo não respondeu, então nada chegou a ser feito. Assim que isso estiver resolvido, é só pedir de novo.'


export const MSG_TAREFA_SEM_ORCAMENTO =
  'Esta tarefa não rodou porque o teto de gasto do mês foi atingido. Ajuste o teto em /custo ou espere o próximo mês.'
