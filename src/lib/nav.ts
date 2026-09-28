import { COCKPIT_FLAGS, HREF_ENTREGAS } from '@/lib/cockpit'
import { papelPodeAcessar, type Papel } from '@/lib/equipe'

export interface NavItem {
  label: string
  href: string
  description: string
}

export interface NavGroup {
  
  label?: string
  items: NavItem[]
}


export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Command Center', href: '/', description: 'Cockpit do dia' },
      { label: 'Conversa', href: '/conversa', description: 'Falar com o Nathan' },
      { label: 'Cérebro', href: '/cerebro', description: 'Memórias e conhecimento' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { label: 'Inbox', href: '/inbox', description: 'Conversas com clientes (WhatsApp)' },
      { label: 'Treino', href: '/treino', description: 'Treinar atendentes por conversa' },
      { label: 'Agentes', href: '/agentes', description: 'Quem trabalha aqui' },
      { label: 'Rotinas', href: '/rotinas', description: 'O que a empresa faz sozinha' },
      { label: 'Loja', href: '/loja', description: 'Contratar especialistas prontos' },
      { label: 'Integrações', href: '/integracoes', description: 'Conectar ferramentas externas' },
      { label: 'Organograma', href: '/organograma', description: 'Quem responde a quem' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Entregas', href: HREF_ENTREGAS, description: 'Pedir um pacote e acompanhar' },
      { label: 'Copy', href: '/copy', description: 'Estúdio do copywriter (Lia)' },
      { label: 'Design', href: '/design', description: 'Estúdio do designer (Téo)' },
      { label: 'Tráfego', href: '/trafego', description: 'Painel de mídia paga (Rui)' },
      { label: 'Instagram', href: '/instagram', description: 'Automações de comentário nas publicações' },
    ],
  },
  {
    label: 'Operações',
    items: [
      { label: 'Jurídico', href: '/juridico', description: 'Escritório jurídico (Alan)' },
    ],
  },
  {
    label: 'Governança',
    items: [
      { label: 'Tarefas', href: '/tarefas', description: 'Por onde passou cada pedido' },
      { label: 'Aprovações', href: '/aprovacoes', description: 'Ações pendentes' },
      
      
      
    ],
  },
]


export const CONFIG_ITEM: NavItem = {
  label: 'Configuração',
  href: '/config',
  description: 'Configurações',
}


export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  CONFIG_ITEM,
]


export const GATED_HREFS: ReadonlySet<string> = new Set<string>([
  ...COCKPIT_FLAGS.map(([, href]) => href),
  '/inbox',
  '/treino',
  
  
  HREF_ENTREGAS,
])


export const HREFS_COM_ICONE = [
  '/', '/conversa', '/cerebro',
  '/inbox', '/treino', '/agentes', '/rotinas', '/loja', '/integracoes', '/organograma',
  '/entregas', '/copy', '/design', '/trafego', '/instagram', '/juridico',
  '/tarefas', '/aprovacoes',
  '/config',
] as const

export type HrefComIcone = (typeof HREFS_COM_ICONE)[number]


function keepNavItem(item: NavItem, active: ReadonlySet<string>): boolean {
  return !GATED_HREFS.has(item.href) || active.has(item.href)
}


export function filterNavGroups(groups: NavGroup[], active: ReadonlySet<string>): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => keepNavItem(it, active)) }))
    .filter((g) => g.items.length > 0)
}


export function filterNavItems(items: NavItem[], active: ReadonlySet<string>): NavItem[] {
  return items.filter((it) => keepNavItem(it, active))
}


export function itemVisivelParaPapel(item: NavItem, papel: Papel | null | undefined): boolean {
  return papel ? papelPodeAcessar(papel, item.href) : true
}


export function filtrarGruposPorPapel(groups: NavGroup[], papel: Papel | null | undefined): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => itemVisivelParaPapel(it, papel)) }))
    .filter((g) => g.items.length > 0)
}


export function filtrarItensPorPapel(items: NavItem[], papel: Papel | null | undefined): NavItem[] {
  return items.filter((it) => itemVisivelParaPapel(it, papel))
}
