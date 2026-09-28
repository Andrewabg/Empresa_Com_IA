








import type { TurnSink, ToolProgresso } from '@/server/agent/conselheiroEvents'
import type { ArtifactRow } from '@/data/artifacts'
import type { ArtifactKind } from '@/lib/artifacts'
import type { SendResultado } from './telegram'
import { TELEGRAM_MAX_CHARS } from './telegram'
import { mdParaHtmlTelegram, mdParaTextoPuro } from '@/lib/telegram/mdParaHtml'



const LIMITE_TEXTO_INLINE = 3500
const RETRY_DELAY_MS = 1_000 


export interface TelegramSinkDeps {
  sendText: (chatId: string, texto: string, opts?: { parseMode?: 'HTML' }) => Promise<SendResultado>
  sendPhoto: (chatId: string, photoUrl: string, caption?: string) => Promise<SendResultado>
  sendDocument: (chatId: string, bytes: Uint8Array, filename: string, caption?: string) => Promise<SendResultado>
  editMessageText: (chatId: string, messageId: number, texto: string, opts?: { parseMode?: 'HTML' }) => Promise<void>
  
  signArtifactUrl: (storageRef: string) => Promise<string | null>
  
  sleep?: (ms: number) => Promise<void>
}

export interface TelegramSink extends TurnSink {
  
  finalizar(texto: string): Promise<void>
}


function escaparPre(code: string): string {
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<pre>${esc}</pre>`
}


function extDados(content: string): 'csv' | 'txt' {
  const primeiraLinha = content.slice(0, 200).split('\n')[0] ?? ''
  return primeiraLinha.includes(',') ? 'csv' : 'txt'
}


function nomeArquivo(title: string, ext: string): string {
  const base = mdParaTextoPuro(title).trim().replace(/[\/\\:*?"<>|]+/g, '_').slice(0, 60) || 'artefato'
  return `${base}.${ext}`
}


const ROTULO_POR_TOOL: Record<string, string> = {
  consultarFuncionario:   '💬 consultando a equipe…',
  buscarCerebro:          '🔎 consultando o Cérebro…',
  delegarTarefa:          '📋 delegando pra equipe…',
  gerarImagem:            '🎨 gerando a imagem…',
  buscarMetricasTrafego:  '📊 puxando as métricas…',
  gerarRelatorio:         '📊 puxando as métricas…',
  gerarPeca:              '✍️ escrevendo…',
  gerarCriativo:          '✍️ escrevendo…',
  gerarContrato:          '📄 no contrato…',
  analisarContrato:       '📄 no contrato…',
}


export function criarTelegramSink(chatId: string, deps: TelegramSinkDeps): TelegramSink {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))

  
  
  let buffer = ''
  
  let statusMessageId: number | null = null
  
  
  
  let statusChain: Promise<void> = Promise.resolve()
  
  
  
  
  
  let artefatoChain: Promise<void> = Promise.resolve()

  function onText(delta: string): void {
    buffer += delta
  }

  function onProgresso(p: ToolProgresso): void {
    
    
    const rotulo = ROTULO_POR_TOOL[p.tool]
    if (!rotulo) return

    
    statusChain = statusChain
      .then(async () => {
        if (statusMessageId === null) {
          const r = await deps.sendText(chatId, rotulo)
          if (r.ok) statusMessageId = r.messageId
        } else {
          await deps.editMessageText(chatId, statusMessageId, rotulo)
        }
      })
      .catch(() => {}) 
  }

  function onArtefato(a: ArtifactRow): Promise<void> {
    
    
    
    artefatoChain = artefatoChain.then(() => renderArtefato(a))
    return artefatoChain
  }

  async function renderArtefato(a: ArtifactRow): Promise<void> {
    
    try {
      switch (a.kind as ArtifactKind | string) {
        case 'imagem': {
          if (!a.storage_ref) return
          const url = await deps.signArtifactUrl(a.storage_ref)
          if (!url) return 
          await deps.sendPhoto(chatId, url, mdParaTextoPuro(a.title))
          return
        }
        case 'documento': {
          
          
          
          const conteudo = a.content ?? a.title
          if (conteudo.length > LIMITE_TEXTO_INLINE) {
            await deps.sendDocument(chatId, Buffer.from(conteudo, 'utf8'), nomeArquivo(a.title, 'txt'), mdParaTextoPuro(a.title))
          } else {
            await deps.sendText(chatId, conteudo)
          }
          return
        }
        case 'codigo': {
          const conteudo = a.content ?? ''
          if (!conteudo.trim()) { await deps.sendText(chatId, mdParaTextoPuro(a.title)); return }
          
          await deps.sendText(chatId, escaparPre(conteudo), { parseMode: 'HTML' })
          return
        }
        case 'dados': {
          const conteudo = a.content ?? ''
          if (conteudo.length > LIMITE_TEXTO_INLINE) {
            const ext = extDados(conteudo)
            await deps.sendDocument(chatId, Buffer.from(conteudo, 'utf8'), nomeArquivo(a.title, ext), mdParaTextoPuro(a.title))
          } else {
            await deps.sendText(chatId, conteudo || mdParaTextoPuro(a.title))
          }
          return
        }
        case 'html': {
          const conteudo = a.content ?? ''
          if (conteudo.length > LIMITE_TEXTO_INLINE) {
            await deps.sendDocument(chatId, Buffer.from(conteudo, 'utf8'), nomeArquivo(a.title, 'html'), mdParaTextoPuro(a.title))
          } else {
            await deps.sendText(chatId, conteudo || mdParaTextoPuro(a.title))
          }
          return
        }
        default: {
          
          const s = a.summary ? `\n${a.summary}` : ''
          await deps.sendText(chatId, `${a.title}${s}`)
          return
        }
      }
    } catch (e) {
      console.warn(`[telegramSink] onArtefato falhou (kind=${a.kind}):`, e)
    }
  }

  
  async function enviarComRetry(texto: string): Promise<SendResultado> {
    const primeira = await deps.sendText(chatId, texto, { parseMode: 'HTML' })
    if (primeira.ok) return primeira
    await sleep(RETRY_DELAY_MS)
    return deps.sendText(chatId, texto, { parseMode: 'HTML' })
  }

  async function finalizar(texto: string): Promise<void> {
    
    try {
      
      
      await Promise.all([statusChain.catch(() => {}), artefatoChain.catch(() => {})])
      
      
      
      const html = mdParaHtmlTelegram(texto, { linksClicaveis: true })
      const cabeEmUmBloco = html.length <= TELEGRAM_MAX_CHARS
      
      
      
      if (statusMessageId !== null && cabeEmUmBloco) {
        await deps.editMessageText(chatId, statusMessageId, html, { parseMode: 'HTML' })
        return
      }
      await enviarComRetry(html)
    } catch (e) {
      console.warn('[telegramSink] finalizar falhou:', e)
    }
  }

  
  
  
  return { onText, onProgresso, onArtefato, finalizar }
}
