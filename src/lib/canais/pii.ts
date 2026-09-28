



const MASK = '[dado sensível omitido]'
const CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g          
const CPF_FMT = /\b\d{3}[.\s]\d{3}[.\s]\d{3}-?\d{2}\b/g           
const CPF_CTX = /\bcpf\b/i
const CPF_RAW = /\b\d{11}\b/g                                     
const CARTAO_CTX = /(cart[ãa]o|cvv|c[óo]digo de seguran|validade)/i
const SEQ_CARTAO = /\b(?:\d[ -]?){13,19}\b/g
const PIX_CTX = /\bpix\b/i
const PIX_UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi 

export function redigirPII(texto: string): string {
  let t = texto.replace(CNPJ, MASK).replace(CPF_FMT, MASK)
  if (CPF_CTX.test(t)) t = t.replace(CPF_RAW, MASK)
  if (CARTAO_CTX.test(t)) t = t.replace(SEQ_CARTAO, MASK)
  if (PIX_CTX.test(t)) t = t.replace(PIX_UUID, MASK)
  return t
}
