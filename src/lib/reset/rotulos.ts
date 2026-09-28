import type { CategoriaId } from './tipos'
import { DEFAULT_BRANDING } from '@/lib/branding'

export interface RotuloCategoria {
  titulo: string
  descricao: string
}


export function montarRotulos(nomeAssistente: string): Record<CategoriaId, RotuloCategoria> {
  return {
    trabalho: {
      titulo: 'Trabalho e operação',
      descricao:
        'tarefas, conversas, aprovações, campanhas, contratos, custos e tudo que foi feito até agora; a empresa e os agentes ficam intactos',
    },
    memoria: {
      titulo: 'Memória dos agentes',
      descricao:
        'o aprendizado acumulado de cada agente: diretivas, casos de treino, memória de conta e base de conhecimento do atendente; e a memória sempre-lida do assistente (os fatos confirmados da empresa e o que ele aprendeu sobre você)',
    },
    agentes: {
      titulo: 'Agentes contratados',
      descricao:
        `os agentes contratados e tudo ligado a eles: memória, tarefas, os canais que eles atendem, as automações de comentário do Instagram que estão no nome deles, com as mensagens e o histórico delas, e os comentários recebidos nesses canais (fica só o ${nomeAssistente} e o COO de fábrica)`,
    },
    cerebro: {
      titulo: 'Cérebro (base de notas)',
      descricao:
        'o índice do Cérebro e as notas no seu GitHub: um commit zera as notas (recuperável pelo histórico do git); suas skills instaladas ficam',
    },
    equipe: {
      titulo: 'Acessos de equipe',
      descricao:
        'convites e membros adicionados (co-donos e gestores); você continua como dono e seu acesso é preservado',
    },
    credenciais: {
      titulo: 'Credenciais e integrações',
      descricao:
        'chaves de API que você configurou (OpenAI, GitHub, Composio, WhatsApp, Telegram e outras) e as conexões com banco de dados que você ligou em Fontes de dados; as perguntas aprovadas e o histórico delas somem junto, porque dependem dessas conexões; o sistema vai pedir para reconectar',
    },
    identidade: {
      titulo: 'Identidade e marca',
      descricao:
        'recomeçar do zero: apaga a empresa inteira e volta ao ritual de nascimento (nome, missão, estilo e marca são apagados)',
    },
  }
}


export const ROTULOS: Record<CategoriaId, RotuloCategoria> = montarRotulos(
  DEFAULT_BRANDING.assistantName,
)
