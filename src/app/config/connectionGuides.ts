

export interface ConnectionGuide {
  
  fieldLabel?: string
  
  intro: string
  
  steps: string[]
  
  link?: { href: string; label: string }
}

const GUIDES: Record<string, ConnectionGuide> = {
  metaads: {
    fieldLabel: 'Token de acesso',
    intro: 'Gere um token de Usuário do Sistema (sem expiração) com permissão de anúncios:',
    steps: [
      'No Gerenciador de Negócios da Meta, abra Configurações do Negócio → Usuários do sistema.',
      'Crie (ou selecione) um Usuário do Sistema e conceda a ele acesso à sua conta de anúncios.',
      'Clique em "Gerar novo token" e escolha o seu app da Meta.',
      'Marque as permissões ads_read e ads_management.',
      'Em expiração, escolha "Nunca", gere e copie o token.',
      'Cole o token no campo acima.',
    ],
    link: {
      href: 'https://business.facebook.com/settings/system-users',
      label: 'Abrir Configurações do Negócio → Usuários do sistema',
    },
  },
}


export function getConnectionGuide(slug: string): ConnectionGuide | null {
  return GUIDES[slug.toLowerCase()] ?? null
}
