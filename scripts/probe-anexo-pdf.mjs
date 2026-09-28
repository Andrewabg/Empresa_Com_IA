
















import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Agent } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { extractText, getDocumentProxy } from 'unpdf'

const CODIGO_SECRETO = 'ZEBRA-4271-ONDA'
const MODELO = 'gpt-5.1'


function lerEnv(chave) {
  if (process.env[chave]) return process.env[chave]
  try {
    for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (m && m[1] === chave) return m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    
  }
  return undefined
}


const escapaPdf = (s) => s.replace(/([\\()])/g, '\\$1')


function montarPdfComTexto(linhas) {
  const partes = []
  const offsets = []
  let offset = 0
  const push = (buf) => {
    partes.push(buf)
    offset += buf.length
  }
  const pushObj = (s) => {
    offsets.push(offset)
    push(Buffer.from(s, 'latin1'))
  }

  push(Buffer.from('%PDF-1.4\n', 'latin1'))
  pushObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  pushObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  pushObj(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
      '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  )
  pushObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

  const content =
    'BT\n/F1 20 Tf\n' +
    linhas.map((t, i) => `1 0 0 1 64 ${720 - i * 34} Tm\n(${escapaPdf(t)}) Tj\n`).join('') +
    'ET\n'
  pushObj(`5 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream\nendobj\n`)

  const xrefOffset = offset
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  push(Buffer.from(xref, 'latin1'))
  push(Buffer.from(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, 'latin1'))
  return Buffer.concat(partes)
}


async function coletarTexto(saida) {
  const reader = saida.fullStream.getReader()
  let texto = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      const tipo = value?.type ?? '(sem type)'
      if (tipo === 'text-delta') texto += value.payload?.text ?? ''
      else console.log(`  chunk: ${tipo}`)
    }
  } finally {
    reader.releaseLock()
  }
  return texto
}


const pdf = montarPdfComTexto([
  'RELATORIO INTERNO DA AWAVE',
  `CODIGO DE CONTROLE: ${CODIGO_SECRETO}`,
  'Este documento existe apenas para o probe do anexo.',
])

const caminhoPdf = join(tmpdir(), 'probe-anexo.pdf')
writeFileSync(caminhoPdf, pdf)
console.log(`PDF sintetico: ${pdf.length} bytes (${caminhoPdf})`)


const doc = await getDocumentProxy(new Uint8Array(pdf.slice()))
const { text } = await extractText(doc, { mergePages: true })
const pdfSadio = text.includes(CODIGO_SECRETO)
console.log(`unpdf leu o PDF: ${pdfSadio ? 'OK' : 'FALHOU'} — texto: ${JSON.stringify(text.slice(0, 120))}`)
if (!pdfSadio) {
  console.log('\nRESULTADO: INCONCLUSIVO — o PDF sintetico esta quebrado, conserte antes de julgar o Mastra.')
  process.exit(1)
}


const apiKey = lerEnv('OPENAI_API_KEY')
if (!apiKey || !apiKey.startsWith('sk-')) {
  console.log('\nRESULTADO: PROBE NAO RODOU (sem OPENAI_API_KEY utilizavel no .env).')
  console.log('O script esta pronto: ponha a chave no .env e rode `node scripts/probe-anexo-pdf.mjs`.')
  process.exit(2)
}

const openai = createOpenAI({ apiKey })
const agente = new Agent({
  id: 'probe-anexo',
  name: 'Probe',
  instructions:
    'Voce responde em PT-BR, em uma linha. Se nao receber nenhum arquivo, responda exatamente: NAO RECEBI ARQUIVO.',
  model: openai(MODELO),
})

const mensagens = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Responda apenas com o CODIGO DE CONTROLE que esta escrito dentro deste PDF.' },
      { type: 'file', data: new Uint8Array(pdf), mediaType: 'application/pdf', filename: 'teste.pdf' },
    ],
  },
]


const TETO_MS = 90_000
const watchdog = setTimeout(() => {
  console.log(`\nRESULTADO: INCONCLUSIVO — o stream passou de ${TETO_MS / 1000}s sem terminar.`)
  process.exit(3)
}, TETO_MS)

try {
  console.log(`\nchamando ${MODELO} com o part {type:'file'}...`)
  const saida = await agente.stream(mensagens)
  const resposta = (await coletarTexto(saida)).trim()
  clearTimeout(watchdog)
  console.log(`\nmodelo (${MODELO}) respondeu: ${JSON.stringify(resposta)}`)
  if (resposta.includes(CODIGO_SECRETO)) {
    console.log('\nRESULTADO: PLANO A — o part {type:"file"} de PDF ATRAVESSA o Mastra e chega ao modelo.')
  } else {
    console.log('\nRESULTADO: PLANO B — o modelo nao viu o conteudo do PDF (part perdido ou ignorado).')
    console.log('Trocar no desenho: PDF vira TEXTO por extrairTextoPdf no upload, nunca part nativo.')
  }
} catch (err) {
  clearTimeout(watchdog)
  console.log(`\nERRO no stream: ${err?.name ?? 'Error'} — ${err?.message ?? err}`)
  if (err?.stack) console.log(err.stack.split('\n').slice(0, 6).join('\n'))
  console.log('\nRESULTADO: PLANO B — o caminho do part de arquivo lancou (ver erro acima).')
}



process.exit(0)
