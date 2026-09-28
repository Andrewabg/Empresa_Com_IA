
import type { StatusTarefa } from './linhaDoTempo'

export const ROTULO_DO_STATUS: Record<StatusTarefa, string> = {
  queued: 'Na fila',
  running: 'Trabalhando',
  needs_approval: 'Esperando você aprovar',
  needs_children: 'Esperando a equipe',
  done: 'Concluída',
  failed: 'Falhou',
  cancelled: 'Cancelada',
}


export const ROTULO_SEM_RESPOSTA = 'Terminou sem entregar'

export const COPY_TAREFAS = {
  tituloDaPagina: 'Tarefas',
  subtitulo: 'O caminho de cada pedido dentro da sua empresa.',
  vazio: 'Nenhum pedido passou pela equipe ainda. Quando você pedir algo que envolva mais de um agente, o caminho aparece aqui.',
  vazioComFiltro: 'Nada aqui com esse filtro.',
  filtroTudo: 'Tudo',
  filtroFalhas: 'Só o que falhou',
  filtroEsperando: 'Esperando você',
  semRastro: 'Este pedido é anterior ao registro do caminho, então não dá para mostrar por onde ele passou.',
  verAprovacao: 'Ver o que está esperando você',
  cancelar: 'Cancelar este objetivo',
  cancelarConfirma: 'Cancelar interrompe o que ainda não começou. O que já foi feito continua feito.',
  cancelado: 'Objetivo cancelado.',
  falhaAoCancelar: 'Não consegui cancelar agora. Tente de novo em instantes.',
  falhaAoAbrir: 'Não consegui abrir o caminho deste pedido agora.',
  travadoEm: 'Parou aqui',
  marcadorFalhou: 'Algo falhou dentro',
  falhouNoCockpit: 'parou no meio, veja onde',
  marcadorEsperando: 'Tem algo esperando você',
  duracaoAgora: 'até agora',
  carregando: 'Abrindo o caminho...',
  fechar: 'Fechar',
  resultadoTitulo: 'O que a tarefa entregou',
  resultadoTruncado: 'Mostrando só o começo. O texto completo é maior que isto.',
} as const
