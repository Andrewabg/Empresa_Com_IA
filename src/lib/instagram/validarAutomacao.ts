


import { temPalavraForaDoTeto, type ModoCasamento } from './palavraChave'
import type { IgGatilho } from '@/data/igAutomacoes'
import {
  INSTAGRAM_MAX_CHARS, INSTAGRAM_MAX_CHARS_BOTAO, INSTAGRAM_MAX_CHARS_COMENTARIO,
  INSTAGRAM_MAX_CHARS_ROTULO_BOTAO, INSTAGRAM_MAX_CHARS_ID, type BotaoIg,
} from './limitesDaMeta'
import { caminhoImagemPassoValido } from './imagemDoPasso'
import { lerEnderecoDeMidia, ERRO_ENDERECO_DE_MIDIA } from './enderecoDeMidia'
import { gatilhoForaDeUso, ERRO_GATILHO_FORA_DE_USO } from './copyGatilho'

export const LIMITES = {
  passos: 10,
  botoes: 3,
  atrasoS: 300,
  palavras: 30,
  
  nome: 80,
  
  palavra: INSTAGRAM_MAX_CHARS_COMENTARIO,
  
  respostaPublica: INSTAGRAM_MAX_CHARS_COMENTARIO,
  
  rotuloBotao: INSTAGRAM_MAX_CHARS_ROTULO_BOTAO,
  
  idDaMeta: INSTAGRAM_MAX_CHARS_ID,
  
  urlBotao: 2048,
  
  textoPasso: INSTAGRAM_MAX_CHARS,
  
  textoPassoComBotoes: INSTAGRAM_MAX_CHARS_BOTAO,
} as const

const MODOS: ModoCasamento[] = ['contem', 'exata', 'exata_normalizada']

export interface PassoValidado {
  posicao: number
  texto: string | null
  imagemPath: string | null
  botoes: BotaoIg[]
  atrasoS: number
}

export interface AutomacaoValidada {
  nome: string
  gatilho: IgGatilho
  midiaId: string | null
  
  midiaPermalink: string | null | undefined
  
  midiaThumbUrl: string | null | undefined
  storyId: string | null
  palavras: string[]
  modoCasamento: ModoCasamento
  respostaPublica: boolean
  respostaPublicaTexto: string | null
  passos: PassoValidado[]
}

export interface AutomacaoEntrada {
  nome?: unknown; gatilho?: unknown; midiaId?: unknown; storyId?: unknown
  midiaPermalink?: unknown; midiaThumbUrl?: unknown
  palavras?: unknown; modoCasamento?: unknown
  respostaPublica?: unknown; respostaPublicaTexto?: unknown; passos?: unknown
}

type Resultado = { ok: true; valor: AutomacaoValidada } | { ok: false; erro: string }

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}


const ID_DA_META = new RegExp(`^[A-Za-z0-9_]{1,${LIMITES.idDaMeta}}$`)


const SUFIXOS_DE_REDE_LOCAL = new Set(['localhost', 'local', 'internal'])


function urlSegura(v: unknown): boolean {
  if (typeof v !== 'string' || v.length > LIMITES.urlBotao) return false
  let u: URL
  try { u = new URL(v) } catch { return false }
  if (u.protocol !== 'https:') return false
  if (u.username !== '' || u.password !== '') return false
  
  
  const rotulos = u.hostname.replace(/\.$/, '').split('.')
  
  
  if (rotulos.length < 2) return false
  const ultimo = rotulos[rotulos.length - 1]
  
  
  if (!/^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(ultimo)) return false
  return !SUFIXOS_DE_REDE_LOCAL.has(ultimo)
}



const ERRO_SEM_PASSO = 'Escreva pelo menos uma mensagem para a automação enviar.'

function erroBotaoSemTexto(numero: number): string {
  return `A mensagem ${numero} tem botões e está sem texto. O Instagram só entrega botões junto de um texto, então escreva a mensagem que vai com eles.`
}

function erroBotoesDemais(numero: number): string {
  return `A mensagem ${numero} tem botões demais. O Instagram aceita no máximo ${LIMITES.botoes}.`
}

function erroImagemForaDaTela(numero: number): string {
  return `A imagem da mensagem ${numero} não veio do envio desta tela. Anexe o arquivo de novo pelo campo de imagem.`
}

function erroEnderecoDeBotao(rotulo: string): string {
  return `O botão "${rotulo}" precisa do endereço de uma página na internet, começando com https e com no máximo ${LIMITES.urlBotao} caracteres. Endereço com nome de usuário antes do arroba, ou apontando para a própria máquina, não vale.`
}

const ERRO_PALAVRA_LONGA = `Uma das palavras é longa demais. Cada palavra pode ter até ${LIMITES.palavra} caracteres, que é o tamanho máximo de um comentário no Instagram.`

const ERRO_RESPOSTA_PUBLICA_LONGA = `A resposta pública é longa demais. O Instagram aceita até ${LIMITES.respostaPublica} caracteres em um comentário.`


export interface LinhaParaAtivar {
  gatilho?: unknown
  palavras?: unknown
  resposta_publica?: unknown
  resposta_publica_texto?: string | null
}


export function motivoQueImpedeAtivar(
  automacao: LinhaParaAtivar,
  passos: ReadonlyArray<{ texto: string | null; imagem_path?: string | null; botoes: unknown }>,
): string | null {
  
  
  if (gatilhoForaDeUso(automacao.gatilho)) return ERRO_GATILHO_FORA_DE_USO
  if (passos.length === 0) return ERRO_SEM_PASSO
  for (let i = 0; i < passos.length; i++) {
    const p = passos[i]
    const botoes = Array.isArray(p.botoes) ? p.botoes : []
    const img = texto(p.imagem_path)
    if (botoes.length > LIMITES.botoes) return erroBotoesDemais(i + 1)
    if (img && !caminhoImagemPassoValido(img)) return erroImagemForaDaTela(i + 1)
    if (botoes.length > 0 && !texto(p.texto)) return erroBotaoSemTexto(i + 1)
    for (const b of botoes) {
      const bb = b as { rotulo?: unknown; url?: unknown }
      if (!urlSegura(bb.url)) return erroEnderecoDeBotao(texto(bb.rotulo))
    }
  }
  const palavras = Array.isArray(automacao.palavras) ? automacao.palavras : []
  
  
  
  if (temPalavraForaDoTeto(palavras.map((p) => (typeof p === 'string' ? p : String(p ?? ''))))) {
    return ERRO_PALAVRA_LONGA
  }
  
  
  if (automacao.resposta_publica === true
    && texto(automacao.resposta_publica_texto).length > LIMITES.respostaPublica) {
    return ERRO_RESPOSTA_PUBLICA_LONGA
  }
  return null
}

function validarPassos(v: unknown): { ok: true; valor: PassoValidado[] } | { ok: false; erro: string } {
  if (!Array.isArray(v) || v.length === 0) {
    return { ok: false, erro: ERRO_SEM_PASSO }
  }
  if (v.length > LIMITES.passos) {
    return { ok: false, erro: `Uma automação envia no máximo ${LIMITES.passos} mensagens.` }
  }
  const out: PassoValidado[] = []
  for (let i = 0; i < v.length; i++) {
    const p = v[i] as { texto?: unknown; imagemPath?: unknown; botoes?: unknown; atrasoS?: unknown }
    const t = texto(p.texto)
    const img = texto(p.imagemPath)
    const botoesCrus = Array.isArray(p.botoes) ? p.botoes : []

    
    
    
    
    
    if (botoesCrus.length > LIMITES.botoes) return { ok: false, erro: erroBotoesDemais(i + 1) }
    const botoes: BotaoIg[] = []
    for (const b of botoesCrus) {
      const bb = b as { rotulo?: unknown; url?: unknown }
      const rotulo = texto(bb.rotulo)
      if (!rotulo) return { ok: false, erro: `Um botão da mensagem ${i + 1} está sem nome.` }
      
      
      if (rotulo.length > LIMITES.rotuloBotao) {
        return { ok: false, erro: `Um botão da mensagem ${i + 1} está com o nome longo demais. O Instagram aceita até ${LIMITES.rotuloBotao} caracteres no nome de um botão.` }
      }
      if (!urlSegura(bb.url)) return { ok: false, erro: erroEnderecoDeBotao(rotulo) }
      botoes.push({ rotulo, url: String(bb.url) })
    }
    
    
    
    if (img && !caminhoImagemPassoValido(img)) return { ok: false, erro: erroImagemForaDaTela(i + 1) }
    
    
    
    
    if (botoesCrus.length > 0 && !t) return { ok: false, erro: erroBotaoSemTexto(i + 1) }
    if (!t && !img) return { ok: false, erro: `A mensagem ${i + 1} está vazia. Escreva um texto ou escolha uma imagem.` }

    
    
    const teto = botoesCrus.length > 0 ? LIMITES.textoPassoComBotoes : LIMITES.textoPasso
    if (t.length > teto) {
      return { ok: false, erro: `A mensagem ${i + 1} é longa demais. O limite é ${teto} caracteres.` }
    }
    const atraso = typeof p.atrasoS === 'number' && Number.isFinite(p.atrasoS) ? Math.round(p.atrasoS) : 0
    if (atraso < 0 || atraso > LIMITES.atrasoS) {
      return { ok: false, erro: `A espera da mensagem ${i + 1} precisa ficar entre zero e ${LIMITES.atrasoS} segundos.` }
    }
    out.push({ posicao: i + 1, texto: t || null, imagemPath: img || null, botoes, atrasoS: atraso })
  }
  return { ok: true, valor: out }
}

export function validarAutomacao(e: AutomacaoEntrada): Resultado {
  const nome = texto(e.nome)
  if (!nome) return { ok: false, erro: 'Dê um nome para a automação.' }
  if (nome.length > LIMITES.nome) {
    return { ok: false, erro: `O nome da automação é longo demais. Escreva um nome de até ${LIMITES.nome} caracteres.` }
  }

  const gatilho = texto(e.gatilho) as IgGatilho
  if (!['comentario', 'story', 'palavra_no_direct'].includes(gatilho)) {
    return { ok: false, erro: 'Escolha o que faz a automação disparar.' }
  }
  
  
  
  if (gatilhoForaDeUso(gatilho)) return { ok: false, erro: ERRO_GATILHO_FORA_DE_USO }

  const midiaId = texto(e.midiaId) || null
  const storyId = texto(e.storyId) || null
  if (gatilho === 'comentario' && !midiaId) {
    return { ok: false, erro: 'Escolha em qual publicação esta automação vale.' }
  }
  
  
  if (midiaId && !ID_DA_META.test(midiaId)) {
    return { ok: false, erro: 'Não reconheci a publicação escolhida. Escolha uma publicação na lista desta tela.' }
  }
  if (storyId && !ID_DA_META.test(storyId)) {
    return { ok: false, erro: `O identificador do story não está no formato do Instagram. Ele é uma sequência de letras e números, sem espaços, com até ${LIMITES.idDaMeta} caracteres.` }
  }

  
  
  
  
  const permalink = e.midiaPermalink === undefined ? undefined : lerEnderecoDeMidia(e.midiaPermalink)
  const thumb = e.midiaThumbUrl === undefined ? undefined : lerEnderecoDeMidia(e.midiaThumbUrl)
  if ((permalink && !permalink.ok) || (thumb && !thumb.ok)) {
    return { ok: false, erro: ERRO_ENDERECO_DE_MIDIA }
  }

  const modoCasamento = texto(e.modoCasamento) as ModoCasamento
  if (!MODOS.includes(modoCasamento)) {
    return { ok: false, erro: 'Escolha como a palavra deve ser reconhecida.' }
  }

  
  
  const palavrasCruas = Array.isArray(e.palavras) ? e.palavras : []
  const vistas = new Set<string>()
  const palavras: string[] = []
  for (const p of palavrasCruas) {
    const t = texto(p)
    if (!t || vistas.has(t.toLowerCase())) continue
    
    
    
    if (t.length > LIMITES.palavra) return { ok: false, erro: ERRO_PALAVRA_LONGA }
    vistas.add(t.toLowerCase())
    palavras.push(t)
  }
  if (palavras.length > LIMITES.palavras) {
    return { ok: false, erro: `São muitas palavras. O limite é ${LIMITES.palavras}.` }
  }

  const respostaPublica = e.respostaPublica === true
  const respostaPublicaTexto = respostaPublica ? texto(e.respostaPublicaTexto) : ''
  if (respostaPublica && !respostaPublicaTexto) {
    return { ok: false, erro: 'Escreva o que responder no comentário, ou desligue a resposta pública.' }
  }
  if (respostaPublicaTexto.length > LIMITES.respostaPublica) {
    return { ok: false, erro: ERRO_RESPOSTA_PUBLICA_LONGA }
  }

  const passos = validarPassos(e.passos)
  if (!passos.ok) return passos

  return {
    ok: true,
    valor: {
      nome, gatilho, midiaId, storyId, palavras, modoCasamento,
      midiaPermalink: permalink === undefined ? undefined : permalink.valor,
      midiaThumbUrl: thumb === undefined ? undefined : thumb.valor,
      respostaPublica,
      respostaPublicaTexto: respostaPublica ? respostaPublicaTexto : null,
      passos: passos.valor,
    },
  }
}
