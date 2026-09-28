


export interface ModeloFabrica { tipo: string; nome: string; skillSlug: string; descricao: string }

export const MODELOS_FABRICA: ModeloFabrica[] = [
  { tipo: 'prestacao-servico', nome: 'Prestação de serviços', skillSlug: 'contrato-prestacao-servico', descricao: 'Contrato de prestação de serviços entre empresa e cliente/fornecedor.' },
  { tipo: 'nda', nome: 'NDA / Confidencialidade', skillSlug: 'nda-confidencialidade', descricao: 'Acordo de confidencialidade (unilateral ou mútuo).' },
  { tipo: 'contratacao-pj', nome: 'Contratação PJ', skillSlug: 'contratacao-pj', descricao: 'Prestador recorrente PJ — com os cuidados anti "CLT disfarçado".' },
  { tipo: 'parceria', nome: 'Parceria / Fornecimento', skillSlug: 'parceria-fornecimento', descricao: 'Parceria comercial, revenda ou fornecimento recorrente.' },
  { tipo: 'distrato', nome: 'Distrato / Rescisão', skillSlug: 'distrato-rescisao', descricao: 'Encerramento de contrato existente com quitação.' },
]

export function getModeloFabrica(tipo: string): ModeloFabrica | null {
  const t = (tipo ?? '').trim().toLowerCase()
  return MODELOS_FABRICA.find((m) => m.tipo === t) ?? null
}
