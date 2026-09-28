
import type { BriefEstruturado } from '@/lib/design/types'

export interface BriefSlot { id: keyof BriefEstruturado; label: string; seed: string; essencial: boolean }
export const BRIEF_SLOTS: BriefSlot[] = [
  { id: 'objetivo', label: 'Objetivo', seed: 'O que a pessoa deve FAZER ao ver o anúncio? (agendar, comprar, chamar no WhatsApp)', essencial: true },
  { id: 'oferta', label: 'Oferta + mensagem', seed: 'Qual a oferta e a ÚNICA mensagem que o anúncio precisa cravar?', essencial: true },
  { id: 'publico', label: 'Público', seed: 'Pra quem é esse anúncio?', essencial: false },
  { id: 'angulo', label: 'Ângulo + tom', seed: 'Que ângulo vende melhor (dor, prova, urgência, aspiração) e em que tom?', essencial: false },
  { id: 'icp', label: 'Cliente ideal desta peça', seed: 'Quem exatamente vai ver este anúncio? (não "PMEs", e sim "o dono que ainda aprova cada orçamento na mão")', essencial: false },
  { id: 'mecanismo', label: 'Mecanismo psicológico', seed: 'Que gatilho esta peça aciona? UM só: dor, perda, urgência, curiosidade, prova, autoridade, identificação ou aspiração.', essencial: false },
  { id: 'nivelConsciencia', label: 'Nível de consciência', seed: 'Essa pessoa já sabe que tem o problema? Já conhece soluções? Já conhece você?', essencial: false },
  { id: 'restricoes', label: 'Restrições / obrigatórios', seed: 'O que NÃO fazer e o que é obrigatório (logo, telefone)?', essencial: false },
]

export interface BriefGap { id: string; label: string; seed: string }
export interface BriefCoverage { pendentes: BriefGap[]; minDone: boolean }

export function briefCoverage(b: BriefEstruturado): BriefCoverage {
  
  
  
  const has = (id: keyof BriefEstruturado) => { const v = b[id]; return typeof v === 'string' ? !!v.trim() : !!v }
  const pendentes = BRIEF_SLOTS.filter((s) => s.essencial && !has(s.id)).map((s) => ({ id: String(s.id), label: s.label, seed: s.seed }))
  return { pendentes, minDone: has('objetivo') && has('oferta') }
}



export function mergeBrief(prev: BriefEstruturado, patch: Partial<BriefEstruturado>): BriefEstruturado {
  const out: BriefEstruturado = { ...prev }
  for (const [k, v] of Object.entries(patch) as [keyof BriefEstruturado, unknown][]) {
    if (v === undefined) continue
    if (typeof v === 'boolean') { (out as Record<string, unknown>)[k] = v; continue }
    const s = String(v).trim()
    if (s) (out as Record<string, unknown>)[k] = s
    else delete (out as Record<string, unknown>)[k]
  }
  return out
}
