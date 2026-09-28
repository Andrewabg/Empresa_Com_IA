

export type ConflitoTelegram = 'webhook' | 'outro_leitor' | null


export function classificarConflito(erro: string | null | undefined): ConflitoTelegram {
  const t = String(erro ?? '')
  if (!t) return null
  if (/webhook/i.test(t)) return 'webhook'
  if (/conflict|terminated by other|other getupdates/i.test(t)) return 'outro_leitor'
  return null
}


export function explicarConflito(erro: string | null | undefined): string | null {
  switch (classificarConflito(erro)) {
    case 'webhook':
      return 'Havia um webhook apontado para este bot, o que impede a leitura das mensagens. Já desfiz isso sozinho; se a leitura não voltar em cerca de um minuto, reinicie o aplicativo.'
    case 'outro_leitor':
      return 'Este mesmo bot está sendo lido por outra instalação. O Telegram entrega as mensagens para um leitor só, então um dos dois fica mudo. Crie um bot novo no BotFather para esta empresa e cole o token dele aqui.'
    default:
      return null
  }
}
