import { getSetting, setSetting, getCompanyProfile } from '@/data/settings'

export const CORE_SETTING_KEY = 'memory_core'


async function seedFromProfile(): Promise<string> {
  const p = await getCompanyProfile()
  const empresaProvisoria = (await getSetting('company_identity_provisional')) === 'true'
  const linhas: string[] = []
  if (p.operatorName) linhas.push(`Operador: ${p.operatorName}.`)
  if (!empresaProvisoria && p.companyName) linhas.push(`Empresa: ${p.companyName}.`)
  if (!empresaProvisoria && p.mission) linhas.push(`Missão: ${p.mission}.`)
  return linhas.join(' ')
}


export async function getCoreMemory(): Promise<string> {
  const stored = await getSetting(CORE_SETTING_KEY)
  if (stored && stored.trim()) return stored
  return seedFromProfile()
}


export async function writeCoreMemory(text: string): Promise<void> {
  await setSetting(CORE_SETTING_KEY, text)
}
