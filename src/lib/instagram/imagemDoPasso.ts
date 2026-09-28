





import { MAX_CHAVE } from '@/lib/storage/chaveSegura'

const MB = 1024 * 1024


export const TETO_IMAGEM_PASSO = 8 * MB


export const ERRO_IMAGEM_GRANDE = 'A imagem passa de 8 MB. Escolha um arquivo menor.'


export const TETO_DO_CORPO_DA_IMAGEM = TETO_IMAGEM_PASSO + 64 * 1024


export const PREFIXO_IMAGEM_PASSO = 'instagram/passo-imagem/'


export const TETO_CAMINHO_VARIAVEL = 36 + 1 + MAX_CHAVE


const REGEX_CAMINHO_IMAGEM_PASSO = new RegExp(
  `^${PREFIXO_IMAGEM_PASSO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9_.-]{1,${TETO_CAMINHO_VARIAVEL}}$`,
)


export function caminhoImagemPassoValido(path: string): boolean {
  return REGEX_CAMINHO_IMAGEM_PASSO.test(path)
}

export type TipoDeImagemPasso = 'image/jpeg' | 'image/png'


const ASSINATURAS: ReadonlyArray<{ tipo: TipoDeImagemPasso; marca: readonly number[] }> = [
  { tipo: 'image/png', marca: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { tipo: 'image/jpeg', marca: [0xff, 0xd8, 0xff] },
]


export const TAMANHO_ASSINATURA = Math.max(...ASSINATURAS.map((a) => a.marca.length))


export function tipoPelosBytes(inicio: Uint8Array): TipoDeImagemPasso | null {
  for (const { tipo, marca } of ASSINATURAS) {
    if (inicio.length >= marca.length && marca.every((b, i) => inicio[i] === b)) return tipo
  }
  return null
}

export type ValidacaoImagemPasso =
  | { ok: true; tipo: TipoDeImagemPasso }
  | { ok: false; erro: string }


export function validarImagemDoPasso(input: { inicio: Uint8Array; bytes: number }): ValidacaoImagemPasso {
  if (!Number.isFinite(input.bytes) || input.bytes <= 0) {
    return { ok: false, erro: 'O arquivo está vazio ou não pôde ser lido.' }
  }
  const tipo = tipoPelosBytes(input.inicio)
  if (!tipo) {
    return { ok: false, erro: 'Envie uma imagem em JPEG ou PNG. O arquivo escolhido não é uma imagem desses dois tipos, mesmo que o nome dele termine assim.' }
  }
  if (input.bytes > TETO_IMAGEM_PASSO) return { ok: false, erro: ERRO_IMAGEM_GRANDE }
  return { ok: true, tipo }
}
