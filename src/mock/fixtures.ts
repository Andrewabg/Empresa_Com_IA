

import type {
  MockBriefing,
  MockApproval,
  MockNote,
  MockCostPoint,
  MockCostSummary,
  MockMessage,
} from './types'



export const briefing: MockBriefing = {
  greeting: 'Bom dia, Nathan',
  body:
    'Enquanto você dormia, organizei 14 novas memórias sobre o projeto Awave, ' +
    'atualizei o backlog de sprint com 3 tarefas priorizadas pelo Curador e ' +
    'monitorei os custos de API — estamos 12% abaixo da projeção semanal. ' +
    'Há dois itens que precisam da sua aprovação antes de seguir: um PR no ' +
    'cérebro com ajuste na estratégia de preços, e uma ação de envio de e-mail ' +
    'para o parceiro de distribuição. Nada urgente, mas vale olhar hoje cedo.',
  date: '2026-06-23',
  highlights: [
    '14 novas memórias organizadas no cérebro',
    'Backlog atualizado com 3 tarefas priorizadas',
    'Custo 12% abaixo da projeção semanal',
    '2 aprovações pendentes para você',
  ],
}



export const approvals: MockApproval[] = [
  {
    id: 'apr-001',
    kind: 'brain_pr',
    title: 'Atualizar estratégia de precificação do plano Pro',
    diff: [
      '--- a/Projetos/Awave/estrategia-precos.md',
      '+++ b/Projetos/Awave/estrategia-precos.md',
      '@@ -12,7 +12,7 @@',
      ' ## Plano Pro',
      ' ',
      '-O plano Pro será lançado a R$ 397/mês com limite de 3 agentes ativos.',
      '+O plano Pro será lançado a R$ 497/mês com limite de 5 agentes ativos.',
      ' ',
      ' Esta decisão baseia-se na análise de concorrentes realizada em junho/2026.',
      ' ',
      '@@ -21,4 +21,6 @@',
      ' ## Plano Enterprise',
      ' ',
      ' Negociação direta, mínimo R$ 2.000/mês.',
      '+',
      '+_Revisado pelo Curador em 2026-06-23 com base no feedback do parceiro Nexo._',
    ].join('\n'),
    agent: 'curator-agent',
    reason: 'PR #47 — ajuste de preço pós-reunião com parceiro Nexo (2026-06-22). Ver commit abc1234.',
    createdAt: '2026-06-23T06:14:33Z',
  },
  {
    id: 'apr-002',
    kind: 'tool_action',
    title: 'Enviar e-mail de follow-up para parceiro de distribuição',
    action: {
      sentence: 'Enviar e-mail para marcos@nexo.com.br com proposta comercial do plano Enterprise',
      principais: [
        { label: 'Para', valor: 'marcos@nexo.com.br' },
        { label: 'Assunto', valor: 'Proposta Awave Enterprise — Nexo Ventures' },
        { label: 'Ferramenta', valor: 'Gmail via Composio' },
        { label: 'Quando', valor: 'agora' },
        { label: 'Anexos', valor: 'nenhum' },
      ],
      detalhes: [],
    },
    agent: 'sales-agent',
    reason:
      'O agente de vendas identificou que o follow-up está em atraso (4 dias sem resposta). ' +
      'O e-mail reafirma a proposta de R$ 2.000/mês e solicita reunião para a próxima semana.',
    createdAt: '2026-06-23T06:47:11Z',
  },
  {
    id: 'apr-003',
    kind: 'tool_action',
    title: 'Criar campanha paga no Meta Ads para aquisição de leads',
    action: {
      sentence: 'Gastar R$ 300,00 no Meta Ads para campanha de geração de leads (audiência: fundadores de startups BR)',
      principais: [
        { label: 'Plataforma', valor: 'Meta Ads via Composio' },
        { label: 'Orçamento', valor: 'R$ 300,00' },
        { label: 'Duração', valor: '7 dias' },
        { label: 'Audiência', valor: 'Fundadores e co-fundadores de startups, Brasil, 25–45 anos' },
        { label: 'Objetivo', valor: 'Geração de leads — landing page Awave' },
        { label: 'Aprovado por', valor: 'pendente' },
      ],
      detalhes: [],
    },
    agent: 'growth-agent',
    reason:
      'O agente de growth identificou janela de custo-por-lead favorável esta semana ' +
      '(CPL estimado R$ 18–24 com base em benchmarks do setor). Campanha planejada em Areas/Marketing/campanhas-q2.md.',
    createdAt: '2026-06-23T07:02:55Z',
  },
]



export const notes: MockNote[] = [
  
  {
    id: 'note-001',
    path: 'Projetos/Awave/sprint-backlog.md',
    title: 'Backlog do Sprint — Awave v1',
    snippet:
      'Tarefas priorizadas para a sprint atual: Chunk 3 (mock layer), Chunk 4 (Command Center), ' +
      'Chunk 5 (Conversa por voz). Critério de prioridade: impacto no momento uau.',
    author_agent: 'curator-agent',
    updatedAt: '2026-06-23T05:58:00Z',
  },
  {
    id: 'note-002',
    path: 'Projetos/Awave/estrategia-precos.md',
    title: 'Estratégia de Precificação',
    snippet:
      'Plano Starter R$ 197/mês · Plano Pro R$ 497/mês (5 agentes) · Enterprise sob consulta. ' +
      'Revisado pós-feedback do parceiro Nexo em junho/2026.',
    author_agent: 'curator-agent',
    updatedAt: '2026-06-23T06:14:33Z',
  },
  {
    id: 'note-003',
    path: 'Projetos/Awave/decisoes-arquitetura.md',
    title: 'Decisões de Arquitetura — v1',
    snippet:
      'Stack: Next.js + Supabase + OpenAI Realtime. Onda em Canvas/WebGL. ' +
      'Mock layer pure TS (sem brain) para desenvolvimento paralelo da UI.',
    author_agent: 'curator-agent',
    updatedAt: '2026-06-22T23:40:10Z',
  },
  
  {
    id: 'note-004',
    path: 'Areas/Marketing/campanhas-q2.md',
    title: 'Campanhas de Marketing — Q2 2026',
    snippet:
      'Meta Ads: orçamento R$ 1.200/mês, CPL alvo R$ 20. LinkedIn: conteúdo orgânico semanal ' +
      '(thread de fundador). Produção de caso de uso com parceiro Nexo.',
    author_agent: 'growth-agent',
    updatedAt: '2026-06-22T21:15:44Z',
  },
  {
    id: 'note-005',
    path: 'Areas/Financeiro/controle-custos-api.md',
    title: 'Controle de Custos de API',
    snippet:
      'Custo médio diário: US$ 4,20 (OpenAI) + US$ 0,80 (Supabase). ' +
      'Projeção mensal: US$ 150. Orçamento aprovado: US$ 200/mês.',
    author_agent: 'finance-agent',
    updatedAt: '2026-06-23T05:30:00Z',
  },
  
  {
    id: 'note-006',
    path: 'Recursos/Tecnologia/stack-referencia.md',
    title: 'Stack de Referência — Empresas de IA',
    snippet:
      'Referências técnicas coletadas: Linear (UI de densidade calma), ' +
      'Arc (comandos por voz), Vercel (observabilidade de custo). Aplicadas ao design system Awave.',
    author_agent: 'research-agent',
    updatedAt: '2026-06-21T18:22:37Z',
  },
  {
    id: 'note-007',
    path: 'Recursos/Parceiros/nexo-ventures.md',
    title: 'Nexo Ventures — Perfil do Parceiro',
    snippet:
      'Fundo de venture focado em SaaS B2B Brasil. Contato: Marcos Teixeira (marcos@nexo.com.br). ' +
      'Interesse declarado em distribuir Awave para portfolio. Reunião inicial: 2026-06-19.',
    author_agent: 'sales-agent',
    updatedAt: '2026-06-22T14:05:22Z',
  },
  
  {
    id: 'note-008',
    path: 'Arquivo/Experimentos/poc-onda-webgl.md',
    title: 'PoC — Onda em WebGL (arquivado)',
    snippet:
      'Experimento com shader GLSL para a Onda. Resultado: viável, mas Canvas 2D é suficiente para v1. ' +
      'Arquivado para referência quando escalar para efeito de partículas.',
    author_agent: 'curator-agent',
    updatedAt: '2026-06-20T11:48:00Z',
  },
]



const costSeries: MockCostPoint[] = [
  { date: '2026-06-09', usd: 3.82, byAgent: { 'curator-agent': 1.20, 'research-agent': 1.50, 'growth-agent': 0.80, 'finance-agent': 0.32 }, byTool: { openai: 3.10, supabase: 0.72 } },
  { date: '2026-06-10', usd: 4.11, byAgent: { 'curator-agent': 1.40, 'research-agent': 1.20, 'growth-agent': 1.10, 'finance-agent': 0.41 }, byTool: { openai: 3.35, supabase: 0.76 } },
  { date: '2026-06-11', usd: 3.65, byAgent: { 'curator-agent': 1.10, 'research-agent': 0.90, 'growth-agent': 1.30, 'finance-agent': 0.35 }, byTool: { openai: 2.90, supabase: 0.75 } },
  { date: '2026-06-12', usd: 4.48, byAgent: { 'curator-agent': 1.60, 'research-agent': 1.70, 'growth-agent': 0.70, 'finance-agent': 0.48 }, byTool: { openai: 3.65, supabase: 0.83 } },
  { date: '2026-06-13', usd: 5.20, byAgent: { 'curator-agent': 2.00, 'research-agent': 1.80, 'growth-agent': 0.90, 'finance-agent': 0.50 }, byTool: { openai: 4.35, supabase: 0.85 } },
  { date: '2026-06-14', usd: 2.10, byAgent: { 'curator-agent': 0.80, 'research-agent': 0.60, 'growth-agent': 0.40, 'finance-agent': 0.30 }, byTool: { openai: 1.50, supabase: 0.60 } },
  { date: '2026-06-15', usd: 1.95, byAgent: { 'curator-agent': 0.70, 'research-agent': 0.50, 'growth-agent': 0.45, 'finance-agent': 0.30 }, byTool: { openai: 1.40, supabase: 0.55 } },
  { date: '2026-06-16', usd: 4.33, byAgent: { 'curator-agent': 1.50, 'research-agent': 1.40, 'growth-agent': 0.90, 'finance-agent': 0.53 }, byTool: { openai: 3.55, supabase: 0.78 } },
  { date: '2026-06-17', usd: 4.67, byAgent: { 'curator-agent': 1.70, 'research-agent': 1.55, 'growth-agent': 0.85, 'finance-agent': 0.57 }, byTool: { openai: 3.82, supabase: 0.85 } },
  { date: '2026-06-18', usd: 3.98, byAgent: { 'curator-agent': 1.30, 'research-agent': 1.20, 'growth-agent': 1.00, 'finance-agent': 0.48 }, byTool: { openai: 3.20, supabase: 0.78 } },
  { date: '2026-06-19', usd: 5.45, byAgent: { 'curator-agent': 2.10, 'research-agent': 1.90, 'growth-agent': 0.90, 'finance-agent': 0.55 }, byTool: { openai: 4.60, supabase: 0.85 } },
  { date: '2026-06-20', usd: 4.10, byAgent: { 'curator-agent': 1.40, 'research-agent': 1.30, 'growth-agent': 0.90, 'finance-agent': 0.50 }, byTool: { openai: 3.30, supabase: 0.80 } },
  { date: '2026-06-21', usd: 4.88, byAgent: { 'curator-agent': 1.80, 'research-agent': 1.60, 'growth-agent': 0.90, 'finance-agent': 0.58 }, byTool: { openai: 4.00, supabase: 0.88 } },
  { date: '2026-06-22', usd: 4.20, byAgent: { 'curator-agent': 1.50, 'research-agent': 1.30, 'growth-agent': 0.90, 'finance-agent': 0.50 }, byTool: { openai: 3.42, supabase: 0.78 } },
]

export const cost: MockCostSummary = {
  budgetUsd: 200,
  spentUsd: 56.92,
  remainingUsd: 143.08,
  topAgents: [
    { agent: 'curator-agent', usd: 20.10 },
    { agent: 'research-agent', usd: 18.45 },
    { agent: 'growth-agent', usd: 12.10 },
    { agent: 'finance-agent', usd: 6.27 },
  ],
  topTools: [
    { tool: 'openai', usd: 46.14 },
    { tool: 'supabase', usd: 10.78 },
  ],
  series: costSeries,
}



export const conversation: MockMessage[] = [
  {
    id: 'msg-001',
    role: 'user',
    text: 'Nathan, qual é o status do projeto Awave hoje?',
    at: '2026-06-23T07:30:00Z',
  },
  {
    id: 'msg-002',
    role: 'jarvis',
    text:
      'Bom dia, Nathan! O Awave está avançando bem. ' +
      'Os Chunks 1 e 2 estão completos — o frame da UI e a Onda já estão construídos e testados. ' +
      'Agora estamos no Chunk 3, criando a camada mock com fixtures, eventBus e o orquestrador do momento uau. ' +
      'Há 2 aprovações pendentes para você revisar: um PR de atualização de preços e um e-mail para o parceiro Nexo. ' +
      'Quer que eu detalhe algum desses?',
    at: '2026-06-23T07:30:04Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    text: 'Sim, me conta mais sobre o PR de preços.',
    at: '2026-06-23T07:30:28Z',
  },
  {
    id: 'msg-004',
    role: 'jarvis',
    text:
      'O PR #47 atualiza o arquivo Projetos/Awave/estrategia-precos.md com duas mudanças principais: ' +
      'o Plano Pro sobe de R$ 397 para R$ 497/mês, e o limite de agentes ativos passa de 3 para 5. ' +
      'A justificativa é o feedback do Marcos na reunião de ontem — ele comparou com concorrentes que cobram ' +
      'entre R$ 450–600 para funcionalidades equivalentes, e o aumento abre margem para suporte dedicado. ' +
      'O diff completo está na Central de Aprovações. Aprovo?',
    at: '2026-06-23T07:30:31Z',
  },
  {
    id: 'msg-005',
    role: 'user',
    text: 'Faz sentido. Pode aprovar.',
    at: '2026-06-23T07:31:10Z',
  },
  {
    id: 'msg-006',
    role: 'jarvis',
    text:
      'Perfeito. Aprovando o PR #47 agora — o Curador vai fazer o merge e registrar a decisão no cérebro. ' +
      'Você verá a memória nova aparecer no feed "Ao vivo" em instantes.',
    at: '2026-06-23T07:31:12Z',
  },
]
