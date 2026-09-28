// segredos.ts — acesso ao Vault ESCOPADO à zona custom/. Só chaves custom_*
// (impede a custom tocar segredos do core). Wrapper fino sobre secrets.ts (que aceita nome arbitrário).
import { getSecret, setSecret } from '@/server/secrets'

function assertCustom(nome: string): void {
  if (!nome.startsWith('custom_')) throw new Error(`segredo custom precisa começar com "custom_" (recebido: "${nome}")`)
}
export async function getSecretCustom(nome: string): Promise<string | null> { assertCustom(nome); return getSecret(nome) }
export async function setSecretCustom(nome: string, valor: string): Promise<void> { assertCustom(nome); return setSecret(nome, valor) }
