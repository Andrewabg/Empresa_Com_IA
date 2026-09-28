
export const LIMIAR_OUTRO_PROJETO = 300

const numero = (n: number) => n.toLocaleString('pt-BR')

export function avisoDeOutroProjeto(
  diferencas: { added: readonly string[]; removed: readonly string[] },
  branchDoBackup: string,
): string | null {
  const estranhos = diferencas.added.length
  const faltando = diferencas.removed.length
  if (estranhos < LIMIAR_OUTRO_PROJETO && faltando < LIMIAR_OUTRO_PROJETO) return null
  const partes: string[] = []
  if (estranhos >= LIMIAR_OUTRO_PROJETO) partes.push(`tem ${numero(estranhos)} arquivos que o Empresa IA não entrega`)
  if (faltando >= LIMIAR_OUTRO_PROJETO) partes.push(`não tem ${numero(faltando)} arquivos do Empresa IA`)
  return (
    `Atenção: este repositório ${partes.join(' e ')}. Parece que há outro projeto nele, ou que o ` +
    'repositório configurado não é o do Empresa IA. Atualizar vai deixar nele só o Empresa IA; o ' +
    `que existe hoje fica salvo no branch ${branchDoBackup}. Se não era isso, cancele e confira o ` +
    'repositório em Configuração antes.'
  )
}
