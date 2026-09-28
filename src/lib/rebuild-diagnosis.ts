

export interface RebuildFailureInput {
  diverged: boolean
  migrationsAuto: boolean
  target: string
  
  publicado?: boolean
}


const NAO_PUBLICADO =
  'A reconstrução terminou na versão de antes porque esta atualização ainda não chegou ao seu GitHub. ' +
  'Confira o acesso ao GitHub em Configuração, na aba Essenciais, e use o botão Atualizar. ' +
  'Acionar o deploy sozinho reconstrói sempre a versão que já está no repositório.'

export function diagnoseRebuildFailure({ diverged, migrationsAuto, target, publicado }: RebuildFailureInput): string {
  
  
  if (publicado === false) return NAO_PUBLICADO
  if (diverged) {
    return `O container novo não subiu. Causa provável: as modificações que você fez no código ` +
      `(salvamos um backup no branch awave-backup/pre-${target}). Você pode voltar pra versão anterior.`
  }
  if (migrationsAuto) {
    return `O container novo não subiu. Causa provável: uma migration nova colidiu com o banco ` +
      `(alguma mudança manual?). Você pode voltar pra versão anterior.`
  }
  return `A reconstrução não terminou no tempo esperado (o app continua no ar na versão de antes). O código já foi publicado no seu GitHub, então na maioria das vezes basta acionar o deploy de novo aqui no botão abaixo. Se insistir: um erro de build em código que você criou em custom/ é a causa mais comum, e o webhook de deploy também vale conferir.`
}
