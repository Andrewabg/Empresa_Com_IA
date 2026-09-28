


const MOSTRAR = 3


export function avisoDeNotasIgnoradas(caminhos: readonly string[]): string {
  if (caminhos.length === 0) return ''
  const nomeados = caminhos.slice(0, MOSTRAR).join(', ')
  const restantes = caminhos.length - MOSTRAR
  const lista = restantes > 0 ? `${nomeados} e mais ${restantes}` : nomeados
  const um = caminhos.length === 1
  const quantos = um
    ? '1 arquivo do seu Cérebro não pôde ser lido e ficou de fora do que os agentes sabem'
    : `${caminhos.length} arquivos do seu Cérebro não puderam ser lidos e ficaram de fora do que os agentes sabem`
  const abra = um ? 'Abra ele no GitHub' : 'Abra cada um no GitHub'
  return `${quantos}: ${lista}. ${abra} e confira o bloco de informações do topo, entre as linhas de três tracinhos. Título com dois pontos precisa de aspas.`
}
