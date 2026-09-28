













import { interpolar, textoDaRespostaPublica, respostaPublicaFoiCortada } from './interpolar'
import type { BotaoIg } from './limitesDaMeta'


export interface PassoParaRevisar {
  posicao: number
  texto: string | null
  imagem_path: string | null
  botoes: BotaoIg[]
}


export interface EntradaDaRevisao {
  passos: PassoParaRevisar[]
  respostaPublica: boolean
  respostaPublicaTexto: string | null
  
  palavras: string[]
}


export type AlertaDeEndereco = 'usuario_no_endereco' | 'nome_disfarcado' | 'endereco_invalido'

export interface BotaoRevisado {
  rotulo: string
  
  endereco: string
  
  site: string | null
  alertas: AlertaDeEndereco[]
}

export interface MensagemRevisada {
  posicao: number
  
  texto: string | null
  
  imagem: string | null
  botoes: BotaoRevisado[]
}

export interface RevisaoCompleta {
  mensagens: MensagemRevisada[]
  
  respostaPublica: string | null
  
  respostaPublicaCortada: boolean
  
  alertas: AlertaDeEndereco[]
}


export const EXEMPLO_DE_USUARIO = 'quem.comentou'


export function julgarEndereco(bruto: string): { site: string | null; alertas: AlertaDeEndereco[] } {
  let u: URL
  try {
    u = new URL(bruto)
  } catch {
    return { site: null, alertas: ['endereco_invalido'] }
  }
  const alertas: AlertaDeEndereco[] = []
  if (u.username !== '' || u.password !== '') alertas.push('usuario_no_endereco')
  
  
  if (u.hostname.split('.').some((rotulo) => rotulo.startsWith('xn--'))) alertas.push('nome_disfarcado')
  return { site: u.host, alertas }
}


export function revisarAutomacao(entrada: EntradaDaRevisao): RevisaoCompleta {
  const vars = { usuario: EXEMPLO_DE_USUARIO, palavra: entrada.palavras[0] ?? '' }
  const mensagens: MensagemRevisada[] = [...entrada.passos]
    .sort((a, b) => a.posicao - b.posicao)
    .map((p) => ({
      posicao: p.posicao,
      texto: comoOClienteLe(p.texto, vars),
      imagem: nomeDoArquivo(p.imagem_path),
      botoes: (p.botoes ?? []).map((b) => {
        const endereco = typeof b?.url === 'string' ? b.url : ''
        return {
          rotulo: typeof b?.rotulo === 'string' ? b.rotulo : '',
          endereco,
          ...julgarEndereco(endereco),
        }
      }),
    }))

  const alertas: AlertaDeEndereco[] = []
  for (const m of mensagens) {
    for (const b of m.botoes) {
      for (const a of b.alertas) if (!alertas.includes(a)) alertas.push(a)
    }
  }

  
  
  
  const bruto = entrada.respostaPublica ? (entrada.respostaPublicaTexto ?? '') : ''
  const publica = bruto.trim() === '' ? null : (textoDaRespostaPublica(bruto, vars) || null)
  
  
  
  
  
  
  return {
    mensagens,
    respostaPublica: publica,
    respostaPublicaCortada: publica !== null && algumaPalavraCorta(bruto, vars, entrada.palavras),
    alertas,
  }
}


function algumaPalavraCorta(bruto: string, vars: { usuario: string; palavra: string }, palavras: string[]): boolean {
  const candidatas = palavras.length > 0 ? palavras : ['']
  return candidatas.some((p) => respostaPublicaFoiCortada(bruto, { ...vars, palavra: p }))
}


function comoOClienteLe(texto: string | null, vars: { usuario: string; palavra: string }): string | null {
  if (typeof texto !== 'string') return null
  const pronto = interpolar(texto, vars).trim()
  return pronto === '' ? null : pronto
}


function nomeDoArquivo(caminho: string | null): string | null {
  if (typeof caminho !== 'string' || caminho.trim() === '') return null
  const partes = caminho.split('/')
  return partes[partes.length - 1] || caminho
}


export function contagemDeMensagens(quantas: number): string {
  return quantas === 1 ? '1 mensagem' : `${quantas} mensagens`
}

export const TEXTO_DO_ALERTA: Record<AlertaDeEndereco, string> = {
  usuario_no_endereco: 'Este endereço tem um trecho antes do arroba, que faz o começo dele parecer outro site. Quem clica vai para o site indicado abaixo, não para o que está escrito no começo.',
  nome_disfarcado: 'Este endereço usa letras de outro alfabeto que imitam as nossas, então o nome escrito não é o site de verdade. Confira o site indicado abaixo.',
  endereco_invalido: 'Não deu para entender este endereço, então não dá para dizer para onde ele leva.',
}

export const TEXTOS_REVISAO_IG = {
  titulo: 'Confira o que vai ao público',
  explicacao: 'Isto é tudo que esta automação envia a quem comentar. Leia antes de colocar no ar: depois de ativa, ela responde sozinha em nome da sua marca.',
  rotuloRespostaPublica: 'Comentário público, embaixo do seu post, visível para qualquer pessoa:',
  semRespostaPublica: 'Esta automação não comenta nada em público.',
  
  
  respostaPublicaCortada: 'Dependendo da palavra que a pessoa escrever, este comentário não cabe inteiro no Instagram e sai cortado no fim. Encurte o texto se quiser que ele saia completo sempre.',
  rotuloMensagens: 'Mensagens no direct, na ordem em que saem:',
  semTexto: 'Esta mensagem não tem texto escrito.',
  rotuloImagem: 'Envia também o arquivo de imagem:',
  semImagem: 'Nenhuma imagem nesta mensagem.',
  avisoImagemSemPreVisualizacao: 'A imagem não aparece aqui, só o nome do arquivo. Para vê-la, abra a automação em Editar.',
  rotuloBotao: 'Botão',
  rotuloSite: 'Leva para o site:',
  semBotoes: 'Nenhum botão nesta mensagem.',
  nomeDeExemplo: `Onde a automação usa o nome de quem comentou, esta revisão mostra ${EXEMPLO_DE_USUARIO} como exemplo.`,
  confirmar: 'Li tudo, pode ativar',
  cancelar: 'Cancelar',
  abrindo: 'Abrindo o conteúdo desta automação…',
  naoAbriu: 'Não consegui abrir o conteúdo desta automação, então ela continua fora do ar.',
  semConteudo: 'Esta automação não tem nenhuma mensagem escrita, então não há o que colocar no ar.',
  
  semConferencia: 'Para colocar no ar, confira antes o conteúdo que esta automação vai enviar.',
  
  mudouDepoisDaConferencia: 'Alguém alterou esta automação enquanto você conferia, então ela não foi ativada. Confira o conteúdo atualizado antes de colocar no ar.',
  
  semConexao: 'Sem conexão com o servidor.',
  soDonoAtiva: 'Só o dono da empresa pode ativar uma automação.',
  soDonoArquiva: 'Só o dono da empresa pode arquivar uma automação.',
} as const
