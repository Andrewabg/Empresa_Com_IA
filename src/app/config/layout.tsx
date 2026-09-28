
import { cookies } from 'next/headers'
import { requireDono } from '@/server/auth/membro'

export const metadata = {
  title: 'Configuração',
  description: 'Chaves e ajustes da sua empresa de IA.',
}

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  await requireDono(await cookies()) 
  return children
}
