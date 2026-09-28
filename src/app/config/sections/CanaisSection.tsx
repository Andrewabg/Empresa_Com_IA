'use client'



import { CanaisCard } from '../columns/CanaisCard'
import { InstagramCard } from '../columns/InstagramCard'
import { TelegramCard } from '../columns/TelegramCard'
import { SectionHeader } from '../SectionHeader'
import { Collapsible } from '../Collapsible'

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.4c3.1 0 5.6 2.4 5.6 5.3 0 2.9-2.5 5.3-5.6 5.3-.9 0-1.8-.2-2.5-.5L2.6 13.6l1.1-2.7A5.1 5.1 0 0 1 2.4 7.7C2.4 4.8 4.9 2.4 8 2.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.1 6.1c-.1 1.6 2.2 3.9 3.8 3.8.5 0 .9-.5.7-.9-.1-.3-.9-.6-1.2-.4-.2.1-.4.4-.7.3-.5-.2-1.2-.9-1.4-1.4-.1-.3.2-.5.3-.7.2-.3-.1-1.1-.4-1.2-.4-.2-.9.2-.9.5Z" fill="currentColor" />
    </svg>
  )
}
function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M13.6 3.1 2.6 7.3c-.5.2-.5.6 0 .7l2.7.9 1 3.2c.1.4.4.5.7.2l1.5-1.4 2.7 2c.4.3.8.1.9-.4l1.9-8.6c.1-.5-.3-.8-.7-.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.3 8 11 4.6 6.6 8.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="3.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11.3" cy="4.7" r="0.7" fill="currentColor" />
    </svg>
  )
}

export function CanaisSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Canais"
        description="Onde sua empresa fala com o mundo: WhatsApp e Instagram para os clientes, Telegram para você comandar de qualquer lugar. Abra cada canal para configurar."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Collapsible icon={<WhatsAppIcon />} title="WhatsApp" subtitle="Atendimento a clientes">
          <CanaisCard />
        </Collapsible>
        <Collapsible icon={<InstagramIcon />} title="Instagram" subtitle="Comentários dos posts">
          <InstagramCard />
        </Collapsible>
        <Collapsible icon={<TelegramIcon />} title="Telegram" subtitle="Seu canal de comando">
          <TelegramCard />
        </Collapsible>
      </div>
    </div>
  )
}
