



import type { MetricShape } from '@/lib/trafego/types'
import type { AccountBaseline } from '@/lib/trafego/baseline'
import type { LeituraConta } from '@/lib/trafego/leituraConta'
import type { SaudeConta } from '@/lib/trafego/saudeConta'
import type { EntregaVeredito } from '@/lib/trafego/entregaParada'
import { fmtBRL } from '@/lib/trafego/format'

const fmtRoasMult = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x'


export const QUEDA_DD = 0.30       
export const SINAL_PISO_BRL = 50   
export const CPA_FATOR = 1.3       
export const ROAS_FATOR = 0.7      

export type TipoAlerta =
  | 'sinal_quebrado'
  | 'queda_conversao'
  | 'cpa_disparou'
  | 'conta_nao_ativa'
  | 'anuncio_reprovado'
  | 'spend_cap_perto'
  | 'entrega_parada'
  | 'orcamento_esgotado'

export interface AlertaTrafego {
  tipo: TipoAlerta
  severidade: 'alta' | 'media'
  
  texto: string
  
  danoEvitado?: number
}

export interface VigilanciaInput {
  contaNome: string
  atual: MetricShape
  
  baseline: AccountBaseline
  ontem?: MetricShape
  leitura?: LeituraConta
  
  dowHoje?: number
}

export function detectarAlertas(input: VigilanciaInput): AlertaTrafego[] {
  const { atual, baseline, ontem, leitura, dowHoje } = input
  const conta = input.contaNome
  const out: AlertaTrafego[] = []
  if (!baseline.suficiente) return out

  const faixaRoas = baseline.faixas.roas
  const faixaCpa = baseline.faixas.cpa
  const spend = atual.spend ?? 0
  const conv = atual.conversions ?? 0

  
  if (faixaRoas !== undefined && spend >= SINAL_PISO_BRL && conv === 0) {
    out.push({
      tipo: 'sinal_quebrado', severidade: 'alta', danoEvitado: spend,
      texto: `🚨 ${conta}: gastou ${fmtBRL(spend)} e ZERO conversões — o pixel/CAPI pode ter caído. Cheque o Gerenciador de Eventos.`,
    })
  }

  
  if (atual.roas !== undefined) {
    const anomaliaForte = faixaRoas !== undefined && atual.roas < faixaRoas.p25 * ROAS_FATOR
    const quedaDD = ontem?.roas ? (ontem.roas - atual.roas) / ontem.roas >= QUEDA_DD : false
    const ehPiorDia = leitura?.ritmoRoas !== undefined && dowHoje === leitura.ritmoRoas.piorDia
    if (anomaliaForte || (quedaDD && !ehPiorDia)) {
      let detalhe: string
      if (anomaliaForte && faixaRoas !== undefined) {
        detalhe = `bem abaixo do normal (p25 ${fmtRoasMult(faixaRoas.p25)})`
      } else if (ontem?.roas) {
        detalhe = `caiu ${Math.round(((ontem.roas - atual.roas) / ontem.roas) * 100)}% vs ontem`
      } else {
        detalhe = 'abaixo do esperado'
      }
      out.push({ tipo: 'queda_conversao', severidade: 'alta', texto: `📉 ${conta}: ROAS ${fmtRoasMult(atual.roas)}, ${detalhe}.` })
    }
  }

  
  if (atual.cpa !== undefined && faixaCpa !== undefined && atual.cpa > faixaCpa.p75 * CPA_FATOR) {
    out.push({
      tipo: 'cpa_disparou', severidade: 'media',
      texto: `📈 ${conta}: CPA ${fmtBRL(atual.cpa)}, acima do normal (p75 ${fmtBRL(faixaCpa.p75)}).`,
    })
  }

  return out
}


export function precisaSync(
  marcadorISO: string | null | undefined,
  agoraISO: string,
  intervaloHoras: number,
): boolean {
  if (!marcadorISO) return true
  return (Date.parse(agoraISO) - Date.parse(marcadorISO)) >= intervaloHoras * 3_600_000
}


export function alertasSaude(saude: SaudeConta, contaNome: string): AlertaTrafego[] {
  const out: AlertaTrafego[] = []

  if (saude.contaProblema) {
    const motivo = saude.motivoConta ?? 'Problema na conta'
    out.push({
      tipo: 'conta_nao_ativa',
      severidade: 'alta',
      texto: `🔴 ${contaNome}: ${motivo}. Acesse o Gerenciador de Anuncios e resolva antes de veicular.`,
    })
  }

  if (saude.reprovadosCount > 0) {
    out.push({
      tipo: 'anuncio_reprovado',
      severidade: 'alta',
      texto: `⛔ ${contaNome}: ${saude.reprovadosCount} anuncio(s) reprovado(s). Revise as pecas no Gerenciador para retomar a entrega.`,
    })
  }

  if (saude.spendCapPertoDoTeto) {
    out.push({
      tipo: 'spend_cap_perto',
      severidade: 'media',
      texto: `💳 ${contaNome}: limite de gasto da conta quase atingido. Aumente o teto no Gerenciador para nao pausar as campanhas.`,
    })
  }

  return out
}


export const RESTANTE_ESGOTADO = 0.02

export const HORA_FIM_DE_DIA = 21

export interface OrcamentoCampanha {
  nome: string
  
  restante?: number
  
  diario?: number
}


export function alertasEntrega(v: EntregaVeredito, contaNome: string): AlertaTrafego[] {
  if (!v.quebrou) return []
  const pct = Math.round(v.razao * 100)
  return [{
    tipo: 'entrega_parada',
    severidade: 'alta',
    danoEvitado: Math.max(v.mediaReferencia - v.projetado, 0),
    texto: `🛑 ${contaNome}: a entrega caiu para ${pct}% do ritmo das ultimas horas `
      + `(${fmtBRL(v.projetado)}/h contra ${fmtBRL(v.mediaReferencia)}/h). `
      + `Cheque se algum conjunto voltou pra aprendizado ou se o orcamento acabou.`,
  }]
}


export function alertasOrcamento(
  campanhas: OrcamentoCampanha[], contaNome: string, horaAtual: number,
): AlertaTrafego[] {
  if (horaAtual >= HORA_FIM_DE_DIA) return []
  const out: AlertaTrafego[] = []
  for (const c of campanhas) {
    if (c.diario === undefined || c.diario <= 0 || c.restante === undefined) continue
    if (c.restante > c.diario * RESTANTE_ESGOTADO) continue
    out.push({
      tipo: 'orcamento_esgotado',
      severidade: 'media',
      texto: `💸 ${contaNome}: a campanha ${c.nome} ja gastou quase tudo `
        + `(restam ${fmtBRL(c.restante)} de ${fmtBRL(c.diario)}) e ainda sao ${horaAtual}h. `
        + `Ela para de entregar pelo resto do dia.`,
    })
  }
  return out
}
