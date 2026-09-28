
import { neutralizarCerca } from '@/lib/cercaDoPrompt'


export const LIMITE_MOTIVO = 400


export const INSTRUCAO_IGNORADO =
  'O Curador não guardou esta memória. Diga ao dono exatamente o motivo acima, com suas palavras. ' +
  'NÃO invente outra explicação, NÃO diga que só o Curador pode editar e NÃO diga que a memória foi salva. ' +
  'Se ele quiser mudar uma nota que já existe, o caminho é abrir /cerebro, escolher a nota e usar Editar.'


export const IGNORADO_SEM_MOTIVO = 'Nada novo a salvar: já estava coberto.'


export function motivoDoCurador(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const limpo = neutralizarCerca(raw).replace(/\s+/g, ' ').trim()
  return limpo ? limpo.slice(0, LIMITE_MOTIVO) : null
}

export interface ResultadoIgnorado {
  status: 'ignored'
  motivo?: string
  instrucao: string
}


export function resultadoIgnorado(raw: string | null | undefined): ResultadoIgnorado {
  const motivo = motivoDoCurador(raw)
  return motivo
    ? { status: 'ignored', motivo, instrucao: INSTRUCAO_IGNORADO }
    : { status: 'ignored', instrucao: INSTRUCAO_IGNORADO }
}


export function textoDoIgnorado(motivo: string | null | undefined): string {
  const limpo = motivoDoCurador(motivo)
  return limpo ? `Não guardei: ${limpo}` : IGNORADO_SEM_MOTIVO
}
