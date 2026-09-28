
import { redirect } from 'next/navigation'
import { getBranding } from '@/server/config/branding'
import { getCompanyProfile } from '@/data/settings'
import { OnboardingClient } from './OnboardingClient'



export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Onboarding',
  description: 'O nascimento da sua empresa de IA.',
}

export default async function OnboardingPage() {
  
  
  
  let jaNasceu = false
  try {
    jaNasceu = (await getCompanyProfile()).born
  } catch (err) {
    console.warn('[/onboarding] leitura de company_born falhou (portão fail-open):', err)
  }
  if (jaNasceu) redirect('/')

  const branding = await getBranding()
  return <OnboardingClient assistantName={branding.assistantName} />
}
