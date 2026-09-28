import { normalizarTexto } from './texto'


export function detectarQueroCadastrarEmpresa(texto: string): boolean {
  const t = normalizarTexto(texto)
  if (!t) return false
  
  if (/\bnao\b/.test(t) || /\bseria\b|\bdos sonhos\b|\bse eu tiver\b|\bvoce tem\b/.test(t)) return false
  const posse = /\b(tenho|montei|abri|criei|registrei|cadastrei)\b.{0,15}\bempresa\b/.test(t)
  const querer = /\bquero\b.{0,20}\b(cadastrar|configurar|registrar|criar|montar|colocar|por|botar)\b.{0,15}\b(minha\s+)?empresa\b/.test(t)
  return posse || querer
}


export function detectarNaoTenhoEmpresa(texto: string): boolean {
  const t = normalizarTexto(texto)
  if (!t) return false
  const negaPosse =
    /\b(ainda\s+)?nao\s+(tenho|possuo|abri|montei|criei)\s+((uma|um|nenhuma|nenhum|minha|meu)\s+)?(empresa|negoci|cnpj|firma)/.test(t)
  const negaPapel = /\bnao\s+sou\s+(dono|dona|empresari|proprietari)/.test(t)
  const semEmpresa = /\bsem\s+empresa\b/.test(t)
  return negaPosse || negaPapel || semEmpresa
}
