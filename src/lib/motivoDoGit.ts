
export type EtapaDoGit = 'baixar' | 'backup' | 'enviar'

const http = (codigos: string) => new RegExp(`(returned error|HTTP)[:\\s]+(${codigos})\\b`, 'i')



const WORKFLOW = /without `?workflows?`? (scope|permission)|refusing to allow .* to create or update workflow/i
const ARQUIVADO = /repository was archived|archived so it is read-only/i
const SSO = /SAML SSO|re-authorize the token|enforced SAML|organization SAML enforcement/i







const SEGREDO = /push cannot contain secrets|secret scanning|push protection/i
const CAMINHO_DO_SEGREDO = /path:\s*(\S+)/gi
const REGRA = /GH006|GH013|protected branch update failed|rule violations? found/i
const PERMISSAO = new RegExp(`${http('403').source}|permission to .* denied|write access|permission denied|not allowed to push`, 'i')
const CREDENCIAL = new RegExp(`${http('401').source}|authentication failed|invalid username or (password|token)|bad credentials`, 'i')
const NAO_ACHOU = new RegExp(`repository not found|repository '[^']*' not found|${http('404').source}`, 'i')
const REDE = new RegExp(`could not resolve host|failed to connect|timed out|connection (reset|refused)|network is unreachable|early EOF|RPC failed|${http('50[0-4]').source}`, 'i')

const INICIO: Record<EtapaDoGit, string> = {
  baixar: 'Não consegui baixar o seu repositório do Empresa IA para atualizar. Nada foi alterado.',
  backup: 'Não consegui salvar o backup das suas modificações antes de atualizar. Nada foi alterado.',
  
  
  enviar: 'Não consegui enviar a atualização para o seu repositório do Empresa IA. Nada foi alterado no seu código.',
}

function respostaCrua(inicio: string, erroDoGit: string): string {
  const detalhe = erroDoGit.replace(/\s+/g, ' ').trim().slice(0, 240)
  return detalhe ? `${inicio} Resposta do GitHub: ${detalhe}` : inicio
}

export function motivoDoGitFalho(erroDoGit: string, etapa: EtapaDoGit, branch: string): string {
  const inicio = INICIO[etapa]
  
  
  if (etapa === 'enviar' && SEGREDO.test(erroDoGit)) {
    const todos = [...new Set([...erroDoGit.matchAll(CAMINHO_DO_SEGREDO)].map((m) => m[1]))]
    const lista = todos.slice(0, 5).join(', ') + (todos.length > 5 ? ' e outros' : '')
    const onde = todos.length ? ` (${lista})` : ''
    return `${inicio} O GitHub bloqueou o envio porque encontrou o que parece ser uma senha ou chave de acesso num arquivo da atualização${onde}. O problema está na versão nova, não no seu repositório: fale com o suporte e mande esta mensagem.`
  }
  if (WORKFLOW.test(erroDoGit)) {
    return `${inicio} O repositório tem arquivos em .github/workflows, e o token do GitHub não tem a permissão de Workflows para mexer neles. Dê essa permissão ao token (ou tire a pasta .github/workflows do repositório) e atualize de novo.`
  }
  if (ARQUIVADO.test(erroDoGit)) {
    return `${inicio} O repositório do Empresa IA está arquivado no GitHub, e repositório arquivado não aceita envio. Desarquive nas configurações dele e atualize de novo.`
  }
  if (SSO.test(erroDoGit)) {
    return `${inicio} A organização do GitHub exige autorizar o token por SSO. Autorize o token para a organização nas configurações de tokens do GitHub e atualize de novo.`
  }
  if (REGRA.test(erroDoGit)) {
    const alvo = etapa === 'backup' ? `criar o branch ${branch}` : 'enviar direto para o branch principal'
    return `${inicio} O repositório do Empresa IA tem uma regra no GitHub que impede ${alvo}. Ajuste as regras do repositório para liberar isso e atualize de novo.`
  }
  if (PERMISSAO.test(erroDoGit)) {
    return `${inicio} O token do GitHub não tem permissão de escrita no repositório do Empresa IA. Ele precisa escrever nos dois repositórios, o do Cérebro e o do Empresa IA. Ajuste a permissão do token no GitHub (ou gere outro) e salve em Configuração.`
  }
  if (CREDENCIAL.test(erroDoGit)) {
    return `${inicio} O GitHub recusou o token salvo, que pode ter vencido ou sido apagado. Gere outro token com permissão de escrita nos dois repositórios e salve em Configuração.`
  }
  if (NAO_ACHOU.test(erroDoGit)) {
    return `${inicio} O GitHub não encontrou o repositório do Empresa IA com o token salvo. Confira o nome do repositório em Configuração e se o token tem acesso a ele.`
  }
  if (REDE.test(erroDoGit)) {
    return `${inicio} Não consegui falar com o GitHub agora. Tente de novo em alguns minutos.`
  }
  return respostaCrua(inicio, erroDoGit)
}
