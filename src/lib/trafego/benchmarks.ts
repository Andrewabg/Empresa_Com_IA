



import type { ArquetipoConta, FrameConta } from '@/lib/trafego/perfilConta'
import type { FaixaNormal } from '@/lib/trafego/baseline'


export interface FaixaBenchmark { baixo: number; tipico: number; alto: number }

export interface BenchmarkNicho {
  arquetipo: ArquetipoConta
  nicho?: string          
  cpm?: FaixaBenchmark    
  ctr?: FaixaBenchmark    
  hook?: FaixaBenchmark   
  kpi?: FaixaBenchmark    
  fonte: string
  versao: number
}


export const NICHOS_POR_ARQUETIPO: Record<ArquetipoConta, readonly string[]> = {
  ecommerce: ['moda', 'suplemento', 'beleza'],
  infoproduto: [],
  'lead-gen': ['advocacia', 'estetica-local', 'imobiliario'],
  'servico-local': [],
}


export const NICHO_LABEL: Record<string, string> = {
  moda: 'Moda / Vestuário', suplemento: 'Suplemento / Saúde', beleza: 'Beleza / Cosmético',
  advocacia: 'Advocacia', 'estetica-local': 'Estética / Saúde local', imobiliario: 'Imobiliário',
}

















const BENCHMARKS: readonly BenchmarkNicho[] = [
  {
    arquetipo: 'ecommerce',
    kpi: { baixo: 1.2, tipico: 2.0, alto: 4.0 },
    cpm: { baixo: 12, tipico: 22, alto: 40 },
    ctr: { baixo: 0.009, tipico: 0.015, alto: 0.028 },
    hook: { baixo: 0.20, tipico: 0.30, alto: 0.42 },
    fonte: 'ROAS platform-reported Meta (a mesma metrica do purchase_roas que o Rui le): mediana ~1,93x, media ~2,2 a 2,87x, distribuicao assimetrica (WordStream/Focus/Triple Whale 2025, ~35k marcas); topo alargado p/ 4,0x. CPM Brasil Trafius 2026; CTR WordStream 2024; hook global 2025. Banda larga.',
    versao: 3,
  },
  {
    arquetipo: 'ecommerce', nicho: 'moda',
    kpi: { baixo: 1.3, tipico: 2.2, alto: 3.8 },
    cpm: { baixo: 12, tipico: 20, alto: 38 },
    ctr: { baixo: 0.008, tipico: 0.013, alto: 0.025 },
    hook: { baixo: 0.22, tipico: 0.33, alto: 0.45 },
    fonte: 'ROAS apparel Meta 2,18x (Triple Whale 2025); CTR link apparel 1,29% (WordStream 2025 US); CPM moda/beleza Brasil Trafius 2026; hook rate moda 2025 (global, visual). Banda larga.',
    versao: 2,
  },
  {
    arquetipo: 'ecommerce', nicho: 'suplemento',
    kpi: { baixo: 1.0, tipico: 1.7, alto: 3.0 },
    cpm: { baixo: 18, tipico: 30, alto: 50 },
    ctr: { baixo: 0.009, tipico: 0.016, alto: 0.030 },
    hook: { baixo: 0.20, tipico: 0.30, alto: 0.40 },
    fonte: 'ROAS saude/wellness Meta 1,50x (Triple Whale 2025, abaixo da mediana); CTR link health 1,63% (WordStream 2025 US); CPM saude/clinicas Brasil Trafius 2026. Banda larga.',
    versao: 2,
  },
  {
    arquetipo: 'ecommerce', nicho: 'beleza',
    kpi: { baixo: 1.0, tipico: 1.6, alto: 3.0 },
    cpm: { baixo: 12, tipico: 22, alto: 42 },
    ctr: { baixo: 0.011, tipico: 0.018, alto: 0.032 },
    hook: { baixo: 0.25, tipico: 0.36, alto: 0.48 },
    fonte: 'ROAS beleza Meta 1,57x (Triple Whale 2025, abaixo da mediana); CTR link beauty 1,81% (WordStream 2025 US); CPM moda/beleza Brasil Trafius 2026; hook rate DTC beleza 35-40% 2025 (global). Banda larga.',
    versao: 2,
  },
  {
    arquetipo: 'infoproduto',
    kpi: { baixo: 1.2, tipico: 2.5, alto: 5.0 },
    cpm: { baixo: 12, tipico: 24, alto: 45 },
    ctr: { baixo: 0.009, tipico: 0.016, alto: 0.030 },
    fonte: 'ROAS infoproduto tende a superar ecommerce (LTV/margem alta); faixa boa 2:1 a 5:1 (agencias BR 2025); CPM infoprodutos/cursos Brasil Trafius 2026 (R$18-32, banda estendida). Banda larga (ROAS de infoproduto varia muito por oferta/lancamento).',
    versao: 2,
  },
  {
    arquetipo: 'lead-gen',
    kpi: { baixo: 8, tipico: 21, alto: 55 },
    cpm: { baixo: 10, tipico: 22, alto: 45 },
    ctr: { baixo: 0.012, tipico: 0.022, alto: 0.040 },
    fonte: 'CPL mediana Brasil ~R$21 em 2025 (swings R$3-64, SuperAds/relatorios BR); CTR de campanha de LEAD por industria 1,46 a 3,71% (WordStream 2024 US), centro ~2,2%; CPM geral Brasil Trafius 2026. Banda MUITO larga (CPL BR volatil).',
    versao: 3,
  },
  {
    arquetipo: 'lead-gen', nicho: 'advocacia',
    kpi: { baixo: 15, tipico: 40, alto: 100 },
    cpm: { baixo: 18, tipico: 35, alto: 65 },
    ctr: { baixo: 0.009, tipico: 0.016, alto: 0.028 },
    fonte: 'CPL advocacia premium/competitivo: R$15-45 tipico em consumidor/trabalhista/previdenciario (agencias BR 2025), esticado p/ cima (legal e o CPL mais caro globalmente, WordStream 2024 US $104); CTR de LEAD legal 1,61% (WordStream 2024, uma das MENORES industrias). Banda MUITO larga.',
    versao: 3,
  },
  {
    arquetipo: 'lead-gen', nicho: 'estetica-local',
    kpi: { baixo: 6, tipico: 18, alto: 45 },
    cpm: { baixo: 15, tipico: 30, alto: 55 },
    ctr: { baixo: 0.013, tipico: 0.024, alto: 0.042 },
    fonte: 'CPL estetica local perto/abaixo da mediana Brasil ~R$21 (lead local de baixa friccao); CPM saude/clinicas Brasil Trafius 2026; CTR link leads ~2,5% (WordStream 2025 US). Banda MUITO larga.',
    versao: 2,
  },
  {
    arquetipo: 'lead-gen', nicho: 'imobiliario',
    kpi: { baixo: 10, tipico: 30, alto: 90 },
    cpm: { baixo: 18, tipico: 35, alto: 60 },
    ctr: { baixo: 0.020, tipico: 0.037, alto: 0.055 },
    fonte: 'CPL imobiliario R$5-20 (popular) a R$40-100 (alto padrao) segundo agencias BR 2025; imobiliario e o MAIOR CTR de LEAD, 3,71% (WordStream 2024 US); CPM imobiliario Brasil Trafius 2026 (R$25-45). Banda MUITO larga (varia por padrao do imovel).',
    versao: 3,
  },
  {
    arquetipo: 'servico-local',
    kpi: { baixo: 8, tipico: 22, alto: 55 },
    cpm: { baixo: 8, tipico: 18, alto: 35 },
    ctr: { baixo: 0.012, tipico: 0.021, alto: 0.038 },
    fonte: 'CPL servico local ancorado na mediana Brasil ~R$21 em 2025; CPM servicos locais Brasil Trafius 2026 (R$10-22, banda estendida); CTR link leads/home services ~2% (WordStream 2025 US). Banda MUITO larga.',
    versao: 2,
  },
]


export function faixaDeBenchmark(b: FaixaBenchmark): FaixaNormal {
  return { metric: 'benchmark', mediana: b.tipico, p25: b.baixo, p75: b.alto, n: 0 }
}


export function benchmarkDe(frame: FrameConta): BenchmarkNicho | null {
  if (frame.nicho) {
    const exato = BENCHMARKS.find((b) => b.arquetipo === frame.arquetipo && b.nicho === frame.nicho)
    if (exato) return exato
  }
  return BENCHMARKS.find((b) => b.arquetipo === frame.arquetipo && b.nicho === undefined) ?? null
}
