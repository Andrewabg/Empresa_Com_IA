


export const MAX_FALAS_DO_DONO = 10

type Parte = { type?: string; text?: string }
type Mensagem = { role?: string; content?: unknown }


function textoDaMensagem(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as Parte[])
      .filter((p) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join(' ')
  }
  return ''
}


export function falasDoDonoDasMensagens(mensagens: unknown): string[] {
  if (!Array.isArray(mensagens)) return []
  const falas = (mensagens as Mensagem[])
    .filter((m) => m && typeof m === 'object' && m.role === 'user')
    .map((m) => textoDaMensagem(m.content).trim())
    .filter(Boolean)
  return falas.slice(-MAX_FALAS_DO_DONO)
}
