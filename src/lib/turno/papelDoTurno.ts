
import type { Papel } from '@/lib/equipe'

export const RECUSA_ATO_DE_DONO =
  'Isso é decisão do dono da conta. Peça para ele fazer, que eu preparo tudo antes.'


export const RECUSA_ATO_DE_DONO_AUTOMATICO =
  'Isso mexe na conta do dono e eu não faço sozinho num trabalho automático. Escreva no resultado o que ficou faltando, para ele resolver quando falar comigo.'


export type FerramentaDeDono =
  | 'ajustarNotificacoes'
  | 'gerenciarLembretes'
  | 'gerenciarRotinas'
  | 'vigiar'
  | 'pedirCriativo'
  | 'pedirCopy'
  | 'delegarTarefa'
  | 'anotarMemoriaConta'


export type MotivoDaRecusa = 'conteudo_de_fora' | 'sem_dono'

export interface RecusaDeAtoDeDono {
  ferramenta: FerramentaDeDono
  motivo: MotivoDaRecusa
}


export interface TurnoDoAtoDeDono {
  papel?: Papel
  
  terceiroIngerido?: boolean
  
  recusasSemPessoa?: RecusaDeAtoDeDono[]
}


export function podeAtoDeDono(turno: TurnoDoAtoDeDono | undefined): boolean {
  if (!turno) return false
  if (turno.papel !== 'dono') return false
  return turno.terceiroIngerido === false
}


export function podeAgirSobreOLido(turno: TurnoDoAtoDeDono | undefined): boolean {
  if (!turno?.recusasSemPessoa) return turno?.papel !== undefined
  return turno.terceiroIngerido === false
}


export function recusarAtoDeDono(
  turno: TurnoDoAtoDeDono | undefined,
  ferramenta: FerramentaDeDono,
): string {
  const recusas = turno?.recusasSemPessoa
  if (!recusas) return RECUSA_ATO_DE_DONO
  recusas.push({
    ferramenta,
    motivo: turno?.terceiroIngerido === true ? 'conteudo_de_fora' : 'sem_dono',
  })
  return RECUSA_ATO_DE_DONO_AUTOMATICO
}


const O_QUE_A_FERRAMENTA_FAZ: Record<FerramentaDeDono, string> = {
  ajustarNotificacoes: 'mudar os seus avisos',
  gerenciarLembretes: 'mexer nos seus lembretes',
  gerenciarRotinas: 'mexer nas suas rotinas',
  vigiar: 'mexer nas suas vigilâncias',
  pedirCriativo: 'pedir um anúncio novo ao designer',
  pedirCopy: 'pedir um texto novo à redatora',
  delegarTarefa: 'delegar uma tarefa a um colega',
  anotarMemoriaConta: 'anotar um aprendizado na Ficha da conta',
}


function listar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? ''
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

function rotulosDe(recusas: readonly RecusaDeAtoDeDono[], motivo: MotivoDaRecusa): string[] {
  const vistos = new Set<string>()
  for (const r of recusas) {
    if (r.motivo === motivo) vistos.add(O_QUE_A_FERRAMENTA_FAZ[r.ferramenta])
  }
  return [...vistos]
}


export function avisoDeRecusas(recusas: readonly RecusaDeAtoDeDono[] | undefined): string {
  if (!recusas?.length) return ''
  const partes: string[] = []
  const porFora = rotulosDe(recusas, 'conteudo_de_fora')
  if (porFora.length) {
    partes.push(
      `Aviso: neste trabalho eu precisei ${listar(porFora)} e não fiz. Ele já tinha lido material vindo de fora (mensagem de cliente, retorno de ferramenta ou arquivo importado), e nesse caso eu não mexo na sua conta sozinho. Se você quiser essa mudança, é só me pedir na conversa.`,
    )
  }
  const semDono = rotulosDe(recusas, 'sem_dono')
  if (semDono.length) {
    partes.push(
      `Aviso: neste trabalho eu precisei ${listar(semDono)} e não fiz, porque não deu para confirmar que ele estava rodando em seu nome. Se você quiser essa mudança, é só me pedir na conversa.`,
    )
  }
  return partes.join('\n\n')
}


export function resultadoComAvisoDeRecusa(
  resultado: string,
  recusas: readonly RecusaDeAtoDeDono[] | undefined,
): string {
  const aviso = avisoDeRecusas(recusas)
  if (!aviso) return resultado
  return resultado ? `${aviso}\n\n${resultado}` : aviso
}


export function rotuloDoEventoDeRecusa(recusas: readonly RecusaDeAtoDeDono[]): string {
  const rotulos = [...new Set(recusas.map((r) => O_QUE_A_FERRAMENTA_FAZ[r.ferramenta]))]
  return `Trabalho automático não pôde ${listar(rotulos)}`
}
