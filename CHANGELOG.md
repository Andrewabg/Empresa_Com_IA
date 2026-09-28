# Changelog — Awave Agents

Mudanças por release (tags `vX.Y.Z`). A release entregue ao comprador é a apontada pelo
ponteiro de release no Hub; o guia de atualização é o `docs/DEPLOY.md §7`. Mais novo primeiro.

## [v1.29.3] — 2026-09-27

### 🧠 "Reconstruir índice" do Cérebro volta a terminar

Em Cérebros com muitas notas (a partir de algumas centenas), a reconstrução do índice falhava com
*"prune edges: Bad Request"* — e, como ela não chegava ao fim, o sistema tentava de novo a cada
ciclo de manutenção e falhava igual, sem parar. O aviso de "problemas no seu Cérebro" também
ficava congelado no mesmo número, porque o recálculo vinha depois.

A limpeza das notas que saíram do repositório agora é feita em partes, e a reconstrução termina.

> **O benefício:** o botão volta a funcionar em Cérebro grande, e o aviso de problemas volta a
> refletir o que está de fato no seu acervo.

## [v1.29.2] — 2026-09-25

Versão de correção. As duas vieram de posts em *Reportar bugs* que os autores **reabriram** — nos
dois casos a correção anterior tinha resolvido um vizinho do problema, e não ele.

### 🧠 O que você recusou não volta a ser proposto

Um fato que você rejeitou na fila de aprovações podia reaparecer dias depois, igualzinho, como se
fosse novidade. Bastava a conversa tocar no assunto de novo: o fato era extraído outra vez e virava
um pedido novo — e a trava que existia comparava o pedido, não o texto. Quem tinha recusado vinte
coisas na semana via uma leva inteira voltar ao tocar num tema.

Agora um texto recusado não é mais proposto. Nem no mesmo dia, nem depois.

> **O benefício:** a fila de aprovações para de repetir o que você já decidiu.

Um limite que vale saber: a trava é do **texto**. Se o mesmo assunto voltar reescrito, com outra
palavra ou um dado a mais, ele conta como outro texto e aparece — de propósito, porque um fato
corrigido precisa poder chegar até você.

### 🔎 Agente novo pode nascer sabendo pesquisar na web

Algumas ferramentas não pedem login nem chave — a busca na web é uma delas. Só que a tela que monta
um agente novo só oferecia ferramentas *conectadas*, e essa nunca vai estar "conectada", porque não
há o que conectar. O resultado é que ela não aparecia como opção, e não havia como equipar um agente
com pesquisa na hora de contratá-lo.

Agora as ferramentas que dispensam conexão entram na lista, e o cargo que precisa pesquisar já nasce
podendo.

> **O benefício:** um agente de prospecção ou pesquisa sai pronto da contratação.

ℹ️ Para um agente **que já existe**, isso sempre foi possível e continua sendo: abra o agente, vá em
**Ferramentas** e ligue a ferramenta de busca.

## [v1.29.1] — 2026-09-20

### 💬 As respostas do chat ficaram mais fáceis de ler

Todos os agentes passam a organizar o que escrevem na tela: título quando a resposta tem mais
de uma parte, negrito só no número ou na decisão que importa, e tabela de verdade quando estão
comparando três ou mais coisas. Antes vinha tudo em um bloco só de texto e marcadores, e você
tinha que garimpar o que interessava.

> **O benefício:** você bate o olho e acha o número, em vez de ler o parágrafo inteiro.

### ↔️ A largura do chat agora é sua

A conversa é o painel da direita, e agora dá para arrastar a borda esquerda dele para ganhar
espaço, o que deixa as tabelas respirarem. Dois cliques na mesma borda voltam ao tamanho de
fábrica, e a largura que você escolher fica guardada naquele navegador.

> **O benefício:** tabela larga deixa de ficar espremida.

### 🗣️ Na voz, ele volta a falar como gente

Quando você fala com o agente em vez de digitar, a resposta é pensada para ser DITA: sem
título, sem tabela e sem asterisco, em frases curtas. Sem isso, a formatação nova da tela
seria lida em voz alta como símbolo.

> **O benefício:** o que é para ouvir soa como conversa, não como documento.

### 🆕 "Nova conversa" pelo menu agora começa mesmo do zero

Ao trocar de agente e voltar, a tela abria vazia mas a sua mensagem caía na conversa anterior,
com todo o histórico dela junto. O agente respondia de cabeça, sem consultar nada. Agora a
conversa nova é nova de verdade.

> **O benefício:** começar do zero começa do zero, e a resposta volta a ser sobre o que você
> perguntou agora.

### 📎 O atendimento espera a imagem e o áudio antes de responder

A atendente dizia que não conseguia ver a imagem ou ouvir o áudio, e a descrição aparecia no
banco logo depois: ela respondia antes da leitura terminar. Agora o turno espera a mídia ser
lida, até um minuto, e uma leitura que falha no meio não deixa a mensagem pendurada.

> **O benefício:** quem manda foto ou áudio recebe resposta sobre o que mandou.

### ✅ A mesma nota não abre mais vários pedidos de aprovação

Pedidos sobre o mesmo assunto voltavam à fila, às vezes quatro de uma vez. A trava que evita
isso não enxergava os pedidos abertos na mesma passada nem os que o trabalho de fundo criava
durante o dia. Agora enxerga os dois.

> **O benefício:** a fila de aprovações mostra cada assunto uma vez.

### 🔄 Quando a atualização falha, a tela diz por quê

A mensagem era sempre "Tente de novo", inclusive no caso mais comum, em que tentar de novo
falha para sempre: o token do GitHub sem permissão de escrita. Agora a tela nomeia o que
ajustar. E se o repositório configurado tiver outro projeto dentro, ela avisa em destaque
antes de seguir, em vez de tratar milhares de arquivos como se você os tivesse editado.

> **O benefício:** o erro vira uma instrução do que fazer.

### 📣 Ao repassar uma tarefa, o assistente diz onde o resultado aparece

Pelo Telegram ele prometia avisar quando ficasse pronto, e o aviso não vinha: desde a v1.27.2
a tarefa concluída entra no resumo do dia em vez de interromper. Agora ele diz a verdade: o
resultado fica na conversa onde você pediu, e toda tarefa aparece em Tarefas.

> **O benefício:** você sabe onde procurar, em vez de esperar um aviso que não vem.

### ⚙️ O gatilho do EasyPanel deixou de ter o nome errado

Cada atualização abria dois deploys. O nosso gatilho é acionado uma vez só; o segundo vinha do
botão "Deploy Automático" do próprio EasyPanel, que o guia mandou ligar em versões antigas e
nunca mandou desligar. O card agora usa o nome que o EasyPanel dá ("Gatilho de implantação"), e
o guia pede para deixar aquele botão desligado.

> **O benefício:** uma atualização, um deploy.

> **Atenção, para quem já tinha os dois ligados:** nenhuma atualização desliga o botão do
> EasyPanel por você. Confira em Configuração do serviço se "Deploy Automático" está desligado.

---

## [v1.29.0] — 2026-09-19

### 🔎 O Rui agora investiga a conta, e mostra como chegou lá

Antes, o gestor de tráfego só enxergava o que o relatório trazia pronto. Agora ele lê a conta do
Meta como um analista: escolhe o recorte que a pergunta pede (idade, gênero, posicionamento, dia),
cruza os números numa planilha própria e só então responde, dizendo o número que sustenta cada
conclusão e o que não deu para medir.

Enquanto ele trabalha, a linha em cima da orb conta o que está acontecendo ("LENDO OS CONJUNTOS
POR IDADE, 14 DIAS") com um contador ao lado ("3 leituras, 1 cruzamento"), no chat e no cockpit de
tráfego. Na voz, ele avisa o plano no começo e vai te contando a cada 45 segundos. No fim da
resposta aparece o card "Como cheguei nisso", com o caminho que ele percorreu, e o painel guarda
uma nota datada da apuração para quem só olha a tela.

> **O benefício:** você para de receber palpite e passa a receber conclusão com o número que a sustenta.

### ✅ Quando ele propõe pausar ou mexer no orçamento, a aprovação explica

O cartão em /aprovações passa a mostrar quatro linhas: o porquê que ele escreveu, a Base que o
produto calculou da leitura (conversões, gasto e período), um aviso quando a amostra é pequena, e
a evidência com o número. Pausar e reativar passam a guardar o status que ele leu, então o botão
de desfazer devolve a entidade ao estado certo.

> **O benefício:** você aprova sabendo em cima de que número ele decidiu, e consegue voltar atrás.

### ⏱️ Nenhuma investigação termina em silêncio

Quando o tempo acaba no meio do trabalho, o Rui fecha com o que já apurou, em vez de deixar você
sem resposta. Vale no chat, no Telegram e nas tarefas de fundo. No atendimento por WhatsApp, o
cliente nunca recebe uma frase cortada no meio: sai o que estiver completo, e o que foi cortado
vira aviso para você no painel.

> **O benefício:** ninguém fica esperando uma resposta que não vem, e o seu cliente nunca lê uma frase pela metade.

### 🔒 Endurecimento contra texto de fora que tenta dar ordens

Nome de campanha, copy de anúncio, contrato recebido, mensagem de cliente e nota importada agora
entram nos prompts como DADO cercado e neutralizado, campo a campo, em todos os pontos onde o
motor escreve memória permanente. Um contrato que tentava se passar por regra da casa deixou de
virar recomendação de assinar, e uma tarefa criada depois de ler conteúdo de fora nasce marcada,
sem poder executar atos que são seus.

> **O benefício:** texto que chega de fora vira dado para o seu time ler, nunca ordem para ele obedecer.

### 📋 Sobre a persona do gestor de tráfego

Quando você atualizar o cargo pela Loja, a persona do Rui é reescrita pela versão nova, como
sempre acontece em atualização de cargo. O nome que você deu a ele é preservado. Se você tinha
editado o texto dele à mão, guarde uma cópia antes de atualizar.

---

## [v1.28.1] — 2026-09-18

### 🔎 A busca na web volta a funcionar na conversa

O agente que tem a busca na web liberada volta a encontrá-la quando você conversa com ele, tanto
para pesquisar quanto para ler uma página. Antes ela só funcionava no atendimento pelos canais:
na conversa, o agente dizia que não tinha essa ferramenta, mesmo com ela liberada. Liberar a busca
também deixou de tirar espaço das outras ferramentas conectadas do agente. Vale para os agentes que
têm a busca na lista de ferramentas; o assistente principal segue sem ela.

> **O benefício:** o agente que você preparou para pesquisar pesquisa de verdade.

### 👥 O Membro só vê o que ele pode fazer

Quem entra na equipe como Membro deixa de ver Integrações, Rotinas e Configuração no menu e na
busca, e deixa de ver os botões de desligar e de trazer de volta alguém do time. No estúdio de
design, ele vê a Direção de arte só para leitura, e na página de cada agente os atalhos de ajustar
o agente e de conectar integrações ficam só com o dono. Antes esses caminhos apareciam e, no
clique, davam erro em inglês ou levavam de volta ao início sem explicação. Se uma recusa acontecer
mesmo assim, a mensagem vem em português e diz o motivo.

> **O benefício:** cada pessoa da equipe vê a tela que ela consegue usar.

### ✉️ Convite que falha no meio não tranca mais o e-mail

Quando o aceite de um convite falhava depois de criar o acesso, a pessoa ficava com uma conta sem
lugar na equipe e, na tentativa seguinte, lia que o e-mail já tinha acesso. Agora o que foi criado
é desfeito, e o mesmo link continua valendo.

> **O benefício:** um erro na hora de entrar não deixa ninguém trancado do lado de fora.

### ✂️ Menos texto cortado no Telegram

O conserto anterior cuidou do título dos planos. Esta versão cuida do resto: o trecho da conversa
que vem junto com o lembrete, o resumo do alerta quando um atendimento é passado para você, a
legenda das imagens do designer e o título das rotinas passam a ser cortados no fim de uma palavra,
com reticências. No carrossel, cada slide chega com a sua própria legenda, em vez de todos com a
mesma. E o corte não parte mais um emoji ao meio, o que podia fazer o alerta de um atendimento não
chegar.

> **O benefício:** o que chega no celular dá para ler, e o alerta de um atendimento não se perde.

---

## [v1.28.0] — 2026-09-15

### 🗂️ Cada estúdio ganhou histórico e o botão de começar do zero

O Téo, a Lia, o Rui, o Alan e qualquer agente que você contratar passam a ter os mesmos dois
controles que a Conversa já tinha: o histórico das conversas anteriores e o botão de começar
uma nova. No estúdio do Téo ele se chama "Nova arte", porque é disso que se trata ali.

Antes cada estúdio tinha uma sala só, para sempre. Você pedia uma arte hoje e continuava
naquele mesmo assunto semana que vem, sem nenhuma forma de abrir outra frente nem de voltar a
uma conversa antiga. No Téo doía mais: o briefing em aberto entrava em toda mensagem mandando
continuar aquele, então pedir "uma arte de outra coisa" era lido como continuação do briefing
anterior. Agora o briefing em aberto deixa de prender: pedido de outra arte abre briefing
novo, e quem não vai mais usar aquela frente pode descartar pelo próprio card.

> **O benefício:** você toca várias frentes no mesmo estúdio, e volta em qualquer uma delas.

### ✅ A fila de aprovações cabe numa tela

A tela de aprovações foi refeita: a fila fica à esquerda, agrupada por tipo e navegável pelo
teclado, e o pedido que você selecionou abre inteiro à direita. O conteúdo da mudança aparece
formatado, com tabela sendo tabela, em vez de texto monoespaçado cortado na borda.

Antes eram duas colunas gigantes nas laterais com um cartão estreito no meio, e treze pedidos
davam mais de doze mil pixels de rolagem. Agora a página não rola: a fila rola sozinha, e o
pedido aberto fica sempre visível. Quando existe mais de um pedido no mesmo arquivo, o cartão
avisa, porque aprovar um deles não resolve os outros.

> **O benefício:** dá para entender e decidir sem rolar a página inteira.

### 🧠 A memória chega inteira, e a fila para de repetir a mesma nota

Três consertos no Segundo Cérebro, todos do mesmo tema: o que é gravado tem de ser o que você
aprovou.

A primeira: notas grandes eram mostradas encurtadas ao agente para caber, e às vezes ele
copiava a marca do corte para dentro do texto final, gravando "trecho omitido" no lugar do
conteúdo. Agora isso é recusado antes de ser gravado, e o agente recebe a nota inteira para
refazer.

A segunda: quando uma mudança já está esperando sua decisão num arquivo, o Cérebro deixava a
próxima memória do mesmo arquivo virar um segundo pedido, escrito contra a versão anterior.
Aprovar um desfazia o outro. Agora ela espera a sua decisão, sem se perder.

A terceira: uma escrita cuja identificação não corresponde ao caminho do arquivo passa a ser
recusada na hora. Era assim que o índice do Cérebro travava sem avisar, e a tela mostrava um
número de problemas sem dizer a causa.

> **O benefício:** o que você aprova é o que fica escrito, inteiro.

### ⚠️ Aprovar uma memória avisa quando ela não entrou

Se a mudança não puder ser aplicada, por exemplo porque o arquivo mudou desde que o pedido foi
criado, a aprovação agora falha à vista e o pedido continua na fila. Antes, nesse caso, a tela
dizia aprovado, o cartão saía da fila e o texto não entrava em lugar nenhum, sem erro nem
aviso.

> **O benefício:** aprovado quer dizer gravado.

### 🖼️ A foto enviada no estúdio nasce na conversa certa

A imagem que você envia como referência no estúdio de design passa a ser gravada apenas na sua
própria conversa. Havia como um endereço de conversa vindo do formulário fazer a foto aparecer
na sala de outra pessoa da equipe.

> **O benefício:** o que você envia fica onde você enviou.

---

## [v1.27.2] — 2026-09-08

### 🖼️ A foto que o cliente manda abre em tela cheia

Clicar na imagem recebida abre ela grande, na tela toda, com botão para baixar. Antes ela
aparecia num quadradinho de 260 pixels, sem clique e sem jeito de ampliar: dava para ver que
existia uma foto, não dava para examinar. Quem recebe foto de documento, de produto ou de
exame sentia isso todo dia. Figurinha também passa a aparecer como imagem, em vez de virar a
palavra "figurinha".

> **O benefício:** o que o cliente manda, você consegue ver de verdade.

### 🕗 Cada mensagem mostra a hora

A conversa passa a ter a hora em cada mensagem e a data separando os dias, como você já
espera de um aplicativo de conversa. Antes não havia hora nem data em lugar nenhum, e ficava
difícil saber se a resposta demorou dez minutos ou dois dias. Passando o mouse em cima, sai a
data e a hora completas.

> **O benefício:** você enxerga o ritmo do atendimento sem sair da tela.

### 🔗 Seus próprios atalhos no menu

Em Configuração, aba Preferências, você fixa links no menu lateral com o nome que quiser.
Serve para uma dashboard externa, uma área de treinamento, um tutorial, o que a sua equipe
abre todo dia. Eles aparecem para todo o time e abrem em aba nova. Até 6.

> **O benefício:** o que a sua equipe mais usa fica a um clique, dentro do sistema.

### 🗑️ Dá para excluir uma conversa encerrada

Depois de fechar uma conversa aparece a opção de excluir, para tirar da lista o que virou
teste, engano ou duplicata. A ação apaga a conversa, e não o contato: um mesmo cliente
costuma ter várias conversas ao longo do tempo, então apagar o contato levaria junto
histórico que você nem estava vendo na tela. É ação de dono, pede confirmação e não tem
como desfazer.

> **O benefício:** a sua lista de conversas mostra só o que interessa.

### 🎬 O vídeo que o agente envia chega como vídeo

Um MP4 cadastrado nos arquivos do canal agora chega ao cliente como vídeo que toca na
conversa, em vez de um arquivo para baixar. Vale para o que o agente envia sozinho: o vídeo
que você anexa a mão pelo clipe do inbox continua indo como arquivo, e essa parte fica para
uma próxima versão. Vídeo acima do limite do WhatsApp também continua indo como arquivo, do
jeito que já funcionava, então nada que sai hoje deixa de ser entregue.

> **O benefício:** o vídeo que o seu agente entrega chega com cara de vídeo.

### 💸 Modelo novo, mais barato, com custo certo

O `gpt-5.6-luna` passa a ser reconhecido pelo sistema. Ele é bem mais barato que o padrão, e o
gasto dele agora aparece com o valor real no painel: quem já vinha usando esse modelo via zero
no lugar do custo. Nesta versão o modelo de cada agente ainda é fixo na tela, então a escolha
continua sendo feita fora dela, mas agora sem perder o controle do gasto.

> **O benefício:** usar um modelo mais barato deixou de significar voar às cegas no custo.

### 🛟 Quando o envio falha, você lê o motivo verdadeiro

A mensagem que não sai passa a mostrar a causa real, vinda do provedor. Antes, em alguns
casos, aparecia um aviso dizendo para tentar de novo em instantes, mesmo quando o problema
era permanente e tentar de novo nunca ia resolver. Também arrumamos um caso em que um anexo
sumia da conversa em silêncio quando o sistema não conseguia acessar o arquivo guardado: agora
isso fica registrado em vez de parecer que a mensagem nunca teve anexo.

> **O benefício:** você para de perder tempo repetindo o que não tem conserto pela repetição.

### 🎯 A resposta vai para o número certo

Ajuste fino no caminho de envio, para uma instalação que usa mais de um tipo de canal ao
mesmo tempo. Em um caso específico, a resposta podia sair para uma forma incompleta do número
do cliente e ser recusada pelo provedor. Agora o sistema só completa o número quando tem
certeza de que as duas formas são da mesma pessoa, e nunca por adivinhação.

> **O benefício:** menos resposta recusada por um detalhe do formato do telefone.

## [v1.27.1] — 2026-09-08

### 🪪 A identificação de IA vale mesmo quando o cliente insiste

Quando o cliente pergunta se está falando com um robô, a identificação obrigatória acompanha
a resposta do mesmo jeito. Antes, se o atendente escrevesse uma frase começando por "não sou
uma IA", o aviso legal era desligado e o cliente ficava só com a negação. Agora a dúvida cai
sempre para o lado de avisar, que é o lado que protege você.

Uma negação sobre outro assunto continua sem atrapalhar: se ele diz "não temos essa cor em
estoque" e na frase seguinte se apresenta, o aviso não é repetido.

### 🔒 O envio automático nunca repete, nem meses depois

A trava que impede a mesma mensagem de sair duas vezes agora vale para sempre, como o manual
da pasta `custom/` sempre prometeu. O histórico desses envios continua encolhendo, só que
por outro caminho: passados 90 dias, o telefone do cliente sai sozinho do registro e a trava
fica de pé. Antes o registro era apagado inteiro, e junto com ele ia a trava, então uma
rotina que rodasse de novo podia mandar a mesma confirmação ao cliente uma segunda vez.

### 💬 O cliente que escreve pela outra forma do número cai na mesma conversa

No Brasil o mesmo telefone aparece com e sem o código do país e com ou sem o nono dígito. As
duas formas passam a ser tratadas como a mesma pessoa nos dois sentidos, tanto quando o seu
sistema escreve quanto quando o cliente responde. Antes o mesmo cliente podia abrir uma
segunda conversa, e a equipe respondia num fio parado enquanto ele falava no outro. Vale
inclusive para os números do interior gaúcho, cujo DDD é o mesmo 55 do código do país.

### 🧰 Quando sobra ação externa, o painel te conta

Cada conversa carrega um número limitado de ações externas, para o turno ser rápido e não
falhar. Quando alguma fica de fora, isso aparece no seu painel, com quantas foram e o que
fazer, em vez de ficar só no log do servidor que você nunca abre.

### 🛡️ Diagnóstico da sua conta é leitura de dono

O motivo de uma chave ter parado de funcionar, incluindo conta sem crédito na OpenAI, passa
a aparecer só para o dono, como já valia para o segredo do webhook. Quem é da equipe continua
vendo o que precisa para trabalhar.

Nesta versão também: mensagem de erro nunca mostra credencial, nem quando ela vem solta no
meio do texto; e o revisor de saída da pasta `custom/` decide sempre uma vez só, então nenhum
turno termina sem destino.

## [v1.27.0] — 2026-09-07

### 🔌 Ferramenta que não pede conexão aparece pronta para usar

Parte do catálogo de integrações funciona sem login e sem chave: busca na web, leitura de
página, gerador de PDF. Elas agora aparecem como **pronta para usar** em Integrações, e os
seus agentes podem usá-las na hora. Antes elas ofereciam uma conexão que não existe, e o
botão terminava em erro.

### 🪪 O agente renomeado nunca mais se apresenta pelo nome antigo

Quando você troca o nome de um atendente, o nome novo passa a valer também nas conversas que
já existiam. Antes, num fio antigo, ele podia continuar assinando com o nome anterior por
causa das próprias falas guardadas ali, e chegava a discordar do cliente que o corrigia.
Agora ele confirma o nome atual, inclusive quando perguntam direto.

### 💳 Recarregou o crédito, o atendimento volta mesmo

Quando a conta da OpenAI fica sem crédito, ou a chave é recusada, as conversas que ficaram
esperando **continuam na fila** e são retomadas assim que você resolve, por até um dia. Antes
elas eram encerradas em cerca de um minuto e meio, e recarregar não trazia ninguém de volta.

### 🎯 A Sala de Treino para de reprovar teste que não rodou

O placar de regressão passa a distinguir "não passou" de "não consegui rodar". Sem a chave da
OpenAI salva, ele avisa exatamente isso, aponta onde salvar e **não marca nenhum teste como
quebrado**. Antes o placar zerava e mandava você investigar casos que estavam certos.

### 🚀 O card de atualização para de esperar uma versão que não existe

Acionar o deploy sem ter atualizado passa a reconstruir a versão que está no ar, em vez de
esperar por outra que nunca foi publicada. E, quando a reconstrução não conclui, a mensagem
diz a causa certa: se a atualização não chegou ao seu GitHub, ela manda conferir o acesso ali
mesmo no painel, sem comando nenhum por fora.

### 🛡️ O atendente escreve para o cliente, e só para o cliente

A resposta que sai nos seus canais é sempre a mensagem que o cliente pode ler. Em conversas
em que faltava informação na base, o atendente podia acabar escrevendo para **você** no corpo
da mensagem dele, com a leitura que fez do lead e o que gostaria de ter cadastrado. Agora ele
responde ao cliente e, quando o que ele tem não sustenta a resposta, diz em uma frase que vai
passar para uma pessoa do time.

Junto veio um ganho de confiabilidade grande: o atendente com muitas ações externas ligadas
passa a montar um conjunto enxuto por conversa. Acima de um certo volume, a chamada ao
provedor voltava vazia e o turno inteiro dependia da segunda tentativa. E, quando essa
segunda tentativa for usada, o painel passa a registrar uma linha por hora para você ver.

### ⚖️ A identificação de IA acompanha toda primeira resposta

A mensagem que abre um atendimento sempre diz que quem responde é um assistente virtual, em
qualquer formato: texto, botões, arquivo e áudio. O aviso continua sendo o mesmo, uma vez por
conversa, e agora ele também vale nos turnos que não têm texto nenhum.

### 🔑 A tela de chaves diz a verdade sobre cada conexão

Uma chave que o provedor deixou de aceitar aparece como **Verifique a chave**, e não mais como
conectada, e o contador do topo acompanha. Quando o problema é a conta e não a credencial (sem
crédito, sem acesso ao modelo), a tela diz **Confira sua conta**, que é onde está o conserto.
Falha de rede não acusa chave nenhuma.

O aviso do topo passa a dizer **qual** conexão olhar em vez de só avisar que o Cérebro parou de
sincronizar. E, no instante em que você salva a chave nova, o diagnóstico da antiga é
esquecido: nada continua acusando o que você acabou de arrumar.

### 🧠 Nenhuma anotação do seu Cérebro fica invisível

Se um arquivo do repositório não puder ser lido como anotação, a tela do Cérebro passa a
dizer, com o nome do arquivo e o que conferir nele. Antes esse arquivo simplesmente não
entrava no acervo, e nenhum agente sabia que ele existia.

### 💬 O Inbox conta a conversa como ela aconteceu

- Aprovar um rascunho com arquivo **e** botões envia os dois, na ordem certa.
- A resposta sobe na mesma conversa em que o cliente está falando, mesmo quando o número dele
  está gravado nas duas formas (com e sem o nono dígito). A janela de 24 horas passa a ser
  contada pelo número, não pela linha de contato.
- A linha enviada por uma automação aparece como automação, não assinada como **Você**.
- O histórico mostra a mensagem que o cliente recebeu de verdade, incluindo quando a resposta
  virou lista numerada em vez de botões.

### 🧩 Para quem programa na pasta `custom/`

- **Ponto de extensão novo: `custom/saida`.** Um revisor seu roda entre o texto que o agente
  escreveu e o envio ao cliente, nos dois modos de atendimento. Ele pode deixar passar,
  **trocar o texto** ou **segurar** a resposta para uma pessoa decidir no Inbox. Toda dúvida
  cai em segurar, que tem destino: erro no seu código, formato não reconhecido ou demora acima
  de 3 segundos viram rascunho com o motivo no painel, nunca silêncio. A identificação de IA é
  aplicada depois do seu revisor, então ela nunca se perde.
- **`ctx.acoes.enviarMensagem`.** Disparo transacional para um contato, com reserva de
  idempotência ANTES de o primeiro byte sair: a mesma chave nunca manda duas vezes, e quando
  uma tentativa fica presa o retorno diz se a mensagem chegou ou não. Teto de 100 envios por
  hora por instalação.
- Ferramenta com aprovação recebe o **mesmo contexto** da execução direta, com Vault e ações.
  Antes ela funcionava na hora e falhava no instante em que era aprovada.
- `criarTarefa` aceita o **primeiro nome** do agente, além do id da função, e o exemplo da
  documentação foi corrigido.

## [v1.26.1] — 2026-09-03

### 💬 O rascunho com botões deixa de travar a conversa

Quando o atendente responde só com botões para o cliente clicar, o rascunho no Inbox nasce
com o texto da pergunta preenchido e pode ser aprovado normalmente. Antes o campo vinha
vazio, o botão de enviar ficava desligado sem dizer por quê, e a conversa parava até o
cliente escrever de novo. Se você editar a pergunta antes de aprovar, é a sua versão que sai,
e o cliente recebe uma mensagem só.

### 🎨 O Téo diz por que a arte não saiu

Quando a geração de imagem falha, o Estúdio agora nomeia a causa e diz o que fazer: conta da
OpenAI sem verificação da organização (o caso mais comum em conta nova, e o motivo de o texto
funcionar e a imagem não), crédito acabado, chave recusada, limite de chamadas ou política de
conteúdo. E ele só convida você a pedir de novo quando pedir de novo resolve.

- **Revisão que não muda nada para de virar versão nova.** Se o pedido de ajuste não alterou a
  direção da arte, o Téo diz isso e pede o que trocar, em vez de gravar uma versão nova com a
  mesma imagem. Antes a peça subia de v1 para v2 e para v3 com a arte idêntica.
- **Carrossel sem nenhuma foto explica o motivo** em vez de sair todo em tipografia sem dizer
  por quê, e sem mandar você refazer a série inteira: ela já está salva, é só a foto que faltou.
- **Vale também para a imagem que você pede direto na conversa.** Antes o assistente inventava
  uma explicação quando o desenho falhava. Agora ele diz a mesma causa que o Estúdio diz.

### 🔌 Reconectar o WhatsApp depois do QR vencer funciona

Deixou o QR expirar e tentou de novo? Agora ele gera um QR novo para o mesmo canal, com as
conversas e a configuração intactas. Antes aparecia uma mensagem de erro técnica do banco de
dados na tela e não dava para seguir.

- **O endereço do servidor não precisa ser digitado igualzinho.** Escrever com letras maiúsculas
  onde antes eram minúsculas, colar com um espaço sobrando no fim ou com a barra final: continua
  sendo o mesmo servidor, e a reconexão acontece. O que já estava configurado no canal (o modo de
  teste, a lista de números e o nome do perfil) sobrevive.

### 📥 O botão "Carregar mais" do Inbox parou de piscar

Ele ficava alternando sozinho entre parado e carregando enquanto mensagens novas chegavam, e
só aceitava clique nas frestas. Agora ele só reage a você.

### 🔒 Dependências e arquivos de ambiente

Fechamos 41 alertas de segurança conhecidos nas bibliotecas que a sua instalação usa (22 de
severidade alta). E o `.gitignore` passou a cobrir todas as variações de arquivo de ambiente
(`.env.local`, `.env.production` e afins), para nenhuma chave entrar no repositório por
descuido.

### 🧷 Apagar uma importação não interrompe mais o trabalho de fundo

Se um lote de arquivos importados for removido enquanto os fatos dele ainda estavam sendo
gravados no Cérebro, o restante da fila continua normalmente. Antes, anotar o resultado de um
lote que já não existia parava o ciclo inteiro, mesmo com o conteúdo já salvo.

---

## [v1.26.0] — 2026-09-02

### 🧠 O que você mais consulta vira memória permanente sozinho

O seu assistente passa a reparar no que você procura. Quando um assunto volta em dias
diferentes e por perguntas diferentes, ele mesmo propõe transformar aquilo em memória
permanente da empresa, e a proposta chega na sua fila para você aprovar como sempre. Nada é
gravado sem passar por você.

- **A régua é a sua, não a dele.** Só entra na fila o que voltou pelo menos três vezes, em três
  dias diferentes e por três perguntas diferentes, dentro dos últimos trinta dias. Assim o que
  você repetiu de verdade sobe, e o que você perguntou dez vezes numa tarde só continua onde
  estava.
- **Ele conta o que você LEU, não o que ele achou.** O sinal é gravado sobre o que realmente
  chegou à resposta, e não sobre tudo o que a busca pescou pelo caminho.
- **A conversa do cliente não vira fato da sua empresa.** Cada memória guarda de onde veio, e só
  o que nasceu numa conversa sua pode ser promovido. Nenhuma quantidade de repetição promove o
  que veio de fora.

### ⏰ O lembrete ganha soneca

Peça "adia para as 15h" e o mesmo lembrete é remarcado, com o contexto em que ele nasceu
intacto. Antes só dava para cancelar e criar outro, e o novo chegava sem a conversa que
explicava o pedido. Quando o lembrete se repete, a confirmação avisa que os próximos também
passam a tocar no horário novo.

### 📬 Sem Telegram conectado, os avisos aparecem no seu painel

O aviso de "existem avisos esperando" agora mostra QUAIS. O lembrete que venceu, o resultado da
rotina e o pedido de aprovação aparecem na primeira tela, com o que eles dizem. Conectar o
Telegram continua valendo a pena para receber na hora no celular, e o que ficou guardado é
entregue lá também.

### 🛍️ Capacidade nova de cargo alcança quem já contratou

Quando um cargo da Loja ganha uma capacidade nova, quem já tinha aquele funcionário passa a
recebê-la também. Antes só quem contratava do zero via a novidade, e quem já trabalhava com ele
ficava com as ferramentas do dia da contratação. O que você desligou de propósito continua
desligado.

### 📸 O direct do Instagram sai sozinho, segundos depois do comentário

Quem comenta a palavra que você escolheu recebe a sua mensagem no direct sem você tocar em nada.
Medido ao vivo numa conta real: do comentário à mensagem entregue foram nove segundos, com a
resposta pública embaixo do comentário no meio do caminho.

- **A tela avisa antes, e não depois.** Automação com mais de uma mensagem mostra já na hora de
  montar que a segunda em diante só é entregue depois que a Meta aprovar o seu aplicativo. A
  primeira sai desde já, porque ela é a resposta ao comentário.
- **Quando a Meta recusa, o histórico diz o que resolve.** No lugar de um número solto, cada
  tentativa que não chegou explica o motivo em português e o caminho: passaram sete dias do
  comentário, aquela pessoa já recebeu uma resposta, ou falta a liberação da sua conta.
- **A conexão diz quando o acesso da conta venceu.** A tela passa a avisar que a Meta não aceita
  mais aquele acesso e que é preciso gerar um novo no painel dela, em vez de pedir que você tente
  outra vez em alguns minutos por uma coisa que não se resolve sozinha.

### ⚡ Atualizar a sua instalação ficou mais rápido

A montagem do aplicativo passa a guardar o trabalho já feito, então a atualização seguinte só
refaz o que mudou de verdade. A etapa de compilar o código caiu pela metade nas medições daqui, e
as dependências deixam de ser baixadas do zero a cada vez.

---

## [v1.25.0] — 2026-09-02

### 🧠 O Cérebro para de esquecer, e o relógio passa a ser o seu

Comparamos o seu Cérebro com os dois melhores assistentes de código aberto que existem hoje, e o
resultado mudou o que construímos. A busca já ganhava dos dois. O que perdia era outra coisa: o
que ele guarda, quando ele fala com você, e para onde o trabalho dele vai. Foram vinte frentes.

- **Você diz em que fuso vive, e "me lembra sexta às 9h" chega às 9h suas.** Antes a conta era
  feita no horário do servidor. O card fica no `/config` e já chega com o palpite do seu
  navegador preenchido. O mesmo acerto vale para rotinas, briefing e para o silêncio da noite.
- **O cutucão passa a dizer para quando era e do que se tratava.** Em vez de "mandar a proposta",
  chega "era para sexta às 9h: mandar a proposta pro João", com as duas linhas da conversa em que
  o pedido nasceu. E lembrete com data no passado passa a ser recusado na hora, em vez de aceito
  e nunca entregue.
- **Nunca mais confirmar um lembrete que não tem para onde ir.** Se o Telegram não está pareado,
  o lembrete é recusado com o motivo em vez de confirmado no vazio. A rotina continua sendo
  criada, porque o resultado dela agora tem tela, mas avisa que você só vai vê-lo por lá.
- **"todo dia útil às 8h" para de virar "todo dia".** As rotinas passaram a entender dias úteis,
  conjunto de dias da semana e data de término.
- **Só você mexe nas suas rotinas, também pela conversa.** Alguém da sua equipe conversando com o
  assistente não consegue mais apagar a rotina do relatório semanal.

### 🗂️ A memória para de apodrecer, e o fundo passa a falar do seu negócio

- **O que você conta às 9h vira memória em minutos, não na madrugada seguinte.** A consolidação
  deixou de depender de uma janela de cinco minutos por dia e passou a ser "desde a última vez que
  deu certo". Um dia em que o serviço falhou não some mais em silêncio.
- **Para de receber doze "memórias" quando você só disse oi.** O que entra no contexto agora tem
  um piso de relevância e um teto por documento, então um PDF grande deixa de tomar a conversa
  inteira. Cada busca também ficou mais rápida.
- **"lembra do João?" volta a consultar a memória.** As frases que mais pedem memória eram
  justamente as que a desligavam.
- **O fato da empresa passa a ter idade.** Quando o assistente usa "ticket médio: R$ 3.000", ele
  sabe de quando é aquilo, em vez de tratar um número de dois anos atrás como se fosse de hoje.
- **O que veio de fora não vira mais "fato da sua empresa".** Documento colado, retorno de
  ferramenta externa e mensagem de cliente ficam marcados na origem, e só o que veio de você ou
  do próprio assistente pode virar memória permanente.
- **E o que ficou de fora deixa de ficar de fora em silêncio.** Quando o sistema recusa guardar
  alguma coisa por não conseguir confirmar que veio de você, ele conta, com alguns exemplos do
  que foi. Se for coisa sua mesmo, você diz de novo e ele guarda. O aviso pode chegar durante o
  nascimento da empresa, e é de propósito: é ali que você mais cola documento e mais acreditaria
  que aquilo virou conhecimento da casa.
- **O segundo turno da conversa para de perder a memória.** "e o outro", "quanto era mesmo" e
  companhia agora consultam o Cérebro, e a consulta leva junto o que você acabou de perguntar.
  Antes, uma pergunta assim sem ponto de interrogação, que é como todo mundo escreve no Telegram
  e no WhatsApp, ia para o assistente sem memória nenhuma.
- **O botão "Excluir" que a tela já prometia existe.** Ele arquiva a nota em vez de apagar: ela
  sai da busca e do contexto, e continua recuperável no seu repositório.
- **A conta da OpenAI para de crescer sozinha com o tamanho do Cérebro.** O bloco de memória
  passou a ter teto e ordem de sacrifício declarada, e o que é sempre presente nunca é cortado.

### ⏰ O assistente passa a te procurar quando há motivo, e a calar quando não há

- **O contrato que vence amanhã cutuca você.** O radar de prazos do jurídico ganhou aviso, com
  urgência que aumenta conforme a data chega, e sem repetir o mesmo prazo no mesmo dia.
- **De manhã você lê o que aconteceu na empresa**, com tarefas, gasto, fila de atendimento,
  rotinas e prazos. E o briefing não sai quando não há notícia nenhuma, em vez de mandar um
  "tudo tranquilo" diário que ninguém lê.
- **"me avisa quando o cliente falar em cancelamento".** Você pede uma vez, em conversa, e o
  assistente fica de olho. Com orçamento de avisos, intervalo mínimo e prazo de validade desde o
  primeiro dia, para não virar enxurrada.
- **Um soluço do banco às três da manhã deixa de significar "hoje nada rodou".** Cada braço do
  trabalho de fundo falha sozinho, sem derrubar os vizinhos.

### 🔦 O assistente ganha mãos no acervo, e passa a vigiar a própria saúde

- **Ele consegue abrir e listar o que existe no Cérebro.** Antes ele só sabia buscar, então
  "isso está no Cérebro?" não tinha resposta boa. Cada funcionário só enxerga as pastas que a
  função dele permite.
- **O acervo passa por uma checagem de saúde.** Nota fora do índice, nota com identificador que
  não bate com o caminho, pasta criada sem leitor e função configurada para uma pasta que não
  existe aparecem no painel em vez de virar silêncio.
- **O resultado da rotina passa a ter onde ser visto**, na linha do tempo e na gaveta da tarefa.
- **Higiene:** avisos e lembretes antigos passam a ser podados, uma diretriz substituída deixa de
  concorrer com a que a substituiu, e a imagem do container parou de carregar material de
  desenvolvimento que não é do produto.

### 🔍 O que uma revisão densa achou depois de tudo isso, e que já está consertado

Passamos quatro revisões independentes por cima do trabalho acima: uma só de segurança, uma de
correção, uma conferindo item por item o que tinha sido prometido, e uma tentando furar os
próprios consertos. Elas acharam 86 coisas. Estas são as que você sentiria.

- **"me lembra todo dia útil" era impossível.** A tela e o assistente aceitavam o pedido, o banco
  recusava, e você lia "Tenta de novo?" para sempre. A lista de frequências estava escrita à mão
  em quatro lugares e cada cópia envelheceu por conta própria; agora existe uma só.
- **A busca no Cérebro estava varrendo o acervo inteiro a cada pergunta.** Uma mudança feita para
  limitar quantos trechos vêm de cada documento tinha desligado, sem querer, o índice que torna a
  busca rápida. O trecho semântico da busca voltou de 287 milésimos de segundo para 6.
- **Um documento colado podia se declarar seu.** O sistema marca a origem de cada fato para só
  guardar como permanente o que veio de você, mas quem classificava lia o texto colado sem
  proteção: bastava o documento pedir para ser tratado como seu. Agora o texto de fora entra
  cercado e identificado como dado, em todos os pontos onde o assistente resume ou aprende.
- **Uma rotina que lê mensagens de cliente não obedece mais a elas.** Uma instrução escondida numa
  mensagem de WhatsApp podia mandar a rotina silenciar todos os seus avisos. As decisões que são
  suas passaram a exigir, além de serem pedidas por você, que o trabalho ainda não tenha lido
  material de fora, e a recusa aparece no resultado da tarefa em vez de sumir.
- **O alarme do acervo emudecia justamente quando você consertava os problemas.** Ele só falava
  quando o número subia acima do maior já visto, então quem arrumava tudo comprava silêncio até
  acumular problema demais de novo.
- **"Posso anotar, mas..." e nada era anotado.** Sem o Telegram pareado, o lembrete era recusado
  com uma frase que dizia o contrário. Agora ele é criado e fica esperando o pareamento, como a
  rotina já fazia.
- **"me lembra em 2 minutos" era recusado como data no passado.** O relógio que o assistente
  enxerga é arredondado ao minuto de propósito, então ele nascia atrasado em relação à checagem.
- **A Ficha da sua empresa empurrava fatos seus para fora.** Ao ganhar a data ao lado de cada
  fato, o espaço reservado passou a caber menos, e os fatos mais longos, que são os mais densos,
  eram os primeiros a sair. A conta agora desconta a data.
- **O briefing diário voltava mesmo em dia parado**, porque duas das coisas que ele media eram
  estoque e não novidade: uma conversa esquecida esperando atendimento fazia o aviso sair todo dia
  com a mesma frase.
- **A regra corrigida não aposentava mais a antiga de verdade.** A tela dizia que a regra velha
  tinha virado histórico, mas ela voltava a valer no primeiro salvamento, e as duas chegavam
  juntas ao assistente sob "siga sempre".
- **"toda segunda e quinta" aparecia como "Todo domingo"**, e salvar pela tela apagava a quinta.
- **Lembretes e rotinas diários, semanais e mensais atrasavam uma hora** a cada virada de horário
  de verão e ficavam assim até a virada seguinte.
- **O painel passa a mostrar quando uma parte do trabalho de fundo parou.** Antes, o serviço podia
  responder "tudo certo" com uma engrenagem quebrada havia uma semana, e a tela ficava idêntica à
  de uma instalação saudável. São 29 engrenagens batendo ponto.

### 📸 Instagram: quem comenta na sua publicação recebe uma mensagem no direct

Uma tela nova, o `/instagram`, onde você monta automações sem depender de ninguém. Você escolhe
a publicação, diz quais palavras valem, e escreve a sequência de mensagens que a pessoa recebe
no direct assim que comentar.

- **A automação nasce em rascunho e não fala com ninguém até você colocar no ar.** Quem edita
  pode ser qualquer pessoa da sua equipe; quem liga é você. E se alguém da equipe mudar o texto
  de uma automação que já está no ar, ela volta para rascunho e avisa na tela, para o texto novo
  não chegar aos seus clientes sem você ter visto.
- **Cada mensagem da sequência pode ter texto, imagem, ou os dois**, com uma espera configurável
  entre elas. Quando a mensagem tem texto e imagem, o Instagram entrega as duas separadas, e a
  tela diz isso antes de você configurar, não depois.
- **A prévia mostra exatamente o que a pessoa vai ler**, com o nome dela e a palavra que ela
  escreveu já no lugar. É o mesmo trecho de programa que envia de verdade, então o que você vê
  na prévia é o que sai.
- **O estado da conexão fica no alto da própria tela.** Se a conta se desconectar, ou se o canal
  estiver desligado, você descobre olhando as automações, e não depois de um cliente reclamar.
- **A especialista de Instagram responde pelos números reais.** Perguntando a ela no chat como
  as automações vêm indo, ela lê os disparos de verdade e, quando não há dado, diz que não há em
  vez de inventar.

### 🔎 Instagram: a revisão densa, e o que ela achou antes de você

Depois de pronta, a tela passou por uma revisão de seis frentes independentes, que olharam o
mesmo código sem falar entre si. Foram 117 problemas, seis deles graves o bastante para segurar
o lançamento. Todos foram consertados antes de qualquer comprador ter a feature na mão, e a
maior parte só apareceu porque a revisão executou o ataque em vez de suspeitar dele.

- **A sequência entregava só a primeira mensagem.** O Instagram aceita uma única resposta no
  direct por comentário, e todas as mensagens seguintes usavam essa mesma porta. Na prática,
  qualquer automação com mais de uma mensagem, e qualquer mensagem que juntasse texto e imagem,
  entregava a primeira e perdia o resto. Este era o produto inteiro, e agora funciona.
- **Trocar a conta do Instagram parava tudo em silêncio.** As automações continuavam apontando
  para a conta antiga, nada disparava, e a tela continuava verde. Agora a troca leva as suas
  automações junto, e a tela diz o que muda antes de você confirmar.
- **Colocar no ar passou a mostrar o que vai ao ar.** Antes o botão disparava direto. Agora ele
  abre a revisão com todas as mensagens, o texto inteiro, a resposta pública e o endereço real
  de cada botão, com aviso quando o endereço tenta se disfarçar de outro site. Se alguém alterar
  a automação entre a sua conferência e o clique, o sistema recusa em vez de publicar outra coisa.
- **Sequência interrompida parou de aparecer como concluída, em verde.** Quando você pausa ou
  salva no meio, a tela diz que foi interrompida e por quê, em vez de afirmar que deu certo.
- **Uma palavra muito longa não desliga mais a automação em silêncio.** Antes ela ficava ligada,
  com o ponto verde, e nunca respondia ninguém. Agora ela é recusada na hora de salvar, e
  qualquer automação que falhe deixa registro no painel.
- **O comentário repetido aparece no histórico.** Antes o sistema evitava responder duas vezes à
  mesma pessoa e não contava isso a ninguém, o que parecia falha.
- **A imagem é conferida pelo conteúdo, e não pelo nome do arquivo.**
- **O aviso de conexão caída para de aparecer sozinho quando você conserta**, em vez de insistir
  por horas, e a especialista de Instagram passou a dizer que a conexão caiu em vez de relatar
  zero disparos como se fosse desempenho fraco.
- **Um disparo deixou de contar como edição.** Cada mensagem enviada carimbava a automação como
  se alguém tivesse acabado de mexer nela, e era esse carimbo que a tela usava para conferir se o
  texto ainda era o mesmo que você leu. Na prática, uma automação movimentada podia recusar a sua
  ativação dizendo que alguém editou, sem ninguém ter editado.

### 💬 Atendimento no WhatsApp: a mesma resposta parou de sair várias vezes

A revisão do Instagram encontrou o mesmo defeito na fila que atende o seu WhatsApp, e essa já
estava no ar. Quando dois processos pegavam a mesma conversa, um deles devolvia o trabalho para
a fila e zerava a contagem de tentativas, o que fazia o ciclo recomeçar sem fim, mandando uma
resposta ao cliente a cada volta. Agora cada trabalho tem dono, e quem perdeu o dono para antes
de enviar. O envio também ganhou prazo próprio, então uma conexão ruim deixa de segurar a fila
até o ponto em que outro processo assumia e entregava de novo.

### 🔒 Fontes de dados: endurecimento

A tela que liga o banco do seu negócio passou por uma revisão de segurança adversária, e o que
ela achou virou conserto antes de qualquer comprador ter a feature na mão.

- **Consulta que traria a lista de pessoas em vez de contagens agora é recusada, e o motivo
  aparece.** O sistema passou a ler o que a consulta de fato projeta, em vez de procurar uma
  palavra no texto dela. Com isso ele deixou de aceitar consulta que empacota a tabela inteira
  numa célula, e voltou a aceitar as legítimas que antes recusava por engano: receita como preço
  vezes quantidade, agrupamento simples por categoria, e as contas de desvio e mediana.
- **A conexão com o seu banco ficou mais fechada.** Nenhuma consulta consegue mais esconder
  chamada de função atrás de aspas, a leitura passa a exigir conexão criptografada quando você
  não pediu o contrário, e o corte de linhas é feito pelo próprio banco em vez de o sistema
  trazer tudo e cortar depois, o que podia derrubar a sua empresa inteira num banco grande.
- **Nada sai para o seu Cérebro sem passar por uma última conferência.** Antes de qualquer coisa
  ir para a inteligência artificial, o resultado é conferido: comentário de cliente, endereço e
  telefone param ali. E uma pergunta que insista em trazer dado de pessoa é desligada e avisa
  você, em vez de tentar de novo todo dia em silêncio.
- **Quando algo dá errado, você lê o que aconteceu de verdade.** Antes, qualquer problema virava
  "confira a conexão", mesmo quando o banco nem tinha sido consultado. Agora falta de permissão,
  conexão mal escrita e pergunta recusada têm cada uma o seu aviso e o seu próximo passo.
- **Duas perguntas não brigam mais pela mesma nota**, o horário que falhou tenta de novo em
  quinze minutos em vez de esperar o dia seguinte, e resetar as credenciais avisa que as
  perguntas aprovadas vão junto.

### 🔒 A nota que diz quem é a sua empresa volta a pedir a sua aprovação

A nota de identidade da empresa é a mais importante do seu Cérebro: ela abre toda conversa e
é o que define quem você é para o agente. O sistema sempre teve a regra de que uma mudança
nela precisa passar por você antes de valer. A regra existia, mas estava escrita com o nome
da pasta em inglês enquanto o produto grava em português, então ela nunca chegou a valer uma
vez sequer, e mudanças nessa nota entravam sozinhas.

Agora valem. Uma mudança proposta para a nota de identidade aparece em Aprovações e só entra
depois que você aprovar. Isso importa porque quem conversa com o seu atendimento, um arquivo
que você importou ou alguém da sua equipe com acesso de Membro podem, sem querer ou de
propósito, levar o sistema a reescrever essa nota. O resto do conhecimento do negócio continua
entrando sozinho, como antes.

### 💬 Quando o Cérebro não abre, o aviso passa a dizer o motivo certo

Antes, qualquer problema com o Cérebro mostrava a mesma frase, dizendo que o repositório não
tinha respondido a tempo. Isso mandava você conferir a sua internet mesmo quando o problema
era outro. Agora o aviso separa o que de fato aconteceu: demora, acesso ao GitHub recusado,
repositório não encontrado, falta de conexão, ou a cópia guardada aqui precisando de conserto.
E ele só pede alguma coisa de você nos casos em que você pode resolver; nos outros, ele diz
que se resolve sozinho, porque se resolve.

### 🧠 O Cérebro parava de funcionar por uma mudança que ninguém salvou

Achado num teste ao vivo, com o Cérebro do dono caído naquele momento e nenhuma tela dizendo
o motivo. A cópia do seu repositório que fica guardada na instalação pode acabar com arquivos
marcados como alterados sem que ninguém tenha salvo nada, por exemplo quando uma escrita é
interrompida no meio. Quando isso acontecia, a sincronização com o GitHub passava a recusar,
e caía tudo que depende do Cérebro junto: a memória do agente, a tela do Cérebro, a
entrevista, os arquivos importados, as habilidades e as Fontes de dados. Como essa cópia
sobrevive ao reinício, reiniciar não resolvia, e o aviso que aparecia dizia que o repositório
não tinha respondido a tempo, o que mandava você conferir a conexão em vez do problema real.

Agora a instalação percebe sozinha e devolve a cópia ao último estado publicado, porque quem
manda é sempre o seu repositório no GitHub. Nada do que está publicado se perde.

### 🔒 Fontes de dados: a segunda revisão, e o que ela achou

Depois do endurecimento acima, o subsistema passou por uma revisão bem mais funda, com nove
frentes independentes olhando o mesmo código. Ela achou 96 problemas, dez deles graves. Todos
foram consertados antes de qualquer comprador ter a feature na mão, e a maioria só apareceu
porque a revisão executou o ataque em vez de suspeitar dele.

- **Nenhuma pergunta consegue mais esconder o que faz.** Havia uma forma de escrever texto
  dentro da consulta que confundia a conferência: o sistema lia um pedaço e o banco executava
  outro. Dava para esconder ali uma ordem de derrubar o banco, ou a lista crua de clientes.
  Essa forma de escrever passou a ser recusada inteira, com o motivo na tela.
- **Agora existe uma lista do que é permitido, em vez de uma lista do que é proibido.** A
  conferência antiga tentava adivinhar o que era perigoso pelo nome, e por isso não via nada
  montado em pedaços. Hoje a pergunta só pode usar contas simples (somar, contar, média,
  arredondar, agrupar por mês) e qualquer coisa fora dessa lista é recusada. Fecha a categoria
  toda, e não um truque de cada vez.
- **O sistema passou a reconhecer coluna de gente de verdade.** Palavras como paciente, aluno,
  contato, funcionário, morador e sócio atravessavam a conferência e viravam nota publicada com
  nome de pessoa. Foram medidos 123 nomes de coluna de negócio brasileiro real passando. Agora
  passam zero.
- **E parou de recusar as suas contas legítimas.** Faturamento total estava sendo lido como se
  fosse um documento de pessoa, e a pergunta era desligada para sempre com um aviso errado; doze
  de dezenove contas comuns morriam assim. Somar salário por setor e média de renda por faixa,
  que são conta e não pessoa, voltaram a funcionar.
- **A nota que você escreveu à mão não é mais apagada.** Se você editar no seu repositório uma
  nota que uma pergunta mantém, a próxima rodada percebe, não sobrescreve, e avisa você. Antes
  ela passava por cima em silêncio. O mesmo vale para número que você digitou na Ficha da
  Empresa, que deixou de ser substituído pelo número da rodada automática.
- **Um conflito no seu repositório não derruba mais o Cérebro inteiro.** Bastava você editar
  uma nota pelo site do GitHub para o Cérebro travar de vez: a memória, o Curador, a entrevista
  e a busca paravam juntos, e reiniciar não resolvia. Agora o sistema percebe o travamento e se
  destrava sozinho.
- **A conexão que você cola é conferida.** Se ela tiver poder de administrador no seu banco, o
  sistema recusa e explica o que fazer, em vez de aceitar e confiar. E a conexão criptografada
  passou a ser verificada de verdade por padrão, com o afrouxamento disponível só se você pedir
  por escrito.
- **Ranking parou de sair errado.** Quando o resultado era grande demais e precisava ser
  cortado, o sistema reordenava por conta própria e publicava um top cinco que não era o top
  cinco. Agora a ordem é a que o seu banco devolveu, e quando o resultado é parcial a nota diz
  isso, em vez de parecer completa.
- **O aviso de problema é da pergunta, não da fonte inteira.** Antes, uma pergunta que desse
  certo apagava o alarme de outra que tinha quebrado no mesmo horário, e você nunca ficava
  sabendo. Cada pergunta passa a carregar o próprio aviso, e a tela mostra na linha dela.
- **Uma fonte lenta não trava mais o resto da sua empresa.** O trabalho de fundo é um só, e ele
  cuida também do WhatsApp, dos lembretes e da memória. Uma escrita presa no GitHub segurava
  tudo isso, rodada após rodada. Agora cada etapa tem prazo, e o que estoura o prazo sai da
  frente em vez de parar a fila.

### 🐞 Varredura de bugs da comunidade (10ª leva)

- **O Inbox parou de torrar banda sozinho.** Com a tela aberta e ninguém mexendo, ele disparava
  uma requisição por segundo, para sempre: pedir as mensagens marcava a conversa como lida, isso
  avisava a tela, a tela pedia as mensagens de novo. Foram 22 GB de tráfego em três dias na
  instalação que relatou, com aviso de restrição da Supabase. O ciclo acabou, mensagem que chega
  em outra conversa não recarrega mais a que está aberta, e a mesma imagem passa a vir do cache do
  navegador em vez de ser baixada inteira a cada carregamento.
- **A apresentação de IA agora sai também quando a agente passa a conversa para uma pessoa.**
  Se a primeira coisa que ela fazia numa conversa nova era chamar o time, a cliente recebia só
  "vou te passar para alguém" e a identificação nunca chegava, e ainda ficava bloqueada pelos 30
  dias seguintes. Identificar-se é obrigação legal, e agora ela vem junto do próprio aviso.
- **Ferramenta sua (zona `custom/`) funciona no WhatsApp, e não só no chat do painel.** Ela
  recebia a conversa vazia no atendimento, então uma ferramenta de agenda não descobria o telefone
  da cliente e se recusava a funcionar; a agente traduzia isso para a cliente como "não consigo".
  Vale também quando a ferramenta passa pela fila de aprovação.
- **O turno que termina consultando uma ferramenta não volta mais vazio.** No Simulador da Sala de
  Treino isso aparecia como "(sem resposta)", que é o mesmo sintoma de crédito da OpenAI acabado, e
  separar um do outro custava uma investigação. Agora o agente ganha uma última rodada para
  escrever a resposta com o que apurou. No Simulador, quando ele escala para um humano, a tela
  mostra o que a cliente leria de verdade.
- **A agente lembra da conversa.** Ela dizia "não tenho acesso a conversas anteriores, cada
  atendimento começa do zero" com dezenas de mensagens salvas ali, e o cliente tinha que repetir
  tudo. O histórico sempre esteve na mão dela; agora ela sabe disso.
- **Integração conectada não some mais da lista.** O painel travava em nove integrações, e QUAIS
  nove mudava entre uma leitura e outra. O caro era invisível: a integração que caía de fora
  simplesmente não existia para o agente naquele turno.
- **Ferramenta que existe e está conectada chega ao agente.** Havia um filtro que entregava só
  parte do que cada integração oferece, então três ferramentas vizinhas do mesmo aplicativo tinham
  sortes diferentes, e o agente informava que não tinha a que faltava. E quando a leitura falha por
  rede, agora há uma segunda tentativa e uma linha no painel dizendo que o agente rodou sem elas,
  em vez de silêncio.
- **A separação por pastas do Cérebro passou a valer também no chat.** Um agente configurado para
  não ler certa pasta respondia com o conteúdo dela mesmo assim: o limite valia no que ele busca,
  e não no que ele recebe junto da pergunta.
- **O segundo agente de um número dividido pode ser configurado.** Quando dois cargos dividem o
  mesmo WhatsApp, só o dono do número aparecia na Sala de Treino; não havia caminho nenhum no
  produto para editar a personalidade e a base de conhecimento do outro, que atende clientes de
  verdade.
- **O Curador do Cérebro ficou mais barato.** Ele era a única rotina do Cérebro sem nenhum controle
  de gasto e chegou a responder por 62,8% da conta de uma instalação em seis dias. O corte é no
  raciocínio interno, que ninguém lê; o que ele escreve na sua memória continua inteiro.


### 🗄️ Fontes de Conhecimento: o banco do seu negócio passa a alimentar o Cérebro sozinho

- Até aqui, ensinar o assistente sobre o negócio real (quem é o cliente, o que ele paga, o que
  trava a venda) exigia alguém entrando direto no banco de dados. Nenhum comprador conseguia
  reproduzir isso sozinho.
- Agora, em Config, você conecta o banco do seu negócio com uma credencial de leitura, e o
  sistema lê a estrutura dele e propõe as notas que valem a pena manter, com caixinha para marcar
  as que quiser.
- Antes de qualquer proposta valer, a tela mostra a consulta e o resultado de verdade. Só depois
  de você ver e aprovar é que ela passa a valer.
- Aprovada, a nota se mantém sozinha: o relógio da empresa reexecuta a consulta no momento certo,
  e só reescreve a nota quando o número realmente mudou.
- A conexão é sempre de leitura, nunca grava nada no seu banco, e o guia mostra como criar uma
  credencial mínima para ela.
- Nome, telefone, e-mail e documento de cliente nunca chegam a uma nota. O sistema resume o
  padrão, não copia a pessoa.
- Se a conexão falhar ou a proposta vier vazia, a tela conta o motivo em português, em vez de um
  erro técnico ou de simplesmente não mostrar nada.
- Resetar a Empresa também apaga a credencial guardada no cofre, sem deixar sobra.

## [v1.24.0] — 2026-08-24

### 🎨 "Gostei dessa, muda só isso": o ajuste chegou ao estúdio

- **Antes:** você gostava de uma arte, queria tirar uma coisa dela e não tinha como. O estúdio só
  sabia começar do zero: pedir mudança gerava outras fotos, e a que você tinha aprovado sumia.
- **Agora tem um botão "Melhorar esta imagem"** em cada arte. Você escreve o que quer mudar com
  suas palavras ("tira a calculadora da mesa", "deixa a luz mais quente", "aproxima o
  enquadramento") e a MESMA arte volta com a mudança. A cena, o enquadramento, a luz e o texto
  continuam iguais; muda o que você pediu.
- **A arte anterior fica guardada ao lado da nova.** Se não gostar do ajuste, ela continua ali.
- **Pelo chat também.** Diga ao designer "tira o caderno dessa arte" e ele faz, sem perguntar de
  qual arte você está falando.

### 🔧 Consertado no estúdio

- **O designer ficava mudo quando você pedia para mudar uma arte.** No instante em que o anúncio
  nascia, ele sumia do campo de visão dele: você dizia "gera de novo" e ele respondia com texto,
  porque não tinha como saber de qual peça se tratava. Agora as artes já feitas ficam à vista dele.
- **A arte final não é mais uma foto diferente da que você escolheu.** Ao finalizar em alta
  qualidade, a prova aprovada agora viaja junto como referência. Antes o alto era um desenho novo
  da mesma descrição, e voltava parecido no assunto e diferente em tudo o que você tinha olhado
  para escolher.
- **Pedir mudança não traz mais de volta o texto colado por cima da foto.** A geração já desenhava
  o texto dentro da cena, mas a revisão tinha ficado para trás e devolvia a peça montada.
- **Os botões de editar a arte funcionavam só depois de clicar no card.** Numa página recém-aberta
  eles não faziam nada, sem aviso nenhum: o painel fechava como se tivesse obedecido.


### 🎨 O designer aprendeu a fazer anúncio, não foto com faixa de texto

- **Antes:** você pedia três anúncios e recebia três fotos bonitas com uma faixa de texto por cima.
  Trocar o ângulo mudava a frase; a peça continuava com a mesma cara.
- **Agora:** ele conhece 20 FORMATOS de anúncio, e o formato é o que a peça É. Uma planilha impressa
  com uma coluna marcada de amarelo. Um print de conversa de madrugada com o nome censurado. Um
  recibo enrolando na beira da bancada. Um cartão de ponto na parede.
- **O texto de dentro da cena agora é permitido, quando o texto é o objeto.** Nas peças em que o
  documento é o assunto, ele desenha o documento com as linhas, os números e o rabisco de caneta.
  Um errinho de letra ali até ajuda: papel de verdade não é perfeito.
- **O texto de VENDA continua exato**, na fonte da sua marca e dentro da área que o aplicativo não
  cobre. Isso não mudou e não vai mudar.
- **Formato cru sai cru.** Num documento fotografado o designer tira o botão de chamada e assina
  discreto: botão grande por cima de um papel entrega que aquilo é anúncio, e era justamente o
  contrário que se queria.
- **Ele não repete o formato da leva passada.** Pedir três anúncios hoje e três amanhã passa a
  render seis peças diferentes, não duas iguais três vezes.
- **A pessoa da foto é remixada, não colada.** O rosto continua sendo o seu; a pose, a roupa, o
  ambiente e o que ela está fazendo mudam conforme o conceito.
- **Corrigido, e era o pior de todos:** por causa de um carimbo novo que a OpenAI passou a colocar
  nas imagens, **todo anúncio estava saindo como uma foto sem uma palavra em cima**. A única pista
  era uma linha dizendo que a montagem tinha falhado.

### 🧠 O estúdio passou a aprender com você, mesmo sem anúncio rodando

- Até aqui o time só aprendia com métrica do Meta Ads. Quem não roda anúncio pago passava o dia
  aprovando e mandando refazer peça, e ninguém guardava nada disso.
- **Agora, uma vez por semana, ele olha o que você aprovou, o que mandou refazer e o que arquivou**
  e anota o padrão do seu gosto. Fica como anotação removível: se você discordar, apaga.
- **Quando há anúncio rodando, a lição ficou mais honesta.** Ele passou a olhar em que ponto o
  anúncio perdeu a pessoa. Se quase ninguém passou dos primeiros segundos do vídeo, o texto não
  chegou a ser lido, e ele deixou de culpar o texto por isso.

### 📦 A entrega agora sai do produto

- **Botão para baixar o pacote inteiro** na Sala de Entrega: uma pasta por peça, com a arte e o
  texto juntos, os roteiros à parte e um bilhete explicando o que é cada coisa. Pronto para postar,
  sem abrir editor nenhum.
- **A lista de tarefas voltou a ser legível.** Ela mostrava a instrução técnica que o agente recebe
  ("use as tools X, não responda em texto") no lugar do nome do trabalho.

### 🎯 O briefing ganhou os campos que decidem

- **Cliente ideal da peça, gatilho e nível de consciência** entram no briefing do anúncio, sem virar
  obrigação: peça sem eles continua saindo.
- **A promessa da chegada entrou no Kit da marca:** o que a pessoa encontra quando clica. O anúncio
  passa a mostrar uma das cenas que a página abre, para a chegada confirmar o que foi prometido.


### 🎙️ Falar com o agente virou a mesma coisa que escrever para ele

- **A voz passou a ter o cérebro do chat.** Antes existiam dois: um que lia e escrevia, e outro,
  mais fraco, que ouvia e falava. O falado errava argumento, não enxergava metade das
  ferramentas e precisava de uma segunda lista de cadastro para cada coisa nova. Agora é um só.
- **Consequência direta:** tudo o que o agente faz por escrito ele faz falando, sem exceção. Uma
  habilidade nova nasce disponível nos dois lugares no mesmo dia.
- **A voz continua a mesma voz.** Nada mudou no som: o agente segue falando com a naturalidade de
  sempre, com respiração e entonação. Tentamos trocar isso por uma leitura sintetizada mais
  barata, ouvimos o resultado e voltamos atrás.
- **Enquanto ele consulta alguma coisa, ele avisa em voz alta** o que foi fazer, em vez de deixar
  você no silêncio sem saber se a pergunta chegou.
- **Enquanto ele entende o que você falou**, a tela diz isso. Antes ficava parada por um instante
  longo o bastante para você achar que não tinha funcionado e apertar de novo, o que mandava a
  mesma coisa duas vezes.
- **Digitar não faz o agente falar alto.** Ele responde por voz quando você falou por voz, e por
  escrito quando você escreveu.
- **Corrigido:** com a entrevista inicial pendente e o microfone disponível, a primeira pergunta
  podia não sair de jeito nenhum, e a tela ficava muda esperando.
- **Corrigido:** os números das listas sumiam da resposta na tela. "1." virava um espaço em
  branco e o texto parecia cortado no meio.
- **Cortar a fala no meio agora conta a verdade.** Quando você fala por cima e interrompe o
  agente, o histórico passa a guardar só o trecho que chegou a tocar. Antes ficava lá a resposta
  inteira, e a memória de longo prazo tratava como dito e recebido algo que você nunca ouviu.

### 💰 O painel cobrava a voz duas vezes

- **O custo de voz aparecia entre duas e três vezes maior do que é.** A parte da conversa que a
  OpenAI reaproveita de um turno para o outro sai muito mais barata, e o painel estava somando
  essa parte por cima do preço cheio em vez de abater.
- O efeito era ao contrário do esperado: quanto melhor o reaproveitamento, MAIOR o número na tela.
- Corrigida também a tabela de preço da resposta em texto, que estava acima do valor oficial.
- Os lançamentos antigos continuam com o número inflado (não dá para refazer a conta sem os dados
  originais). Daqui para frente o painel está certo.

### 📦 A Sala de Entrega: peça o pacote inteiro de uma vez

- **Uma tela nova, `Entregas`.** Você pede "campanha de setembro: 3 anúncios, 5 posts e 2 reels,
  com arte" e acompanha um quadro vivo, peça por peça, com quem está com cada uma agora.
- **Agora existe um botão de começar.** Até aqui não havia como criar nada nem no estúdio de copy
  nem no de design: só dava para conversar e torcer para o agente entender que era hora de agir.
- **A conta aparece ANTES de você confirmar.** O pedido mostra quanto vai custar, item por item,
  e o que custa mais aparece separado. É o primeiro lugar do produto onde um clique gasta muitas
  vezes, e quem paga é a sua chave.
- **Dois limites protegem o pacote, e nenhum corta calado:** 12 peças por formato e 20 por
  entrega. O que passa disso é dito, com o número.
- **Você pode pedir falando.** A mesma entrega sai pela conversa com a copywriter, com os mesmos
  limites do botão.
- **O pacote anda sozinho até o fim.** Antes as artes esperavam você abrir a tela e clicar depois
  que os textos ficassem prontos, e num pedido grande algumas nunca chegavam a ser pedidas.
- **Corrigido:** o pedido podia chegar menor do que o combinado sem nenhuma linha contando. Agora
  o que foi cortado e o que ficou faltando aparecem junto com a confirmação.
- **Corrigido:** roteiro de vídeo pedia arte. O designer era mandado ilustrar um texto feito para
  alguém gravar, o que gastava uma imagem por roteiro e deixava o item preso em "esperando a
  arte" para sempre.
- **Corrigido:** a arte de uma campanha nascia solta. O pacote dizia "arte pronta" e não havia
  caminho de volta até a imagem.

### 🔁 O anúncio que foi ao ar volta a ensinar

- **A peça descobre sozinha que está no ar.** Quando você aprova o lançamento de um criativo, o
  anúncio passa a ficar ligado à peça que o produziu. Antes esse fio se rompia na Meta e você
  tinha que ligar as duas coisas na mão.
- **A peça que foi MAL também ensina.** Só a vencedora virava aprendizado; agora a que ficou
  abaixo do normal da conta vira proibição na ficha da marca. Você já pagou a mídia para
  descobrir que aquele gancho não funciona, e sem isso pagaria de novo.
- A peça mediana continua não ensinando nada, de propósito: ela não tem lição, tem ruído.

### 🤝 Os agentes passaram a se chamar

- **A Lia pede a arte pro Téo sozinha.** Antes você tinha que ler a copy pronta, clicar em "pedir
  arte", esperar e abrir o outro estúdio. Agora é só pedir.
- **O Rui aciona a Lia e o Téo** a partir de uma recomendação de anúncio cansado, sem você
  intermediar.
- **A campanha inteira sai de um pedido:** planejar, escrever todas as peças e pedir todas as
  artes viraram três comandos que o agente executa na conversa.
- **A copy chega ao designer campo a campo** (título, apoio, chamada para ação), em vez de um
  parágrafo com tudo junto que ele tinha que separar.
- **Editar por conversa não custa nada.** Pedir "troca o título para X" agora ajusta o texto sem
  gerar nada novo; antes esse mesmo pedido virava uma reescrita paga.
- **O revisor de imagens ganhou o poder de refazer.** Quando ele reprova uma prova, ela é refeita
  na hora, uma vez, e ele precisa dizer o que viu ("li X no lugar de Y") em vez de só reprovar.
- **A campanha respeita a quantidade que você pediu.** "3 anúncios, 5 posts e 2 reels" agora é
  conferido: o que passa é cortado e o que falta é dito, com os números.
- **Corrigido:** as referências que você arquiva no swipe file quase nunca eram usadas, e quando
  eram, o texto delas não chegava a ser lido. Agora chegam, marcadas por canal.

### 🎠 Carrossel: a série que sai por uma imagem só

- **O Téo faz carrossel.** Você pede, e ele monta de 5 a 10 slides: capa com a promessa, um
  argumento por slide no miolo, e o último cobrando a ação.
- **A série inteira custa uma imagem.** Só a capa leva foto; o miolo é tipografia grande sobre a
  cor da sua marca, que é como agência faz e é o que garante que os slides combinem entre si.
- **Deslize a série na tela** com setas, pontinhos e a tira de miniaturas, e **baixe tudo de uma
  vez**: o arquivo vem com os slides numerados na ordem de publicação.
- **Editar o texto de um slide não custa nada** e não mexe nos outros.
- **Pedir uma mudança remonta a série**, em vez de devolver dois anúncios soltos.

### 🎬 O roteiro de vídeo virou filmável

- **O roteiro deixou de ser um parágrafo.** Cada cena vem com o tempo, a fala, o que a câmera
  mostra, o que aparece escrito na tela e o b-roll sugerido, em campos separados. Quem grava lê a
  tabela e filma.
- **A duração é calculada pela fala** (145 palavras por minuto) e aparece no cabeçalho da peça.
  Antes o roteiro inteiro era medido, então enquadramento e legenda contavam como texto falado e
  um roteiro que cabia era acusado de longo.
- **Cinco aberturas alternativas por roteiro**, na mesma resposta. Trocar o gancho virou copiar,
  não pedir um roteiro novo.
- **Editar a fala de uma cena não custa nada** e o tempo se refaz sozinho.
- **Formatos novos:** UGC, VSL e anúncio em vídeo de 15, 30 e 60 segundos. Reels, TikTok, Shorts
  e YouTube longo passaram a sair em cenas.
- **Corrigido:** pedir uma peça escrevendo "Reels" com maiúscula, com espaço sobrando ou com
  underscore fazia a peça cair num formato genérico, em silêncio, sem os limites e sem as regras
  da plataforma.
- **Corrigido:** quando o Rui pedia arte nova para um anúncio, a direção específica do problema
  (gancho, meio do vídeo, chamada para ação) e o nome do anúncio nunca chegavam ao Téo, e o
  briefing saía genérico em todo pedido. O mesmo passou a valer para a Lia.
- **Corrigido:** anúncio de VÍDEO cansado recebia texto de feed como renovação. Agora recebe
  roteiro.

### 🔎 A peça pronta passa por conferência, e a conferência mostra a conta

Havia um buraco que ninguém via: as provas passavam pela revisão do designer, e a arte FINAL,
aquela que você baixa e sobe no anúncio, não passava por nada. Era a única peça que ninguém
olhava.

Agora ela é conferida, e a conferência é por medida, não por opinião. O sistema mede se algum
texto ficou apertado, se algo caiu onde o aplicativo cobre a arte, e se o texto lê de verdade
em cima da imagem. Quando reprova, ele diz o número: "o título ficou em 3,2 para 1, e o mínimo
é 4,5".

A peça reprovada é entregue do mesmo jeito, com o motivo junto, porque ela custou uma geração e
a decisão é sua. E como editar não custa nada, dá para consertar ali mesmo.

**No texto, a conferência pega três coisas que já saíram entregues.** Lacuna esquecida no meio
da peça, do tipo "[PROVA: quantos clientes]". Promessa que reprova anúncio e pode dar dor de
cabeça, como cura, resultado garantido ou ganho fixo por dia. E roteiro que não cabe no tempo:
se você pediu 30 segundos e o texto tem 180 palavras, ele avisa que isso dá uns 74 segundos
falados.

Quando a conferência reprova, ela vence a opinião do revisor: peça com lacuna esquecida não sai
aprovada só porque o texto ficou bonito.
### ✏️ Dá para editar a peça, e editar não custa nada

Até agora, mudar uma palavra do anúncio significava gerar tudo de novo: nova imagem, novo
gasto, e a sorte de o resultado vir parecido. Acabou.

Como a arte passou a ser montada em camadas, o estúdio guarda a cena separada do texto. Trocar
o título, o botão, o layout ou as cores é remontar por cima da mesma cena. **Nenhuma imagem é
gerada, então não sai nada da sua conta.**

No estúdio do designer, cada peça ganhou um botão de editar: você muda o texto, escolhe outro
formato de anúncio na lista, ajusta a cor da faixa, do botão e do destaque, e aplica. Vale
também nas provas, antes de finalizar, que é a hora mais barata de acertar a mensagem.

No estúdio da copywriter, cada campo da peça tem "editar" do lado. Muda o título sem mexer no
resto, salva, pronto.

**E dá para voltar atrás.** Se a terceira versão ficou pior que a primeira, escolha a versão na
lista e clique em Voltar. Nada é apagado: a versão antiga é copiada para o topo e todas as
outras continuam guardadas, então você pode ir e voltar quantas vezes quiser.

Peça criada antes desta mudança tem o texto colado na imagem e não dá para editar campo a
campo. Nesse caso o sistema diz isso com todas as letras, em vez de fingir que tentou.
### 🔤 O texto do anúncio parou de sair embolado

Esta é a mudança maior do estúdio de design, e ela conserta a queixa mais comum de todas.

Antes, o desenhista de imagem escrevia o texto do anúncio dentro da própria figura. É por isso
que a letra saía torta, com sílaba faltando ou palavra inventada, e a cor nunca era exatamente
a da sua marca. Não era falta de capricho: modelos de imagem simplesmente não sabem escrever
direito, e quanto mais palavras, maior a chance de estragar alguma.

Agora o trabalho é dividido. O modelo desenha só a CENA, sem uma letra sequer. O texto entra
depois, por cima, em fonte de verdade, no tamanho certo e na cor da sua marca. O resultado é
texto sempre nítido, sempre legível, sempre do jeito que você escreveu.

**E o botão virou botão.** A chamada para ação sai numa pílula sólida na cor da sua marca, com
o texto dentro dela, do jeito que anúncio que converte é feito.

**Seis formatos de anúncio, e as provas vêm diferentes de verdade.** Faixa no topo, bloco no
rodapé, editorial central, bloco de cor, depoimento e capa de carrossel. Cada prova que você
recebe usa um formato diferente, então dá para comparar caminhos, e não três versões da mesma
coisa com a frase trocada.

**As cores saem do seu Kit.** Quem decide qual cor é fundo, qual é botão e qual é destaque é
você, na ficha de direção de arte. O sistema só confere se o texto ainda LÊ em cima da cor
escolhida, e escurece ou clareia o fundo quando a foto atrapalha.

Se algo der errado na montagem, a peça é entregue com a cena mesmo assim e o motivo aparece
junto. Você não perde uma geração que já pagou.
### 📐 A arte final sai no tamanho exato da plataforma, com a sua marca nela

Antes o estúdio entregava a imagem no tamanho em que o gerador conseguia desenhar, e não no
tamanho que o Instagram e o Facebook pedem. Você baixava um quadrado de 1024 e tinha que
ajustar por fora antes de subir.

Agora não. A arte final sai em 1080x1080 no post quadrado, 1080x1350 no post vertical,
1080x1920 no story e 1200x628 no anúncio de link. É o arquivo pronto para subir.

**E ela sai assinada.** Se você já subiu o logo da marca, ele entra na peça, no canto, do
tamanho certo. O sistema mede a região onde o logo cai: se o fundo estiver escuro e você tiver
subido a versão de uma cor só, ele usa essa; se mesmo assim o logo fosse sumir no fundo, ele
coloca um leve fundo atrás para a marca aparecer. Quem ainda não subiu logo tem a peça assinada
com o nome da marca.

**Nada é desenhado onde o aplicativo cobre.** No story e no reels, o Instagram desenha por cima
da sua arte: nome e foto no topo, legenda e botões embaixo. A marca agora respeita essa faixa,
então ela não vai parar debaixo do botão de enviar mensagem.

Se por algum motivo a marca não puder ser aplicada, a arte é entregue do mesmo jeito e o motivo
aparece junto. Você não perde uma geração que já pagou.
### 🖼️ Agora dá para subir o seu logo, e as cores da marca saem dele

A ficha de direção de arte era só leitura: o designer aprendia a cara da marca conversando
com você e não havia por onde você mostrar nada. Agora tem. Você sobe o arquivo do seu logo,
o sistema lê as cores dele e mostra cada uma com a porcentagem que ela ocupa, e você diz onde
cada cor se usa: cor principal, apoio, fundo, texto, ou botão. Só entra na marca o que você
aceitar.

Dá para subir também uma versão de uma cor só, para peça de fundo escuro, e escolher as
fontes de título e de texto.

**E dá para tirar uma cor errada.** Antes, uma cor que o sistema tinha aprendido errado ficava
para sempre e entrava em toda peça nova. Agora sai com um clique.

Mexer na marca é coisa de dono: quem entrou como membro da equipe vê a ficha e não a altera,
porque ela é o material de partida de tudo que a empresa produz dali em diante.
### 🎯 A copywriter passou a escrever com a sua voz, não com adjetivos sobre ela

O sistema guardava exemplos de textos da sua marca e nunca os usava. Na hora de escrever,
a copywriter recebia só a descrição ("voz direta", "tom acolhedor"), que é o tipo de coisa
que não ensina ninguém a escrever como você. Agora os seus textos reais vão junto, e a peça
sai soando como a sua empresa desde a primeira. Se você tem exemplos por canal, os do canal
daquela peça também entram.

**As cores da marca passaram a sair do arquivo do seu logo.** Antes elas eram descritas por
escrito e ninguém conferia, então "o azul da marca" virava um azul qualquer. Agora dá para
ler as cores do próprio arquivo, em código exato, e você confirma quais entram. Cor errada
que o sistema tinha aprendido também pode ser removida: antes ela ficava para sempre.

**A copywriter e o designer passaram a conhecer o trabalho um do outro.** O texto agora
nasce sabendo em que registro visual a peça vai viver, e a arte já nascia sabendo da oferta.
Texto corporativo em cima de imagem crua é o que mais denuncia que as duas metades não
conversam.

A marca também passou a guardar o logo, a tipografia e o papel de cada cor (qual é o fundo,
qual é o botão). É o que vai permitir, nas próximas atualizações, que a peça saia com a sua
cor exata e o seu logo no lugar, em vez de uma aproximação.
### ✍️ A copywriter entrega campo a campo, e não um paredão de texto

A peça saía como um bloco só de texto, para todos os formatos. Você recortava headline,
descrição e chamada na mão para colar no Gerenciador, sem saber se cada pedaço cabia. Agora
cada parte vem separada, com o nome do campo, um contador que mostra quanto ela ocupa do
limite da plataforma e um botão de copiar só dela. Se estourar, você descobre ali, e não
depois de colar e o anúncio ser reprovado.

**Os limites de caractere existiam no sistema e nunca eram conferidos.** Headline de Google
saía acima do teto e o Google recusava. Agora eles são medidos em toda peça, e o aviso vem
junto do texto, sem travar nada: você vê o problema e edita.

**Pedir uma mudança podia devolver o texto igualzinho com um "pronto, revisei".** Quando a
reescrita não vinha, o sistema guardava uma versão nova idêntica à anterior e dizia que tinha
revisado. Agora, se não conseguir reescrever, ele diz isso e não mexe na peça.

**E uma falha na revisão de qualidade não joga mais a copy fora.** O texto já estava escrito
quando o revisor entrava; se ele falhasse, a peça inteira se perdia. Agora ela é entregue,
apenas sem o parecer.
### 🎨 O estúdio do designer parou de cortar o anúncio no meio

A peça aparecia recortada em toda tela do estúdio, e o pedaço que sumia era justamente o de
cima e o de baixo: a frase principal e o botão de chamada. Como um anúncio é feito de
palavras, você escolhia entre três retângulos de fundo sem conseguir ler o que estava
escrito neles. Num story chegava a sumir metade da altura da peça. Agora a arte aparece
inteira, na proporção real do formato, e clicar nela abre em tamanho de verdade, com setas
para percorrer as outras e botão para baixar.

**O controle de qualidade do designer estava sendo escrito e jogado fora.** Ele confere as
próprias imagens e anota o que saiu errado, mas esse laudo se perdia antes de chegar na tela.
Você só ficava sabendo se lesse a resposta dele na conversa. Agora o aviso aparece no card da
peça, onde você decide.

**"Pedir arte" dizia que tinha dado certo mesmo sem designer na equipe.** Quem ainda não
contratou um designer clicava, lia que o pedido foi feito, ia no estúdio e não tinha nada.
Agora ele diz o que falta e como resolver. Se o designer estiver de férias, ele avisa pelo
nome.

**Oito ações falhavam em silêncio.** Finalizar em alta, salvar uma parte do briefing, subir
foto de referência, produzir as peças de uma campanha e mandar as peças virarem arte: quando
qualquer uma dava errado, o botão voltava ao normal como se nada tivesse acontecido, e você
reclicava achando que não tinha clicado. Agora cada uma diz o motivo. E a de finalizar em
alta avisa que a arte pode ter ficado pronta mesmo assim, para você não pedir outra e pagar
duas vezes pelo mesmo trabalho.

**A tela do copywriter congelava na hora de passar o trabalho adiante.** Quando os textos ficavam prontos e
começava a produção das artes, a página parava de se atualizar sozinha e os indicadores
ficavam parados até você atualizar na mão. Parecia travado e não estava.

**Os números do anúncio se apagavam sozinhos.** Se a leitura da Meta falhasse na hora de
atualizar, o sistema gravava o vazio por cima e a peça passava a aparecer no ar sem número
nenhum, como se o anúncio nunca tivesse rodado. Agora uma leitura que não veio nunca apaga a
que já estava lá.

E o estúdio do copywriter abre mais rápido: uma esteira de trinta peças fazia sessenta e uma
consultas ao banco para montar a mesma tela que agora se monta com duas.

### 💬 O WhatsApp: cinco buracos que só apareciam em quem estava usando de verdade

*Relatados por Vinicius Milani, com laudo linha a linha em cada um.*

**Conversa que a equipe começa pelo celular batizava o cliente com o nome da própria empresa.**
Em número em coexistência, a mensagem que sai do celular chega ao sistema com o nome do perfil
comercial preenchido, e era esse o nome que ia para o contato. Dez clientes diferentes com o
mesmo nome na lista, e o erro era permanente: o campo só se preenchia quando estava vazio, então
a resposta da cliente com o nome verdadeiro nunca entrava. Agora o contato nasce sem nome e a
primeira fala dela o preenche. E vai além: os contatos que **já** estão com o nome errado se
corrigem sozinhos assim que cada cliente escrever de novo, sem ninguém mexer em nada.

**O toque de cliente sumido saía uma vez por cliente, para sempre.** O contador de toques subia
e nunca voltava a zero, então "um toque por sumiço" virava um toque na vida inteira daquela
conversa. O segundo sumiço, que é o caro (o cliente some na hora de marcar), nunca recebia nada.
Agora, quando o cliente responde, o contador zera: cada novo silêncio ganha o seu toque.

**Quando a chamada ao modelo falhava, a cliente ficava sem resposta e nada avisava.** Sem crédito
na conta da OpenAI, ou com a chave inválida, a chamada volta vazia sem levantar erro, e o sistema
lia isso como "o agente não quis dizer nada": marcava o atendimento como concluído com sucesso.
Nenhum erro no banco, nenhuma resposta enviada, e nada voltava sozinho quando o crédito era
reposto. Agora uma rodada que não produziu nada é tratada como falha: tenta de novo, e se
insistir avisa o time. Serviço que volta reprocessa o que ficou parado.

**O canal oficial da Meta enviava e não recebia, e o painel dizia que estava saudável.** Faltava
um passo que ninguém sabia que existia: inscrever o aplicativo na conta do WhatsApp Business.
Sem ele a Meta não entrega mensagem nenhuma, e não guarda o que perdeu. O teste de saúde olhava
só indicadores de envio, todos ótimos, então o sintoma era uma ausência. Agora **vincular o
número já liga a entrada**, tudo pelo painel, e a saúde do canal confere se a entrada continua
de pé, avisando no Inbox quando não está.

**O Inbox parava nas 50 conversas mais recentes.** Não havia paginação, nem carregar mais, nem
busca: da 51ª em diante elas não existiam para quem usa a tela. E pior, os filtros rodavam sobre
esse mesmo pedaço, então uma conversa aguardando atendimento humano fora dele não aparecia em
filtro nenhum, nem no dela. Agora há **Carregar mais conversas**, e os filtros perguntam ao
banco, não à lista já carregada.

### ⚠️ O Inbox avisa quando NENHUM agente consegue responder

*Sugerido por Vinicius Milani, no mesmo relato do atendimento que ficava mudo.*

O conserto acima faz cada conversa se recuperar sozinha, mas "acabaram os créditos da sua
conta da OpenAI" é uma informação diferente de "uma conversa falhou": nesse caso **todas** as
conversas estão mudas ao mesmo tempo, e o sintoma continuava sendo uma ausência.

Agora, quando a causa é algo que você resolve (crédito acabado, chave recusada, sem acesso ao
modelo, limite de chamadas), o **Inbox mostra um aviso no topo** dizendo o que aconteceu e o
que fazer. Ele some sozinho assim que um agente voltar a responder.

Falha passageira de rede não entra nessa lista de propósito: um alarme que aparece e some
sozinho ensina você a ignorar o alarme de verdade.

### 🔎 Busca no Inbox, por nome ou por número

*Relatado por Vinicius Milani, junto do limite de 50 conversas.*

Com centenas de conversas, rolar a lista não é caminho. O campo de busca no topo da coluna de
conversas **pergunta ao banco**, então alcança qualquer cliente, e não só quem já está na tela.
Você pode digitar o número como lê, com espaço e traço: ele encontra do mesmo jeito.

### 🔑 A Loja sem licença agora leva você até a tela da licença

Com a licença ainda não conectada, a Loja explica por que a vitrine está vazia. Só que o aviso
dizia o caminho por escrito e parava por aí: você lia o nome da tela e tinha que ir procurá-la
no menu. Agora o aviso traz o botão **Conectar licença**, que abre direto a seção Licença das
Configurações, com o campo da chave já ali. O mesmo vale para o aviso de chave ativa em outra
instalação.

Quem entra como Membro continua vendo o aviso, porque precisa saber por que a Loja está vazia,
e não vê o botão: as Configurações são do dono da conta, e o link só o levaria de volta para a
tela inicial.

### 🚀 A atualização de 1 clique pedia para você terminar no EasyPanel

*Relatado por Wesley Rodrigues Tereciani, com os registros do painel, que foram o que resolveu.*

Clicar em atualizar publicava tudo certo, o card pedia para aguardar, e a reconstrução não vinha.
No EasyPanel a implantação aparecia falhada, e rodar o Deploy na mão funcionava. Os registros
contam o resto: a construção começava a baixar o código e morria um segundo depois, com o arquivo
terminando antes da hora.

O motor publicava no seu GitHub e acionava o deploy no mesmo instante. Só que o GitHub prepara
esse arquivo sob demanda: no segundo seguinte ao envio ele podia ainda não estar pronto, e a
construção morria no download sem que nada percebesse.

- Antes de acionar, o motor **confirma que o GitHub já serve o que acabou de publicar**. O
  efeito colateral vale mais que a confirmação: pedir o arquivo faz o GitHub prepará-lo, então
  a construção encontra pronto o que teria que esperar.
- Botão **Acionar o deploy** dentro do painel, para quando o que faltou foi só a reconstrução.
  O código já está no seu GitHub, então não há por que refazer a atualização inteira nem sair
  daqui.
- A segunda tentativa de acionar (por outro método) virou exceção: ela cancelava a construção
  que já estava rodando.

### 🔌 O app subia pedindo "a URL do projeto" mesmo com tudo preenchido no painel

*Encontrado num deploy novo no EasyPanel, com todas as variáveis no lugar.*

O app subia e **toda página** respondia erro, com uma mensagem em inglês do Supabase dizendo
que a URL do projeto era obrigatória. Quem estava instalando conferia as variáveis, via que
estavam certas, e não tinha como avançar.

A causa: as variáveis com prefixo `NEXT_PUBLIC_` são gravadas dentro do app na hora do build,
não lidas quando ele roda. Quando o build acontecia sem elas repetidas na aba "Build", o app
não nascia sem o endereço; nascia com o endereço **em branco**, que é diferente. Toda a rede de
segurança que existia para buscar o valor na variável de runtime testava "está faltando?", e
como o valor estava presente e vazio, ela nunca era acionada.

- O app passa a ler a conexão do Supabase **em runtime** e a entregá-la ao navegador sozinho.
  Preencher as variáveis do painel basta: **não é mais preciso repetir nada na aba "Build"**.
- Quem já passa as variáveis de build continua funcionando exatamente como antes.
- Se um dia a conexão realmente faltar, a tela agora **diz em português o que preencher e onde**,
  em vez de mostrar um erro técnico em inglês.
- `NEXT_PUBLIC_SUPABASE_URL` deixou de ser obrigatória (o app usa `SUPABASE_URL`), e a
  `NEXT_PUBLIC_BASE_URL` passou a ser respeitada em runtime, como as demais.

## [v1.23.0] — 2026-08-19

**A leva que vocês reportaram, e o fio que liga quase tudo: o sistema dizia que tinha feito, e
não tinha.** Uma tarefa que não produziu nada chegava com ✅. Uma memória que não entrou no
Cérebro era anunciada como guardada. Uma instalação com o trabalho automático parado mostrava
tudo em ordem. Cada um desses era um jeito diferente de falha silenciosa, e todos foram fechados.

### 🧑 O seu assistente parou de assinar como "jarvis"

*Relatado por Lucas Alves, que perguntou, com toda razão, se existia um agente chamado Jarvis.*

O aviso de aprovação no Telegram vinha assinado com o **identificador interno** do agente, não
com o nome dele: "jarvis pediu sua aprovação", "coo pediu sua aprovação". Esse identificador
nunca deveria aparecer para você.

- No Telegram, quem assina é o nome do agente, o mesmo que você vê e pode trocar em **Agentes**.
- Em **Aprovações** ("Solicitado por gestor-trafego"), no **Custo** e na fila do Command Center,
  o mesmo defeito aparecia com os cargos da Loja. Todos passam a mostrar gente.
- No feed do Command Center, o atendimento aparecia como "Atendimento" em vez de "Sofia".

### ✅ Tarefa que não produziu nada parou de chegar como concluída

*Relatado por Wesley Rodrigues Tereciani, com o caminho no código.*

Quando um agente terminava uma tarefa sem escrever uma linha, o aviso chegava assim mesmo com
"Terminei o que você pediu", e o corpo era um texto interno nosso. Agora isso chega como falha, e
o texto explica o que houve. Ele **não** manda pedir de novo: o agente pode ter usado ferramentas
antes de emudecer, e repetir duplicaria o trabalho.

### 👥 Pedir na conversa que a equipe se organize voltou a funcionar

*Relatado por João Carlos, que testou duas vezes e recebeu o mesmo erro nas duas.*

Pedir ao Chefe de Gabinete que montasse um plano **pela conversa** falhava sempre, com um erro
interno ("Sem tarefa-raiz no contexto") que não dizia o que fazer. O guia promete justamente esse
caminho. Agora o plano nasce da conversa, vai para **Aprovações** como sempre, e o campo
*Responde a* do organograma volta a valer para coordenação de verdade.

### 📎 O arquivo que você anexa agora viaja com a tarefa

*Relatado por Rubens Paiva.*

Você anexava um material na conversa, pedia a análise, o assistente repassava para o especialista
e ele recebia **só a frase do pedido**. O arquivo ficava para trás, e a resposta vinha sobre algo
que ele nunca viu.

### 🧠 A memória que não entra no Cérebro agora avisa

*Relatado por Rodrigo Rocha, que foi até a tabela no banco e trouxe o erro exato.*

Duas coisas, e a segunda é a que importa mais:

- Quando o raciocínio do Curador era longo demais, o pedido de aprovação **falhava no GitHub** e a
  memória sumia: nenhum cartão, nenhum registro, e a conversa tinha acabado de dizer que estava
  guardada. Corrigido.
- E quando o sistema **desiste** de guardar uma memória, depois de tentar, isso agora **chega até
  você**. Antes esse número existia só num registro técnico que ninguém abre.

### 📡 O painel avisa quando a sua empresa parou de trabalhar sozinha

*Relatado por Wesley Rodrigues Tereciani.*

O trabalho automático (rotinas, fila de atendimento, avisos do Telegram) podia estar parado há
dias sem nada indicar. As telas abriam normalmente e a checagem de saúde respondia que estava tudo
bem, porque ela não olhava nada.

- O Command Center mostra um aviso no topo quando o trabalho automático parou, dizendo o efeito:
  rotinas não rodam, mensagens de clientes ficam na fila.
- Para quem usa monitor externo, `/api/health?deep=1` passa a reprovar de verdade nesse caso. O
  endereço de sempre continua como estava, de propósito: ele é o que o servidor usa para saber se
  deve reiniciar o container, e reiniciar não resolve trabalho parado.

### ✂️ Textos longos pararam de chegar cortados no meio da palavra

*Relatado por Lucas Alves, com o print.*

O título de um plano chegava ao Telegram partido no meio da palavra e sem reticências, então não
dava para saber se faltava texto. O mesmo título aparecia cortado no resumo diário.

---

## [v1.22.1] — 2026-08-15

**Conserto do "este agente não fala", que só funcionava pela metade.** O ajuste em si valia (o
servidor recusa a voz de um agente calado), mas as telas não contavam a mesma história, e mutar um
agente apagava a voz que você tinha escolhido para ele.

### 🔇 O microfone some de verdade, em todas as telas

A ficha em `Agentes` promete que "o microfone não aparece na conversa com ele", e não era o que
acontecia: o botão continuava na tela, só apagado, e a frase embaixo do campo de escrever dizia
"Voz indisponível no momento", como se fosse problema de conexão em vez de uma escolha sua.

- Na conversa, o botão do microfone **sai da tela** e a frase diz o motivo certo.
- Nos cockpits do Tráfego, Copy, Design e Jurídico, a voz **nem é oferecida**. Antes eles tentavam
  abrir uma sessão de voz, tomavam a recusa do servidor e anunciavam "Voz indisponível".

### 🎙️ Calar um agente não apaga mais a voz que você escolheu

Escolher "Não fala" **zerava a voz escolhida**. Quem tinha colocado uma voz a dedo, calava o agente
por uns dias e depois religava, recebia "Automática" e uma voz sorteada, sem aviso nenhum.

- A voz **fica guardada** enquanto ele está calado, e a ficha diz qual é e como religar.
- No elenco, o agente calado mostra "Só por texto" em vez de anunciar uma voz que ele não usa.

## [v1.22.0] — 2026-08-14

**Duas melhorias que vocês pediram, e a faxina das quatro dívidas que ficaram da v1.18.0.** O fio
que liga tudo: o produto sabia mais do que mostrava e permitia mais do que devia. Ele registrava o
caminho de um pedido e não deixava ninguém ver; deixava um membro da equipe aprovar gasto que não
era dele; parava de esperar um trabalho e o deixava correndo assim mesmo.

### 🔒 Quem decide uma aprovação é o dono da conta

Se você tem alguém da sua equipe usando o sistema como **Membro**, ele conseguia aprovar as ações
pendentes, incluindo uma proposta que ele mesmo tinha acabado de provocar. Aprovar gasta a sua
chave e age com as suas credenciais, então virou decisão sua e de mais ninguém.

- O Membro continua **vendo a fila inteira**, que é o que dá transparência do que a empresa está
  fazendo, e lê no lugar dos botões quem decide.
- Vale também para editar um anúncio antes de subir, que é a mesma caneta.
- **A curadoria de ferramentas de cada agente passou a valer na hora de agir.** Antes ela decidia
  só o que o agente enxergava; agora uma integração fora do que você liberou não roda nem vira
  pedido. Se o sistema não conseguir conferir a permissão, ele não age e pede para tentar de novo.

### ⏱️ Quando o prazo estoura, o trabalho para de verdade

Quando um pedido demorava demais, nós parávamos de esperar e avisávamos você, mas o trabalho
seguia correndo do outro lado, gastando a sua chave para ninguém. Agora ele é cortado: nenhuma
etapa nova começa. O que já estava rodando termina, então o aviso continua dizendo, com todas as
letras, que parte do trabalho pode já ter acontecido.

### 🧠 O nosso aviso parou de voltar como se fosse fala do agente

Quando um turno estoura o prazo, o sistema escreve um aviso na conversa em nome do agente. Esse
aviso estava sendo encontrado pela busca no histórico e voltava para o assistente citado como
coisa que ele disse. Agora ele fica de fora dessa busca.

### 🎨 Ferramenta nova de cockpit já nasce pintando o painel

Havia uma lista de nomes de ferramentas escrita à mão no chat. Ferramenta nova funcionava na voz e
não aparecia no painel do chat, em silêncio, até alguém lembrar de acrescentar o nome ali.

### 🔇 Agora dá para dizer que um agente não fala (melhoria pedida por Jackson)

Dava para escolher **qual** voz cada agente usa, e não dava para dizer que ele simplesmente não
fala. Quem só quer texto ficava com o microfone na cara e com o risco de abrir uma conversa por
voz sem querer, que é a parte cara.

- Em **Agentes**, na parte de **Voz**, a lista ganhou a opção **"Não fala (só texto)"**. Escolher
  qualquer voz religa.
- Na conversa com esse agente o microfone recolhe e a tela diz o motivo certo: que ele responde só
  por texto e onde dar uma voz a ele. Antes a única frase disponível ali culpava a conexão, o que
  seria falso para uma escolha sua.
- O ajuste vale de verdade, e não só na aparência: o pedido de voz é recusado no servidor, então
  nem uma aba antiga consegue abrir uma sessão paga com um agente que você calou.

### 🧭 Dava para ver o resultado, não o caminho (melhoria pedida por Lucas Alves)

Quando um pedido atravessava vários agentes, você via o resultado final ou não via nada. Qual
cargo pegou, em que ordem, quanto tempo levou, onde parou e por quê: tudo isso ficava escondido,
e quando travava no meio a única saída era abrir chamado.

- **Nova tela `/tarefas`**: a lista dos pedidos, e ao abrir um deles, quem fez cada parte, quanto
  tempo levou e **em qual ponto parou**. Quem está segurando o objetivo vem marcado.
- **O motivo real aparece.** Quando uma tarefa falha, o erro de verdade agora fica registrado e
  visível na tela. Antes ele morria no log do servidor, fora do seu alcance.
- **Filtros de "só o que falhou" e "esperando você"** que olham o objetivo inteiro, não só a
  primeira linha dele. Um pedido cuja etapa interna espera sua aprovação aparece marcado.
- **A mesma tela abre pelo organograma** (no card do plano em andamento) e **pelo Command Center**:
  uma tarefa que morreu no meio agora aparece em "Precisa de você", que era o único tipo de
  pendência que a home não tinha como mostrar. Falha não gera aprovação, nem conversa esperando,
  nem prazo, então o objetivo parava e o cockpit seguia calmo.
- Do lado das ações, dá para ir direto à aprovação que está travando o pedido e para cancelar o
  objetivo (esse último, só o dono). **Não existe "tentar de novo", e isso é decisão:** uma tarefa
  que falhou no meio pode já ter feito metade do trabalho, e repetir faria de novo o que já foi
  feito.
- O caminho começa a ser registrado a partir desta versão. Pedidos antigos aparecem na lista, mas
  dizem, com todas as letras, que são anteriores ao registro. O histórico é mantido por 90 dias.

## [v1.21.0] — 2026-08-11

**A triagem das melhorias pedidas: seis viraram conserto, três foram recusadas com o motivo
inteiro.** O fio que liga quase tudo aqui é o mesmo: o produto tinha a informação na mão e
não a entregava. O Curador escrevia por que não guardou uma memória e jogava o motivo fora;
o guia do Meta Ads existia e ninguém achava; o logo do comprador existia e a aba mostrava a
nossa marca. **Zero migração de banco.**

### 🧠 O Cérebro era um beco sem saída para corrigir uma nota (Paulo J.)

- O `consolidate` do Curador **sempre** devolve o motivo de ignorar, e o `proporMemoria` o
  descartava, entregando ao agente um "não guardei" seco. Sem o porquê, o agente inventava:
  disse ao dono que "quem edita é o Curador, você não consegue" e mandou fazer na mão. As
  duas frases eram falsas. É a mesma doença que a v1.20.0 curou na ação que falha.
- **E o caminho manual não existia.** Não havia endpoint nem botão de editar nota; só se
  editava candidata durante a importação. Nota errada ficava errada para sempre e o recall
  servia o erro em toda conversa. Agora o `/cerebro` tem **Editar**, Dono-only, reusando o
  `NoteWriter` e o `Committer` da Fase 0 (que segue intacta).
- `MergeMode` ganhou o modo `edit`: em `merge`/`set` o título gravado vence o proposto, o que
  está certo para escrita automática e faria uma renomeação manual voltar com o nome velho.
- **Achado do teste ao vivo:** a primeira versão ignorava o `ApplyResult` do `commitFile`.
  Quando o push falha, o `Committer` escala para PR, o que inclui `reset --hard` e desfaz a
  edição — e a tela dizia "salvo". Agora só `kind:'commit'` é salvo.

### 🏷️ A aba do navegador também é a marca do comprador (Wesley T.)

- O card mandava recarregar a página, e ninguém precisava: o layout é `force-dynamic` e as
  rotas de escrita já invalidavam o cache da marca. Nome, logo e cores aparecem na hora.
- O logo agora vira **favicon** e ícone de atalho. Sem logo próprio, a Onda de fábrica segue.
- **O que ninguém tinha pedido e era o pior:** o título da aba era "Awave Agents" fixo. Quem
  punha a marca própria ficava com a nossa na aba e em todo favorito salvo.

### 📎 Soltar o arquivo em cima das mensagens engolia em silêncio (Wesley T.)

- Arrastar existe desde a v1.12.0, mas a zona era só o compositor, e a rede que impede o
  navegador de abrir o arquivo numa aba engolia o drop no resto da tela **sem avisar nada**.
  A zona passa a ser a coluna inteira; o realce continua no compositor, que é onde o arquivo
  cai. O contador de profundidade virou módulo puro e testado.

### 🧭 O passo a passo do Meta Ads no ponto onde a pessoa trava (Wesley T.)

- O pedido era vídeo-aula; o guia escrito já existia e é o mais completo do produto. Faltava
  o produto apontar: o aviso e a linha de conexão do Meta Ads agora levam **Como conectar**.
  Só toolkit com guia próprio entra no mapa, de propósito.

### 🖱️ A rolagem do chat de suporte fugia da leitura (Fabio B., repo `dashaluno`)

- Aguardando atendimento humano, o chat consulta o servidor a cada 10s e reconstruía a lista
  inteira, então toda volta parecia mensagem nova e a tela era puxada para o fim. Agora ela
  só acompanha o fim se o leitor já estiver nele, e consulta que voltou igual não conta como
  mudança. Enviar e trocar de conversa continuam descendo.

### 📂 Seções do menu que recolhem (Jackson)

- O pedido era submenu em cascata no hover. Recusei a cascata (hover não existe no toque e é
  ruim de teclado) e entreguei o que resolve o incômodo real, a lista comprida: cada seção
  rotulada recolhe, com a escolha lembrada. **A seção da página atual abre sempre**, mesmo
  recolhida, e o **selo de aprovações sobe para o cabeçalho** de uma seção fechada, senão
  recolher Governança desfaria o aviso que a v1.20.0 existiu para consertar.

### 🚫 Recusados, com o motivo publicado

- **Idioma (i18n).** No Motor não é traduzir telas: as personas dos agentes e a voz são o
  produto, e ficariam em português dentro de um painel em inglês.
- **Tema claro.** O escuro é o material de que o produto é feito, não uma paleta por cima.
  O que existe e resolve parte do pedido é o card Marca.
- **Múltiplos provedores de LLM.** Terceira recusa do mesmo item, decisão travada. Metade do
  pedido, porém, **já existe**: escolher o modelo por agente, atrás do modo técnico.

## [v1.20.0] — 2026-08-11

**A leva do dia 11: sete relatos, seis consertos, e dois defeitos que só o teste ao vivo
achou.** O padrão desta varredura é diferente do da anterior. Ali o sistema esperava e não
contava; aqui o sistema **contava a coisa errada**: um cartão pedindo uma conexão que não
existe, um sinal verde numa ação que falhou, uma mensagem culpando a conexão quando o
problema eram os campos enviados. **Zero migração de banco.**

### ✅ O plano ficava esperando e nada avisava (Wesley T.)

- O selo do menu acende por um aviso ao vivo, e **seis dos dez caminhos que abrem uma
  aprovação não emitiam esse aviso**. O do plano era um deles, que é justamente o pedido mais
  demorado que existe. Agora o aviso nasce num lugar só, dentro da criação da aprovação:
  caminho novo não tem como esquecer, porque não há nada a lembrar.
- O plano nasce **depois** que a vez do assistente no chat terminou, dentro do trabalho de
  fundo. A conversa ficava muda. Agora ela recebe o recado no instante em que o plano vai
  para aprovação, dizendo do que se trata e onde decidir.

### 🔁 Recusar um plano dizendo o que mudar (Wesley T.)

- Era tudo ou nada: recusar cancelava o objetivo inteiro, e quem discordava de uma etapa
  entre cinco recomeçava do zero. Agora a recusa abre uma escolha. Você escreve a correção e
  o Chefe de Gabinete monta um plano novo atendendo a ela. **O freio não mudou:** o plano
  novo volta para a sua aprovação e nada roda antes disso.
- No teste ao vivo apareceu um segundo defeito: o plano recusado **bloqueava a criação do
  plano novo** e o replanejamento morria calado. Consertado junto.

### 🛠️ A ação que falhava e virava um sinal verde (Paulo J.)

- Falha de ação aprovada **não voltava para a conversa**. O agente não sabia do erro e
  propunha a mesma coisa de novo, sem fim. Agora a falha volta com o erro exato.
- Pior, e só apareceu ao vivo: a ferramenta **recusa sem dar erro de sistema**. O produto lia
  aquilo como sucesso e escrevia um sinal verde com "executei, use este dado", carregando a
  mensagem de erro dentro. Agora "executou" e "deu certo" são coisas diferentes.
- A mensagem de erro de leitura cravava "verifique a conexão" em qualquer falha, mesmo quando
  o problema eram os campos enviados. E a regra que proíbe alegar falha técnica inventada
  existia **só sobre o organograma**. Os dois consertados: o erro real vai junto, e inventar
  um limite do sistema ou empurrar você para fazer na mão virou proibição escrita.

### 🔌 Ferramenta que não pede conexão virava cartão morto (Mohamed)

- Existem 16 ferramentas no catálogo que **funcionam sem conectar nada** (busca na web, gerar
  PDF, interpretador de código). Elas apareciam como pendência eterna, com um botão Ativar
  que abria um formulário sem campo nenhum.
- A metade invisível era pior: elas **nunca chegavam ao agente**, porque a montagem só
  considerava ferramenta com conta conectada. Agora o cartão diz "pronto para usar, não
  precisa conectar" e elas chegam ao agente que as escolheu.

### 🌐 O endereço de retorno ia para 0.0.0.0 (Eduardo M.)

- Faltava preencher o domínio público numa variável de deploy, **fora do painel**, e sem ela
  quebravam o retorno de conexão, o webhook do WhatsApp e mais três coisas. Agora o sistema
  descobre o domínio sozinho pelo que o EasyPanel já anuncia. Quem preencheu segue igual.

## [v1.19.0] — 2026-08-10

**Esta release é sobre o que o produto deixava você achar que era culpa sua.** Ela saiu
inteira de nove relatos da comunidade, verificados um a um contra o código. O padrão que
apareceu nos quatro consertos é o mesmo: **o sistema estava esperando alguma coisa e não
contava para você**. A voz esperava uma permissão que nunca vinha, e você concluía que a
tecla não funcionava. A fila de aprovações esperava a sua palavra, e você concluía que o
pedido tinha morrido. E um agente que não podia executar dizia "vou executar agora", e você
esperava por uma hora. **Zero migração de banco.**

### 🎙️ A tecla Espaço voltou a funcionar (e nunca mais trava)

- Quando o navegador pergunta se pode usar o microfone e **essa pergunta fica sem resposta**
  (você saiu da aba, não viu a barrinha, clicou fora sem escolher), o navegador deixa o
  pedido pendurado para sempre. O sistema esperava esse pedido **sem prazo nenhum**: a voz
  ficava presa em "Preparando a voz" eternamente, e daí em diante segurar Espaço não fazia
  mais nada. Não havia aviso e a única saída era recarregar a página.
- Agora o pedido tem **prazo de 30 segundos**, generoso de propósito porque do outro lado
  tem uma pessoa lendo o aviso do navegador. Passado o prazo, a tela **para de dizer que
  está quase** e conta o que houve. E, o mais importante: **segurar Espaço de novo tenta
  outra vez**. Antes, uma vez preso nesse estado, você ficava preso.

### 💬 A conversa por voz para de sumir do chat

- O texto de uma fala chega bem depois do áudio dela, e o chat **guardava uma fala de cada
  lado** esperando formar o par para mostrar as duas juntas. O problema: cada fala nova
  **sobrescrevia a anterior**. Quem falasse duas vezes seguidas, cortando o agente, perdia
  a primeira. O mesmo acontecia quando o agente falava antes e depois de usar uma
  ferramenta.
- Agora **cada fala vira balão sozinha**, carimbada com a ordem do instante em que começou.
  Fala cortada no meio não atrapalha as seguintes, e transcrição que chega atrasada cai no
  lugar certo do fio.

### ✅ A fila de aprovações parou de crescer calada

- Nada no painel avisava que existiam propostas esperando você. Havia bolinha no menu, mas
  só para dizer que existe atualização disponível. Na prática, **uma tarefa parada esperando
  a sua palavra era indistinguível de uma tarefa que não aconteceu**.
- Agora o item **Aprovações mostra quantas estão na fila**, visível de qualquer tela,
  atualizando sozinho quando algo entra ou sai, e sumindo quando a fila zera.

### 🤖 Nenhum funcionário promete o que não fez

- As regras que proíbem um agente de dar por feito o que não executou, de esconder que uma
  ação está esperando aprovação e de prometer trabalho "para daqui a pouco" **moravam só na
  personalidade do assistente principal**. Um funcionário contratado na Loja ou feito sob
  medida não as recebia: quanto mais você personalizava o time, **menos garantia o time
  tinha**.
- Agora valem para **todo funcionário**, na conversa escrita e na falada. Quem não executou
  não pode mais dizer que executou.

### 🔧 Por dentro

- O espelho da voz no fio da conversa estava copiado byte a byte em cinco telas; virou um
  hook só (`useFalasDaVoz`). A regra de "de qual estado dá para reconectar" também.
- Decisões novas em módulos puros e testados: `fioDaVoz` (ordem das falas),
  `prazoDoMicrofone`, `tentarDeNovo` e `aprovacoes/selo`.

## [v1.18.0] — 2026-08-08

**Esta release é sobre nunca mais falar com uma parede.** Ela nasceu de um relato de uma
palavra só: "processa, mas não devolve resposta". Investigar até o fim mostrou que o
assistente tinha **vários jeitos de terminar um trabalho em silêncio**, e em nenhum deles
você ficava sabendo. Agora não tem mais silêncio: ou ele responde, ou ele conta o que houve.
Junto vem uma arrumação por dentro que você não vê, mas sente: **a voz e o chat deixaram de
ser dois sistemas separados**, então tudo o que o assistente aprende a fazer já nasce
funcionando nos dois.

### 🔇 O assistente parou de ficar mudo

- Quando ele consultava muita coisa e **acabava sem espaço para escrever a resposta**, você
  não recebia nada. Nem resposta, nem erro, nem aviso. A tela simplesmente ficava como estava.
  Agora ele faz uma última passada com tudo o que já levantou e **responde de verdade**, com
  o que apurou.
- Quando nem isso dá certo, ele **conta o que aconteceu** em vez de sumir. E o aviso muda
  conforme o caso: se ele já tinha começado a fazer alguma coisa (gravar uma memória, criar
  uma tarefa), ele **não pede para você repetir**, porque aquilo termina sozinho e repetir
  criaria uma segunda cópia. Ele pede para você perguntar o que ficou pronto.
- Quando uma resposta batia no **limite de tamanho**, ela parava no meio de uma frase, calada,
  e você concluía que ele tinha se perdido. Agora ela avisa que parou ali e se oferece para
  continuar.
- E quando alguma coisa **travava de vez**, o "digitando" ficava para sempre. Agora existe um
  limite de paciência, calibrado para não cortar trabalho pesado de verdade: gerar um
  relatório de tráfego ou gravar no Cérebro demora, e isso é normal.

### 📋 Toda falha dessas aparece para você

- Antes, quando um trabalho falhava assim, o registro ia para um log de servidor que você
  nunca abre. Por isso o problema durou tanto: acontecia e ninguém via.
- Agora ele **aparece na sua tela inicial**, na mesma lista onde você já acompanha o que o
  time fez. Se for um problema repetido, ele aparece **uma vez a cada quinze minutos** em vez
  de encher a lista e esconder todo o resto.

### 💬 Vale no chat, no Telegram, nas tarefas e no atendimento

- O conserto foi feito no **motor** que todos usam, então vale em todo lugar de uma vez.
- No **Telegram**, o aviso chegava a ser gravado e nunca era enviado. Agora chega.
- Nas **tarefas do time**, uma que travasse ficava "em andamento" para sempre e era tentada de
  novo a cada dez minutos, travando de novo, gastando da sua conta cada vez. Agora ela termina
  e diz por quê.
- Na **entrevista de contratação** de um agente novo, uma trava deixava você olhando o cursor.
  Agora ela fala.
- No **atendimento por WhatsApp**, se a fila desistir de responder um cliente, **você é
  avisado na hora** e a conversa fica marcada para você entrar. **Nada é dito ao cliente em
  seu nome**: silêncio se recupera, promessa quebrada não.

### 🎙️ A voz e o chat viraram um só

- Toda ferramenta que o assistente ganha agora **já nasce funcionando na voz**. Antes eram
  dois cadastros separados, e o que ficava de fora ficava de fora em silêncio.
- Três coisas nunca tinham chegado à voz por causa disso, e agora chegaram: **registrar um
  aprendizado**, **propor um plano de tráfego inteiro** de uma vez, e **planejar um objetivo**.
- E as instruções que o assistente recebe por voz eram versões **encurtadas** das do chat.
  Isso o fazia agir diferente falando: o gestor de tráfego, por exemplo, respondia com um
  tutorial de como você mesmo mexer no anúncio, em vez de propor a ação para você aprovar.
  Agora as duas são a mesma.
- No caminho, a voz também ganhou **as fontes na gaveta embaixo da resposta**, como no chat.

### 🔒 Coisas que o assistente parou de fazer errado quando você fala com ele

- Um agente que você **desligou** em `Agentes` continuava atendendo por voz. Agora desligar
  desliga nos dois.
- Quando você ditava um valor e ele chegava num formato que a ferramenta não esperava, o
  assistente **lia um erro técnico em inglês em voz alta**. Agora ele entende o que você quis
  dizer nos casos claros, e nos casos ambíguos ele **avisa e pede para você repetir**, em vez
  de adivinhar. Vale principalmente para orçamento: se ele não tem certeza do número, ele
  pergunta em vez de chutar um valor menor.
- Ele podia dizer **"é só tocar em Registrar"** para um cartão de memória que não tinha
  aparecido na tela. Agora a frase e o cartão saem da mesma decisão, então não têm mais como
  discordar.
- E ele parou de ler encanamento em voz alta (códigos internos, identificadores e datas em
  formato de sistema no lugar do horário do seu relógio).

### 🛡️ Endurecimento, por baixo

- O assistente monta blocos de contexto com coisas suas (fatos da empresa, trechos de
  conversa, memórias). Um texto que tivesse os símbolos errados podia **fingir ser o fim de um
  bloco** e o que viesse depois seria lido como ordem sua. Todos os blocos passaram a ser
  fechados de um jeito que o conteúdo não consegue imitar. Vale inclusive para o que chega de
  fora: nome de campanha, arquivo importado, mensagem de cliente.
- Mensagens de erro internas deixaram de poder carregar credencial para o histórico e para o
  seu Telegram.
- E o registro de falha no painel deixou de ser contado como **trabalho entregue**: um agente
  com problema repetido não aparece mais como "ativo" por causa do próprio problema.

## [v1.17.0] — 2026-08-07

**Esta release é sobre memória.** A queixa que a abriu era curta: "ele volta a perguntar o
que eu já respondi, na mesma conversa". Investigar até o fim mostrou **três causas
independentes**, e cada uma sozinha já bastava. A Ficha da empresa vinha acumulando o mesmo
assunto escrito de várias formas, a ponto de se contradizer. O começo de uma conversa longa
sumia, porque o resumo que deveria segurá-lo só era escrito depois de dez minutos de
silêncio. E resumo perde detalhe, sem nenhum caminho de volta ao que você escreveu de
verdade. As três estão consertadas, e agora ele **relê as suas palavras originais** quando
precisa. Junto vêm o Cérebro que parou de perder nota em silêncio, a constelação que voltou
a ser legível, e um jeito de devolver o acesso de quem da sua equipe perdeu a senha.

### 🧩 Ele parou de perguntar o que você já respondeu

- A **Ficha da empresa** (aquilo que o assistente sempre sabe sobre você) vinha acumulando o
  mesmo assunto escrito de várias formas: "Oferta para médias", "Oferta para médias empresas"
  e "Modelo de oferta — Médias" como três linhas separadas, quatro linhas sobre ticket médio,
  e até duas linhas dizendo o nome da empresa de jeitos opostos, uma negando a outra.
- Como essa Ficha entra em **toda** conversa, ele lia a própria memória se contradizendo e
  voltava a perguntar o que já sabia. Agora, quando o assunto já tem uma linha, o valor novo
  **atualiza aquela linha** em vez de criar mais uma.
- No mesmo movimento, o Cérebro parou de empilhar tudo numa pasta só. A escolha da pasta
  seguia o tamanho: a maior era sempre a primeira sugerida, crescia, e ficava ainda mais
  provável na vez seguinte. Numa instalação isso terminou com 73 de 76 memórias no mesmo
  lugar. Agora a pasta é escolhida pelo assunto.
- **Se a sua Ficha já acumulou linhas repetidas, elas continuam lá.** O conserto impede que
  novas apareçam, mas não reescreve o que já estava gravado. Vale abrir
  `Configuração → Preferências → Fatos da empresa` e apagar as duplicadas uma vez, no botão
  **Remover** de cada linha.

### ⏳ Conversa longa não perde mais o começo

- Numa conversa que se estende por muitas mensagens, **o começo dela sumia**. O assistente
  carrega uma janela das mensagens recentes, e o que passa disso só sobrevive como um resumo
  daquela conversa. Só que esse resumo **só era escrito depois de dez minutos de silêncio**:
  numa sessão longa e sem pausa ele nunca chegava a existir.
- Resultado: no meio de um trabalho puxado, ele voltava a perguntar coisas que você tinha
  respondido meia hora antes, na mesma conversa. E o pior era não dar sinal nenhum.
- Agora a conversa é resumida **enquanto ainda está acontecendo**, assim que cresce o
  bastante, e o resumo chega antes de a parte antiga sair da janela.

### 🔎 Ele consegue reler o que você realmente escreveu

- Até aqui, o que saía da janela recente só sobrevivia como **resumo**. E resumo perde
  detalhe: se o número, a condição ou a regra não entrou nele, **para o assistente aquilo
  tinha deixado de existir**. Suas mensagens sempre estiveram salvas, você as encontra na
  busca do histórico, mas ele não alcançava.
- Agora ele alcança. Quando você diz "como a gente tinha combinado" ou "aquele número que te
  passei", ele **procura no que foi escrito e volta com as palavras originais**, não com uma
  lembrança aproximada. Vale no chat e na voz.
- E não depende de ele lembrar de procurar: em conversa longa, quando a sua pergunta pede um
  fato, os trechos certos entram sozinhos.
- Quando ele usa um trecho antigo, a origem aparece **na gaveta de fontes embaixo da
  resposta**, do mesmo jeito que já acontece quando ele consulta o Cérebro. Dá para conferir
  de onde veio sem sair da conversa.
- **Nada disso gasta a mais na sua conta da OpenAI:** a busca roda no seu próprio banco, sem
  chamar a IA.

### 🗄️ A Ficha da empresa parou de apagar fato antigo

- A Ficha guarda até 40 fatos. Ao passar disso, o mais antigo era **apagado**. Agora ele é
  **arquivado**: sai do que o assistente carrega em toda conversa, mas continua guardado, e
  **volta sozinho** se o assunto for mencionado de novo.
- No mesmo espírito: quando o resumo de uma conversa falhava várias vezes, o sistema marcava
  aquele trecho como processado para não ficar tentando para sempre, e ele se perdia. Agora
  o trecho fica e a nova tentativa acontece mais tarde.

### 🌌 A constelação do Cérebro voltou a ser constelação

- **Quanto mais memórias você tinha, pior ela ficava**, até virar um borrão de bolinhas
  empilhadas no meio da tela com os nomes escritos uns por cima dos outros. Não era enfeite
  quebrado: era a tela do Cérebro deixando de mostrar o que você tem. Num acervo de 76
  memórias, 71 delas terminavam **exatamente no mesmo ponto**.
- O cálculo que espalha as bolinhas disparava e as posições se perdiam. Agora ele tem freio, e
  as mesmas 76 memórias se abrem numa constelação legível. Quem tem acervo pequeno não vai
  notar diferença nenhuma: ali nunca deu problema.

### 🧠 O Cérebro parou de perder nota em silêncio

- **Nota que era gravada sem a extensão `.md` sumia.** Ela ia para o repositório com sucesso,
  o sistema reportava tudo certo, e depois ela não aparecia na busca, no índice nem na tela do
  Cérebro. Nunca. Numa consolidação relatada por um comprador, 19 de 21 notas evaporaram
  assim. Agora o nome é normalizado antes de gravar, e um caminho errado passou a **falhar
  alto** em vez de virar arquivo invisível.
- **As notas que já sumiram voltam sozinhas.** Ao atualizar, o sistema varre o repositório do
  seu Cérebro e traz de volta o que estava perdido, num commit só. Você não precisa fazer
  nada, e nada que estava certo é tocado.
- **Arquivo com acento no nome não subia para o Cérebro.** "Método de Vendas.docx",
  "Contratação.pdf", "Relatório.xlsx": qualquer acento fazia o envio ser recusado. E o aviso
  chegava minutos depois, falando em *download*, num envio que você achava ter dado certo.
  Agora o acento é tratado na hora de guardar, o nome que você vê continua o seu, e **um envio
  que falha avisa na hora qual arquivo não entrou** em vez de deixar o card rodando.
- Reenviar um arquivo que tinha falhado deixou de ser pulado com "já importei este antes".

### 🔑 Alguém da equipe perdeu a senha? Você devolve o acesso na hora

- Novo botão **Definir senha** na ficha de cada pessoa, em `Configuração → Equipe`. O campo já
  vem com uma senha forte pronta, e depois de confirmar ela fica à vista para você copiar e
  mandar para a pessoa por onde vocês já conversam.
- **Antes disso você precisava sair do Awave e ir mexer no Supabase**, que é exatamente o tipo
  de passo técnico que a gente promete que você não vai precisar dar. Um comprador acabou tendo
  que descobrir isso sozinho, por conta, e foi o relato dele que trouxe este botão.
- Só o Dono vê o botão, e ele não aparece na sua própria linha: a sua senha continua sendo
  redefinida por quem é dono da conta, que é você.

### 🤝 O assistente principal voltou a acionar o time

- Ao receber um pedido que envolvia várias especialidades (copy, criativo, campanha), ele
  fazia tudo sozinho em vez de acionar quem você contratou. O resultado saía sem o preparo de
  cada especialista, e o time ficava assistindo.
- Agora vale uma regra clara: **entregável que atravessa mais de uma especialidade do seu time
  é trabalho de equipe**, e ele delega. Sozinho, só o que cabe numa especialidade, ou o que
  você pedir que ele mesmo faça.
- **Ele parou de "assumir o papel" dos outros** e de alegar que o organograma ou o sistema
  está com problema para justificar ter centralizado. Quando uma delegação realmente não
  passa, ele diz o motivo verdadeiro (de férias, desligado, não existe) e o que fazer.

### 🖱️ A barra de rolagem do chat voltou

- Ela estava escondida por completo. Só dava para rolar com a roda do mouse ou o teclado, sem
  como arrastar de volta ao começo e sem nem enxergar que havia conversa acima. Agora ela
  aparece, fina e discreta, e ganha contraste quando o mouse entra na área. Vale para o chat
  do assistente, o de cada agente, o histórico e os painéis de entrega.

## [v1.16.0] — 2026-08-05

**Agora dá para desligar um funcionário do time.** Até aqui só existia mandar de férias, e
férias guarda o vínculo de propósito: o agente continua no organograma, conta na equipe e
ocupa a vaga do cargo na Loja. Quem experimenta agentes acabava com uma fileira de gente
parada justamente na tela que deveria mostrar quem trabalha ali. Junto vem uma leva de
consertos que saiu direto do que vocês reportaram, e um deles apagava a identidade da sua
empresa sem avisar.

### 👋 Desligar um agente do time

- **Botão "Desligar do time"**, na ficha do funcionário em Agentes. Ele sai do organograma,
  sai da contagem da equipe, some do seletor de conversa, o Chefe de Gabinete para de contar
  com ele ao montar plano, e **o cargo volta a aparecer contratável na Loja**, como se nunca
  tivesse sido contratado.
- **Nada é apagado.** As tarefas que ele fez, o custo que gerou e as conversas antigas
  continuam no lugar. O que muda é o presente, não o passado.
- **Tem volta.** Os desligados ficam num canto discreto da tela, com um botão **Trazer de
  volta**. Ele volta de férias, não trabalhando: religar o trabalho é um segundo toque, senão
  as tarefas e os gatilhos dele voltariam a rodar sem você perceber.
- **Quem respondia a ele sobe um nível.** Desligar alguém que tinha subordinados não some com
  o time dele: eles passam a responder ao chefe de quem saiu.
- **Contratar de novo funciona normalmente**, e vem com a versão de fábrica do cargo.
- **O assistente principal não pode ser desligado.** É ele que atende você, é a sala padrão
  da conversa e a raiz do organograma. Para mudar quem ele é, renomeie e reescreva a persona.
- **Pedir tarefa para alguém desligado agora é dito com todas as letras**, em vez de falhar
  em silêncio, e a mensagem separa "está de férias" de "não faz mais parte do time" (um volta
  com um toque, o outro precisa ser contratado de novo).

### 🔒 O ritual de nascimento deixou de reabrir numa empresa viva

- Digitar o endereço `/onboarding` numa instalação já configurada trazia o ritual de volta
  como se fosse o primeiro dia. **Ir até o fim reescrevia o nome da empresa, o nome do dono,
  a missão e o tom de voz**, e regravava a nota de identidade no Cérebro por cima da que já
  existia. Agora a empresa já nascida vai direto para o Command Center, e o sistema recusa um
  segundo nascimento mesmo que alguém force o pedido por fora do navegador.

### 👀 O seletor de conversa mostra só quem é do time

- Abrir o seletor de interlocutor listava nomes que não são seus funcionários, como
  "Architect" e "Designer". Um é peça de máquina (é o que escreve as habilidades dos agentes
  contratados) e nunca deveria ter sala; o outro era um agente **de férias** voltando pela
  porta lateral, sem ficha, aparecendo com o código interno em vez do nome que você deu.

### 🔌 Conectar uma ferramenta diz melhor o que houve

- Quando o Composio recusa a conexão por **falta de permissão da chave**, o motivo agora é
  reconhecido mesmo nos casos em que a resposta dele chega incompleta. Antes, dependendo de
  por qual camada o erro subia, a tela voltava ao texto genérico justamente no caso mais
  comum de todos: a chave criada só com leitura, que passa no "Testar" e falha no "Conectar".

## [v1.15.0] — 2026-08-04

**A sua empresa passou a trabalhar sozinha na hora marcada.** Até aqui, tudo começava com
você pedindo. Agora existe **Rotinas**: você escreve uma vez o que quer que aconteça e com
que frequência, e o funcionário faz, para sempre, sem você lembrar. Junto vem uma leva de
consertos que saiu direto do que vocês reportaram na comunidade, quase todos com a mesma
cara: o sistema freava por um motivo legítimo e não contava para ninguém.

### ⏰ Rotinas: o trabalho que acontece sem você pedir

- **Uma tela nova, em Empresa.** Você diz três coisas: quem faz, o que faz, e quando se
  repete. "Toda segunda às 8h, o Rui gera o relatório da semana com os números e o que ele
  recomenda mudar." Salvou, acabou.
- **Na hora marcada aquilo vira uma tarefa de verdade** do funcionário. Ele executa, o
  resultado aparece no painel e, se você usa o Telegram, chega lá junto com os arquivos que
  ele produziu.
- **Ou você simplesmente fala.** "Toda segunda às 8h o Rui gera o relatório da semana" cria
  a rotina ali na conversa, por texto ou por voz. Dá para listar, pausar e apagar do mesmo
  jeito, conversando.
- **O freio continua no lugar.** Rotina não é um atalho para o agente agir sozinho: se o
  trabalho precisar de uma ação que sai para o mundo, ela para em Aprovações como sempre
  parou. Uma rotina não consegue furar o seu controle nem que queira.
- **Sugestões prontas para começar:** resumo da manhã, relatório da semana e fechamento do
  mês, com um clique cada.
- **"Rodar agora"** em cada rotina, para você ver funcionando sem esperar o horário. E
  pausar guarda a rotina inteira, sem você perder o que escreveu.
- **O horário é o seu, no seu fuso.** E se o servidor ficar dias fora do ar, ao voltar ele
  agenda a próxima ocorrência futura, em vez de despejar de uma vez todas as que perdeu.

### 🚪 A instalação ganhou um jeito de sair

- **Botão Sair**, no rodapé do menu. Até agora só dava para sair fechando o navegador, o que
  é um problema real em computador compartilhado.

### 🗔 A conversa dentro dos cockpits ganhou espaço

- Nos painéis de Tráfego, Copy, Design e Jurídico, o copiloto vivia espremido numa faixa
  fixa. Agora tem um **botão para expandir**, e o sistema **lembra a sua escolha por
  cockpit**: o Jurídico pode ficar largo e o Tráfego estreito, cada um do seu jeito.

### 🔑 Esqueceu a senha

- A tela de entrada passa a dizer **quem consegue redefinir a senha** e leva ao passo a
  passo. Antes, esquecer a senha simplesmente trancava você do lado de fora, sem uma linha
  explicando o caminho.

### ✏️ Renomear um funcionário passou a valer de verdade

- **O nome novo vale na escrita e na fala.** Trocar o nome de um agente mudava só a
  plaquinha: ele continuava se apresentando pelo nome antigo no chat e no áudio, porque a
  identidade também mora dentro da personalidade dele. Agora a troca é feita nos dois
  lugares de uma vez.
- **Vale para quem já renomeou.** Quem trocou o nome antes desta versão não precisa fazer
  nada: o agente passa a se chamar pelo nome certo assim que você atualiza.
- **O nome sobrevive às atualizações.** Antes, uma nova versão de um cargo devolvia o nome
  de fábrica calada. Não devolve mais.
- Vale igual no atendente de WhatsApp renomeado no Treino — é ele que fala com o cliente.

### 🔊 A voz de cada agente virou config

- **Escolha a voz na ficha do funcionário** (`/agentes`), agrupada por timbre: masculinas,
  femininas e neutras, com uma linha sobre o caráter de cada uma. Antes a voz era sorteada
  e não havia onde mexer — dava para ter um cargo de nome masculino falando com voz
  feminina, e o painel mostrava só um código solto como "coral".
- **"Automática" continua sendo o padrão** para quem não quiser escolher.
- O seletor aparece igual no modo técnico, que ficara sem ele.

### 🩹 Consertos vindos da comunidade

- **Consultar deixou de pedir aprovação.** Ler uma base do Notion, buscar um registro,
  conferir um dado: ações que só leem passavam por Aprovações como se fossem escrever, e o
  trabalho parava à toa esperando você.
- **A mensagem digitada logo depois de falar parou de sumir da tela.** Ela era enviada e
  processada, mas desaparecia da conversa, então parecia perdida.
- **"Não consegui iniciar a conexão" passou a dizer o que houve.** Agora ele distingue chave
  sem permissão de escrita (a causa mais comum) de limite da conta atingido, e diz o que
  fazer em cada caso.
- **A saúde do Telegram aparece antes de parear.** O aviso de que o robô está com problema
  só era visível para quem já tinha pareado, ou seja, aparecia justamente para quem não
  precisava dele. E quando duas coisas disputam o mesmo robô, o painel agora explica isso
  sozinho, em vez de mandar você caçar a causa.
- **Desligar um funcionário passou a valer em todo lugar.** Ele continuava contado como
  ativo nos totais e na vitrine, então o desligamento parecia não ter pegado.
- **O resultado da ação aprovada volta para a conversa que a pediu.** Você aprovava e o
  desfecho não aparecia onde o assunto começou.
- **O atendente em modo de teste parou de emudecer calado.** Ele engolia a resposta sem
  dizer que estava em teste, e parecia quebrado.

## [v1.14.0] — 2026-08-02

**O atendente de WhatsApp virou gente.** Ele era cego (toda imagem virava "[cliente enviou
imagem]"), mudo fora de texto (não mandava um PDF nem uma foto), impaciente (despejava um
parágrafo enorme de uma vez) e não sabia a hora de chamar você. Agora ele lê o que o cliente
manda, responde como uma pessoa responde, entrega arquivo, oferece botão, chama uma pessoa
quando precisa e dá um toque em quem sumiu no meio da conversa. E um número só passa a
atender dois cargos: suporte e vendas dividem a mesma linha, cada um cuidando do que é dele.
É só atualizar, nada pra reconfigurar.

### 👀 Ele enxerga o que o cliente manda

- **Foto, print e comprovante.** O cliente manda a foto do produto quebrado e o agente
  descreve o que está vendo, na hora que a mensagem chega. Antes chegava "[cliente enviou
  imagem]" e ele respondia no escuro.
- **Áudio vira texto.** Quem prefere falar a digitar é atendido igual.
- **PDF e documento.** Contrato, boleto, pedido: ele lê o conteúdo, não só o nome do arquivo.
- **Botão, localização, contato e pedido do carrinho** deixaram de ser jogados fora. E o
  polegar pra cima, que no Brasil é um "sim", agora conta como resposta.
- **Valor de comprovante ele lê, mas não confia.** A leitura por imagem erra dígito com
  autoconfiança, então nenhum pedido é liberado por um número que a IA leu numa foto. Ele
  mostra o que leu e pede a confirmação.
- **Você vê o mesmo que ele viu.** A descrição da imagem e a transcrição do áudio aparecem
  no Inbox, do lado da mensagem. Quem aprova a resposta precisa saber em cima de quê ela foi
  escrita.

### 💬 Ele responde como gente, não como robô

- **Uma ideia por bolha.** A resposta chega picada como uma pessoa escreve, não num paredão.
- **"digitando…" de verdade**, enquanto ele pensa.
- **Ele não responde a pergunta velha.** Se o cliente mudar de assunto no meio, ele percebe e
  responde a pergunta atual.
- **Ele sabe que horas são** e o que "amanhã de manhã" significa pro cliente.
- **Quando um colega humano responde no meio, ele sabe.** Antes ele imitava a fala do colega
  como se fosse dele, incluindo promessas que a persona dele proíbe fazer.

### 📎 Ele manda arquivo e oferece botão

- **Catálogo de arquivos por número.** Você cadastra em Configuração o que o atendente pode
  enviar (tabela de preços, foto do produto, catálogo) e ele só manda o que está nessa lista.
  Ele nunca inventa um anexo.
- **Botões e listas clicáveis.** O cliente para de ter que digitar "sim". Onde o transporte
  não suporta botão, vira lista numerada e a informação chega igual.
- **No modo com aprovação, você vê o anexo antes.** E se o arquivo sumiu do servidor, a
  aprovação é recusada inteira: aprovar "segue em anexo" sem anexo é mentir pro cliente sem
  você saber.

### 🙋 Ele sabe a hora de chamar você

- **"Quero falar com uma pessoa" para a conversa na hora**, sem gastar mais um turno.
- **Conversa travada em círculos** e **cliente irritado** também chamam você sozinhos.
- **Chega com o dever de casa feito.** Junto vem um resumo do que o cliente quer, do que já
  foi apurado e do que falta. Antes você reabria a conversa perguntando o que o agente já
  tinha perguntado.
- **Chega no seu Telegram na hora**, com o resumo, pra você decidir se corre agora.

### ⏰ Ele dá um toque em quem sumiu

- **Desligado de fábrica**, porque mandar mensagem que ninguém pediu é sua decisão. Ligando,
  o agente manda **uma** mensagem retomando o assunto depois do tempo de silêncio que você
  escolher.
- **Sempre dentro das 24 horas** da última mensagem do cliente, então nunca custa taxa de
  plataforma. Quem responde não recebe o toque.
- **Ele não escala no toque.** Ninguém está esperando resposta, então chamar um humano ali
  seria alarme falso.

### 👥 Um número, dois cargos

- **Sofia e Davi na mesma linha.** Você diz em Configuração quais cargos dividem o número e
  por quais palavras cada um é chamado. "Quanto custa" vai pra vendas, "meu pedido atrasou"
  vai pro suporte.
- **A conversa continua a mesma.** O cliente não recomeça nem se repete: o histórico é um só,
  muda quem responde. No Inbox aparece uma linha discreta dizendo quem passou pra quem.
- **Sem ping-pong.** Uma conversa que mistura preço e problema técnico não joga o cliente de
  um lado pro outro a cada mensagem.

### 🧠 A base de conhecimento parou de esquecer

- **Política longa deixou de virar uma coisa só.** Quando você cola um texto grande num campo
  (uma política de trocas inteira, por exemplo), ele passa a ser indexado em pedaços. Antes a
  frase exata que responderia o cliente ficava diluída no meio do resto e a busca não achava
  justamente a entrada certa.
- **Vale pro que você já cadastrou**, não só pro que cadastrar daqui pra frente.

### 💸 Você vê a conta e a saúde do número

- **O que a Meta cobrou** aparece no painel de Custo, separado do que você gasta de IA.
- **Qualidade e limite do seu número** ficam visíveis no Inbox, com o aviso quando a Meta
  rebaixa a qualidade (é o sinal que antecede a suspensão do número).
- **Falha de envio parou de ser silenciosa.** Quando uma mensagem não sai, você vê o motivo
  em português e o sistema decide sozinho se vale tentar de novo ou se é caso perdido.
- **Identificação de IA na primeira mensagem**, com o texto editável por número. É exigência
  da Meta e da lei europeia (aplicável desde 02/08/2026), então dá pra mudar o texto, não pra
  desligar.

## [v1.13.0] — 2026-07-31

**A primeira conversa virou a mais importante do sistema.** Antes ela fazia três perguntas rasas e
o que você respondia se perdia: o assistente conversava bonito e no dia seguinte não sabia o preço
do seu produto. Agora ela entrevista de verdade, guarda o que você contou num lugar que **todos os
agentes leem em toda conversa**, e vai fundo o suficiente pra ser útil. Junto veio o estúdio da Lia
e do Téo funcionando em dupla, uma busca melhor no Cérebro, e uma proteção que faltava pra quem
personalizou o assistente. É só atualizar, nada pra reconfigurar.

### 🗣️ A primeira conversa agora sabe o que perguntar

- **Ela não trava mais logo no começo.** Dizer "tenho uma agência de marketing" ou "quero testar"
  fazia o sistema te classificar errado e encerrar a conversa sem perguntar nada. Frases que ele não
  reconhecia deixavam a tela parada pra sempre. Agora ele entende a frase, e se não entender ele
  pergunta de novo em vez de desistir.
- **Você responde uma vez e ele para de perguntar aquilo.** As respostas viram a **Ficha da
  Empresa**, um resumo curto que entra no começo de toda conversa de todo agente. É por isso que o
  Téo passa a saber seu público sem você repetir, e o Alan sabe o que a empresa faz.
- **Ele cava até a resposta servir.** Antes três palavras fechavam um assunto. Agora, se a resposta
  ficou vaga, ele mostra o que já anotou e pede o detalhe que falta, sem repetir a mesma pergunta. E
  ele desiste com elegância quando você claramente não quer detalhar.
- **As perguntas mudam conforme quem você contratou.** Com o Rui na equipe ele quer saber de metas e
  de faturamento; com o Alan, das suas restrições; com o atendimento, dos seus processos e canais.
  Quem tem só o básico responde menos.
- **Quem ainda não tem empresa também é ouvido.** Antes, responder "ainda não tenho empresa"
  encerrava tudo e seus agentes nasciam cegos. Agora ele pergunta o que você quer montar e pra quem,
  guarda isso como projeto (não como empresa) e, no dia em que você disser "abri o CNPJ", ele
  emenda na entrevista da empresa de verdade.
- **Funciona falando.** A entrevista acontece igual na voz e no Telegram, não só no chat.
- **O que você responde é salvo mesmo quando o assistente se distrai.** Se ele esquecer de gravar,
  o sistema grava por ele e te mostra pra confirmar.
- **Quem ainda não conectou o GitHub não fica preso.** A resposta é guardada na hora e a anotação
  no Cérebro entra sozinha quando você conectar.
- **Nome e missão da empresa ganharam tela.** Novo card **Identidade da empresa** em Configuração,
  pra corrigir sem depender da conversa.

### 🎨 A Lia e o Téo passaram a trabalhar em dupla

- **A copy aprovada vira pedido de arte com um clique.** Você aprova o texto da Lia e o briefing
  chega pronto no estúdio do Téo, sem copiar e colar.
- **Campanha inteira de uma vez.** Aprovou a campanha, as peças viram arte em lote.
- **A Lia escreve sabendo dos seus fatos.** Ela usa o que está no Segundo Cérebro (preço, público,
  diferencial) em vez de inventar um genérico.
- **A arte parou de ter cara de IA.** Mudou a forma de pedir a imagem e o resultado ficou mais
  próximo de anúncio de verdade.
- **O Téo confere antes de te mostrar.** Ele olha o que gerou e refaz sozinho quando saiu torto, em
  vez de te entregar o erro.
- **A arte vira anúncio em um clique.** Da imagem aprovada direto pro anúncio, pausado, esperando
  sua liberação.
- **Ele aprende com o que deu certo.** O Téo passa a olhar a performance real dos criativos pra
  guiar os próximos.

### 🧠 O Cérebro encontra melhor

- **A busca ficou mais precisa.** Cada trecho de anotação passou a carregar o título e a seção de
  onde veio, então trechos do meio de um documento longo param de virar órfãos sem contexto. Medimos
  a diferença: perguntas feitas com outras palavras que as da anotação passaram a acertar sempre.
- **Botão de reconstruir o índice.** No Cérebro, se você desconfiar que a busca está desatualizada,
  um clique reprocessa tudo em segundo plano.
- **Ele admite quando não sabe.** Passamos a medir isso a cada release: quando a resposta não está
  no Cérebro, ele diz que não tem o dado e pede, em vez de chutar um número.

### 🛠️ Acertos que você percebe

- **Personalizou o assistente? Não perde mais.** Se você editou o texto do Nathan em Agentes, uma
  atualização podia sobrescrever sem avisar. Agora ela reconhece que aquilo é seu e preserva.
- **A voz usa o assistente que você editou.** Antes a personalização valia no chat e não na voz.
- **A primeira tela não fica mais esperando a voz.** Quando a conexão de voz ficava pendurada, a
  saudação nunca aparecia e você ficava olhando "conectando" pra sempre.
- **A conversa não quebra se o time ficar vazio.** Numa instalação onde o assistente principal não
  chegou a ser criado, a tela de conversa dava erro sem saída. Agora ela recria o assistente e abre
  normalmente.
- **Ele para de te devolver hipótese como se fosse sua resposta.** O assistente chegou a gravar o
  próprio palpite como fato da empresa; agora o palpite fica claramente separado do que você disse.
- **Uma pergunta por vez.** Turnos que empilhavam três perguntas passaram a fazer uma e esperar.
- **O contador "N de 3" fala a verdade.** Ele atrasava um turno e não contava quem estava sem
  GitHub.

## [v1.12.0] — 2026-07-28

**Agora você mostra as coisas pros seus agentes.** Arraste um criativo, um print ou um contrato
dentro da conversa e o agente olha o arquivo de verdade, com os próprios olhos, e comenta na hora.
Junto vieram acertos em telas que estavam atrapalhando o dia a dia, principalmente na base de
conhecimento do atendimento e nas integrações. É só atualizar, nada pra reconfigurar.

### 📎 Mande imagem e PDF direto na conversa

- **O agente vê a arte, não o nome do arquivo.** Mande um criativo pro João, pro Rui ou pra Lia e
  peça o que quiser: ele enxerga a imagem inteira (o texto que está escrito nela, as cores, o que
  chama atenção primeiro) e responde sobre aquilo, não sobre um resumo.
- **Três jeitos de anexar, escolha o que for mais rápido.** O clipe ao lado do microfone, arrastar o
  arquivo pra cima da caixa de mensagem, ou colar com Ctrl+V. Colar é o caminho de quem acabou de
  tirar um print.
- **Pode mandar sem escrever nada.** Arrasta a arte, aperta Enviar e pronto. Não precisa inventar
  uma frase só pra acompanhar o arquivo.
- **PDF ele lê inteiro.** Contrato, proposta, relatório: até 20 páginas por arquivo. Pergunte o
  número da cláusula, o prazo ou o valor e ele responde de dentro do documento.
- **Ele lembra do arquivo nas mensagens seguintes.** Perguntar "e naquela foto que te mandei?" duas
  ou três mensagens depois continua funcionando, sem você precisar anexar de novo.
- **O arquivo fica na conversa.** A miniatura continua ali quando você recarrega a página, e clicar
  nela abre a imagem em tamanho grande.
- **Quando não dá pra ler, ele diz o motivo e a saída.** Foto de iPhone no formato HEIC, arquivo
  grande demais ou tipo que ele não abre: em vez de um erro seco, aparece o que fazer ("manda como
  JPG ou PNG que ele vê na hora"). Limites: 10MB por arquivo, até 3 por mensagem.

Vale saber a diferença: o anexo fica **naquela conversa**, é material do momento. Pra ensinar a
empresa com um manual ou uma tabela de preços que todos os agentes devem saber para sempre, o
caminho continua sendo o Cérebro, onde você revisa antes de virar memória.

### 🧠 A base de conhecimento do atendimento voltou a aparecer inteira

- **A aba Base de conhecimento do Inbox mostrava só meia linha.** Os cards abriam com a altura do
  cabeçalho, então a lista de entradas aparecia cortada e o editor do lado direito sumia por
  completo. Agora a tela ocupa a altura inteira: a lista rola por dentro e o editor fica do lado,
  visível.
- **Cada entrada mostra o que ela ensina.** Além do título, você lê duas linhas do conteúdo direto
  na lista, e o cabeçalho diz quantas entradas existem.

### 🔌 Integrações que respondem quando você pede

- **Peça em português e o agente acha a ferramenta.** O catálogo de conexões é em inglês, então
  pedidos como "procura a página no Notion" ou "lista meus eventos" podiam voltar como "não tenho
  acesso" mesmo com a integração conectada e ativa. Agora o pedido em português encontra a
  ferramenta certa.
- **Conectar uma ferramenta te devolve pra onde você estava.** Quem começava a conexão em
  /integrações era jogado no painel de configuração no fim do processo, o que parecia erro. Agora
  você volta pra própria tela de onde saiu.
- **Só aparece a integração de quem trabalha na sua empresa.** O card do Google Ads era mostrado pra
  todo mundo, inclusive quem não tem esse funcionário contratado. Agora ele só aparece quando existe
  um agente habilitado que usa aquela conexão.

### ✨ Acabamentos no dia a dia

- **O menu lateral volta a acender quando você passa o mouse.** O destaque de hover tinha parado de
  pintar nos itens não selecionados.
- **O ritual de nascimento aparece sozinho na tela.** No primeiro acesso de uma instalação nova, o
  menu lateral e os avisos de configuração montavam por cima do nascimento. Agora a tela do ritual
  fica limpa, e a faixa que pede as chaves some assim que você preenche.
- **A Zona de perigo ficou coerente com o resto do painel.** A caixinha de confirmação seguia o
  desenho do sistema e a copy passou a respeitar o nome que você deu pra sua empresa.
- **A Ficha de RH só oferece modelos que conversam.** Ao escolher o modelo de um agente, apareciam
  na lista modelos de gerar imagem e de voz, que não respondem em chat. Escolher um deles deixava o
  agente mudo. Agora a lista tem só modelos de conversa.

### 🔒 Privacidade dos seus arquivos e conversas

- **Cada conversa e cada arquivo anexado pertencem a quem os criou.** Reforçamos as regras de acesso
  para que arquivos e históricos de uma conversa fiquem restritos ao dono dela, inclusive nas
  instalações que têm equipe com vários acessos.

## [v1.11.0] — 2026-07-27

**A maior atualização desde a v1.10.0.** O seu gestor de tráfego ficou mais confiável e proativo, o
Segundo Cérebro ficou muito mais inteligente pra achar e organizar o que a sua empresa sabe, as
conversas e a memória do assistente ficaram bem mais confiáveis, e você ganhou uma área pra treinar e
testar o seu atendente antes de soltar pros clientes. É só atualizar, nada pra reconfigurar.

### 🎯 O seu gestor de tráfego ficou mais confiável e proativo

- **O Rui avisa quando a sua conta de anúncios tem um problema.** Se houver anúncios reprovados, conta
  bloqueada ou limite de gastos atingido, ele detecta na hora e te manda um alerta no Telegram, sem
  você precisar abrir o painel do Meta.
- **Ele busca os dados frescos do Meta sozinho, sem você pedir.** A cada ciclo, o Rui atualiza as
  métricas da conta por conta própria, então o relatório e o veredito dele estão sempre baseados nos
  números reais do momento.
- **Ele só sobe ou corta orçamento quando tem dados suficientes pra confiar.** Se a campanha ainda tem
  poucas conversões e nenhuma tendência clara, o Rui não arrisca (nem escala nem corta). Você recebe um
  aviso de que é cedo demais, em vez de uma decisão precipitada.
- **O relatório já abre mostrando a saúde da conta.** Antes de qualquer recomendação, você vê se há
  anúncios reprovados ou problemas na conta, e nenhuma ação de escalar passa enquanto a conta estiver
  com problema ativo.
- **Ele lança um criativo aprovado como anúncio no Meta, direto pelo chat.** A arte pronta no estúdio
  do Téo vira um anúncio pausado no Facebook e no Instagram, com um clique de aprovação seu. O link do
  anúncio aparece no card, e a copy pode ser gerada pela Lia na hora.
- **Você vê o conjunto completo antes de confirmar.** Objetivo, orçamento, público, posicionamento e
  otimização aparecem na tela de aprovação, então você sabe exatamente onde o anúncio vai entrar antes
  de dar o ok.
- **O Rui aponta quando algo não encaixa no que você está lançando.** Se o objetivo da campanha não
  combina com a otimização escolhida, ou o público está muito amplo pro tipo de anúncio, ele te avisa
  antes de publicar, como aviso, não como bloqueio.
- **Quando um conjunto precisa de ajuste de otimização, ele duplica e corrige em vez de mexer no que
  está rodando.** É a abordagem que gestores sênior usam pra não interromper o aprendizado de campanhas
  ativas. Você aprova, ele executa.

### 🧠 O Segundo Cérebro ficou muito mais inteligente

- **Nas conversas com os agentes, o Cérebro devolve a seção inteira, não uma linha solta.** Quando você
  pergunta algo que está guardado, o agente recebe o contexto completo com o raciocínio por trás do
  dado, então as respostas ficam mais precisas e fundamentadas.
- **Ele prioriza as memórias mais ricas e ignora as vazias.** O Cérebro passou a favorecer o conteúdo
  denso e a pular cabeçalhos que só apontam pra outra parte sem informação própria, então o agente se
  confunde menos e acerta mais.
- **Importar um documento Word ou PDF preserva a estrutura original.** O Cérebro divide o conteúdo
  pelos títulos reais do arquivo em vez de cortar pelo tamanho, guarda o caminho completo de cada
  trecho (por exemplo "Capítulo 3, Estratégia, Público") e navega pelo documento como se tivesse lido o
  índice.
- **Imagens e tabelas dentro dos documentos entram no Cérebro.** Ao importar um arquivo com figuras ou
  infográficos, o Cérebro lê o conteúdo visual, mostra uma miniatura de cada imagem encontrada (clique
  pra ampliar e conferir) e guarda como memória só as que você aprovar. Vale pra Word e pra PDF.
- **Trechos repetidos são consolidados antes de chegar pra você revisar.** Se dois pedaços importados
  dizem a mesma coisa com palavras diferentes, o Cérebro os funde numa memória única e mais completa,
  em vez de encher o banco de duplicatas.
- **A tela de revisão virou uma lista de triagem rápida.** Quando há muitos itens pra aprovar, no lugar
  de uma parede de cards você vê uma linha por item, seleciona vários de uma vez, aprova ou descarta o
  lote com um clique (ou pelo teclado), e uma barra mostra quanto falta.

### 💡 Ele lembra de verdade

- **Para de re-perguntar o que você já contou.** O assistente passou a confiar na própria memória em
  vez de pedir de novo um dado que você já deu. Isso vale inclusive nas empresas que já estavam
  rodando, sem precisar recomeçar nada.
- **A sua empresa tem uma Ficha que os agentes sempre leem.** No painel de configuração há um card
  "Ficha da Empresa" onde você vê e edita os fatos que os agentes carregam em todo atendimento (nome do
  negócio, produto principal, público). Editar ali é como dar uma instrução permanente: vale na hora,
  sem reiniciar nada.
- **Qualquer conversa que revele um fato novo já atualiza a Ficha sozinha.** Se você disser que mudou o
  nome do produto, a informação entra na Ficha automaticamente pra todos os agentes usarem dali em
  diante.
- **O que você diz por voz ou pelo Telegram também vira memória.** Antes só o que passava pela tela
  virava lembrança permanente. Agora um fato dito por voz ou no Telegram entra na memória sempre
  presente do assistente.
- **Sua equipe de agentes conversa entre si.** O que você alinhou com o Conselheiro fica disponível
  para os seus agentes internos (tráfego, copy, design, jurídico), então você não precisa repetir o
  contexto para cada um.
- **O rascunho de memória ficou legível e editável.** O card que aparece quando o assistente quer
  registrar algo passou a mostrar o conteúdo completo (não mais cortado), e o lápis agora abre edição
  de verdade antes de você aprovar.

### 💬 As conversas retomam de onde pararam

- **Volte quando quiser, ele continua o assunto.** Numa conversa longa, se você sai e volta depois, o
  assistente retoma de onde vocês estavam em vez de recomeçar do zero ou perguntar tudo de novo.
- **Nova conversa e histórico pesquisável no chat.** Um botão sempre visível abre uma conversa em
  branco com qualquer agente sem apagar o histórico antigo. A gaveta de histórico agrupa as conversas
  por data, mostra uma prévia do conteúdo e tem busca por texto, então você acha qualquer papo anterior
  em segundos.
- **Abrir a conversa de um agente sempre mostra o histórico certo.** Corrigimos um caso em que abrir a
  sala de um agente podia cair numa conversa em branco escondendo o histórico real. Trocar de agente e
  voltar também mantém a conversa que você estava.
- **Menos respostas cortadas no meio.** Turnos que usam várias ferramentas têm mais folga para
  concluir, então a resposta chega inteira com mais frequência.
- **Pela voz, ele lembra do que já foi falado na sessão.** Ao voltar a uma conversa por voz, o
  assistente já chega sabendo o que vocês vinham conversando.

### 🎓 Treine e teste o seu atendente antes de soltar

- **Edite a Sofia (ou o Davi) num rascunho antes de qualquer cliente ver.** O atendente de WhatsApp
  ganhou um modo de rascunho: você ajusta a personalidade, as regras e o que ele sabe, e nada muda para
  os clientes até você apertar "Publicar".
- **Tudo fica no /Treino, já preenchido com o que o atendente é hoje.** A tela abre com a personalidade
  real dele carregada, sem campos em branco confusos. Você edita por cima do que existe, não do zero.
- **Simule uma conversa de mentira antes de publicar.** O simulador troca mensagens com o atendente em
  modo de teste: as ações ficam marcadas como "[simulado]" e nenhum cliente, sistema ou plataforma é
  tocado. Você vê exatamente o que ele faria, com segurança.
- **Edite também a base de conhecimento no rascunho.** Fatos e playbooks aparecem na mesma tela. Você
  adiciona, desativa ou remove entradas, e o simulador já usa a base do rascunho, então dá pra testar
  um playbook novo antes de soltar.
- **Se alguém mexer no atendente enquanto você rascunhava, o sistema avisa.** Na hora de publicar, se a
  versão no ar mudou desde que você abriu o rascunho, aparece um comparativo campo a campo ("no ar
  agora" contra "sua versão") e você decide se publica mesmo assim.
- **Descarte ou reverta sem medo.** Além de publicar, há botões pra descartar o rascunho e pra reverter
  o atendente ao estado da última publicação, com o histórico de versões guardado.
- **A ficha de RH do /agentes voltou a ser ficha de RH.** Rename, férias e combinados ficam ali, com um
  atalho direto "Editar e testar no Treino" pra chegar na tela certa sem poluir a ficha.

### 🔄 Recomeço do zero, com controle e segurança

- **Botão "Recomeçar do zero" na Zona de perigo do painel.** Você escolhe exatamente o que apagar, em
  sete categorias independentes: operação (tarefas, campanhas, conversas), memória dos agentes, agentes
  contratados, Cérebro, acessos de equipe, credenciais e marca.
- **Prévia honesta antes de confirmar.** O painel mostra, com contagens reais, o que cada categoria
  apaga e o que fica, antes de você digitar o nome da empresa pra confirmar. Sem surpresa.
- **Sua licença e o seu acesso nunca são tocados.** Independente do que você marcar, a sua chave de
  licença, o seu login e o seu papel de dono ficam intactos, e o sistema bloqueia qualquer caminho que
  pudesse, por acidente, trancar você pra fora. As suas skills instaladas também ficam.
- **O Cérebro no GitHub não some de verdade.** Se você apagar o Cérebro no recomeço, as notas saem do
  índice por um commit normal no seu repositório. O histórico do Git fica preservado e dá pra recuperar
  pelo log.
- **Seus dados ficaram mais protegidos.** Esta versão passou por uma revisão de segurança a fundo das
  rotas e das operações mais sensíveis, fechando pontos frágeis antes que chegassem a qualquer usuário.

### 🔌 Canais e Segundo Cérebro mais robustos

- **Salvar pelo Telegram funciona.** Pedir "salva isso na memória" pelo Telegram agora registra de
  verdade.
- **Respostas longas no WhatsApp chegam inteiras.** Mensagens grandes passaram a ser enviadas em partes
  em vez de sumir por causa do limite do WhatsApp.
- **O Segundo Cérebro volta a sincronizar mesmo depois de você trocar o token do GitHub.** Se você
  regenerava o token, o sync podia parar em silêncio (a tela dizia "Conectado", mas nada era gravado).
  Agora ele se reconecta sozinho com o token atual.
- **Conectar suas ferramentas ficou mais fácil.** A tela de Integrações virou uma vitrine com busca
  instantânea e logos, mostrando os destaques e o catálogo completo de conexões num lugar só.
- **Você controla o teto de gasto de IA no painel.** O limite de custo passou a ser opt-in e ajustável
  na tela de Custo, então você decide quanto a empresa pode gastar, sem um teto fixo escondido.
- **O briefing do dia parou de inventar.** O resumo diário passou a se basear só nos fatos reais do
  momento, sem dizer "0 pendências" quando havia pendência nem enfeitar o que não aconteceu.

## [v1.10.0] — 2026-07-20

**A maior atualização até hoje.** O seu gestor de tráfego virou um profissional de verdade: ele
agora **age** nas campanhas (com a sua aprovação em 1 clique) e **pensa** como um especialista
sênior, ajustando a análise ao tipo da sua conta. Você pode **trazer a sua equipe** pra dentro, o
**atendente do WhatsApp** passou a resolver de verdade em vez de só responder, e **conectar as suas
ferramentas** ficou muito mais simples. É só atualizar, nada pra reconfigurar.

### 🎯 O seu gestor de tráfego agora AGE nas campanhas (com a sua aprovação)

- **Peça, e ele faz.** Diga ao Rui "pausa a campanha X", "reativa aquele conjunto" ou "sobe 20% o
  orçamento desse anúncio", pelo chat ou por voz, e ele monta a mudança pra você. Nasce uma
  aprovação de 1 clique em /aprovações: você confirma e **só então** a mudança acontece. Nada vai ao
  ar sem o seu ok, e ele nunca mais te manda "fazer na mão no Gerenciador".
- **Um plano inteiro de uma vez.** Peça "aplica o plano todo" e o Rui junta todas as ações
  recomendadas numa **única proposta** pra você aprovar de uma vez. Se algo falhar no meio, ele
  desfaz o que aplicou pra não deixar a conta pela metade.
- **Freios automáticos contra estragar a conta.** O Rui lembra de tudo que já propôs nos últimos 30
  dias: bloqueia proposta duplicada pra mesma campanha, não mexe no orçamento de uma campanha que
  ainda está aprendendo (pra não zerar o aprendizado do Meta) e respeita um teto que impede o
  orçamento de subir mais de 50% na mesma campanha em 7 dias. Ele te avisa antes de chegar no limite.
- **Ele aprende com o resultado.** Depois que você aprova um ajuste de orçamento, o Rui acompanha se
  a conta melhorou ou piorou. Na próxima vez que for propor algo parecido, ele te lembra: "da última
  vez que mexi aqui, o resultado caiu". O aviso só aparece quando o sinal é claro, nunca no ruído.
- **As aprovações ficaram claras.** Cada proposta mostra o nome real da campanha, os valores
  formatados e um rótulo em português, com um "ver detalhes" pra quem quiser inspecionar. Sem jargão.

### 🧠 E PENSA como um especialista sênior

- **Ele entende o tipo da sua conta.** Antes o Rui media tudo por ROAS (a métrica de quem vende
  produto). Agora ele reconhece se a sua conta é de **venda** ou de **captação de leads** e troca a
  régua sozinho: numa conta de leads ele passa a julgar por **CPL** (o custo de cada contato
  interessado), e "cair" vira o bom. Ele não fica mais mudo numa conta que não vende direto. Você
  pode confirmar o tipo da conta na Ficha, ou deixar ele detectar.
- **Conta nova? Ele compara com o seu nicho.** Sem histórico próprio, o Rui usa referências de
  mercado por nicho (advocacia, imóveis, estética, moda, infoproduto e outros) pra não julgar no
  escuro. E é humilde: respeita a fase de aprendizado do Meta e só opina sobre orçamento depois que
  a conta tem gasto suficiente, voltando pro histórico da sua conta assim que ele existe.
- **Ele lê a estrutura moderna do Meta.** O Rui reconhece se a campanha é Advantage+, CBO ou ABO e
  adapta o conselho. Ele não sugere "diversifique o criativo" numa campanha saudável onde concentrar
  é o certo, só quando a campanha estagnou e o criativo deu sinal de cansaço.
- **Todo diagnóstico vira um próximo teste.** Quando o criativo funciona mas a venda não fecha, o
  Rui não para no diagnóstico: ele te entrega o **próximo teste concreto** (testar um público novo
  se o anúncio já saturou, ou isolar a página, a oferta ou o formulário, conforme o tipo da conta).
  Sempre honesto: ele nunca afirma "o público saturou" sem o dado real na mão.
- **Ele te avisa sozinho.** No piloto automático, se a conta começar a sangrar (gasto sem retorno,
  queda brusca de conversão, custo por lead disparando), o Rui te manda um alerta no Telegram.
- **A leitura da conta virou um painel vivo.** O relatório do Rui em /trafego mostra a personalidade
  da sua conta (melhor e pior dia, se é estável ou volátil), o funil, os melhores e piores criativos
  e um plano de ação com os próximos passos.

### 👥 Traga a sua equipe pra dentro

- **Convide sócios e gestores, sem dividir senha.** Agora dá pra convidar gente pra usar a sua
  empresa de IA por um **link** que você gera (sem precisar de e-mail configurado). São dois papéis:
  **Dono** (acesso total) e **Membro** (usa o operacional: conversa, cockpits, aprovações, Cérebro,
  custo).
- **Você no controle.** Promova um Membro a Dono, rebaixe ou revogue o acesso a qualquer momento,
  com proteção pra a conta nunca ficar sem nenhum Dono. Configurações, integrações e a Loja ficam só
  pro Dono, então o Membro não vê alerta que não pode resolver.
- **Sem custo extra.** O acesso de equipe é gratuito.

### 💬 O atendente do WhatsApp agora resolve, não só responde

- **Ele executa de verdade.** A Sofia e o Davi passaram a **agir** nas ferramentas que você conectou
  (agenda, CRM, o que estiver ligado), não só mandar texto. Você escolhe, por ferramenta, se ele
  "pede aprovação" (abre um card em /aprovações antes de agir) ou "age sozinho". O padrão é sempre
  pedir aprovação.
- **Contexto claro em cada aprovação.** Toda ação mostra quem pediu: qual atendente, qual cliente e
  em qual canal.
- **Honesto quando não pode resolver.** Se o pedido é vago ou foge do que ele consegue, o atendente
  passa pra um humano em vez de fingir que resolveu. Consultar informação (ver agenda, checar
  estoque) nunca gera aprovação, só as ações de escrita.

### 🔌 Conecte as suas ferramentas com mais facilidade

- **A tela de Integrações virou um marketplace.** Centenas de aplicativos com logo, descrição e
  categoria em português, separados em conectados, recomendados e catálogo completo, com **busca
  instantânea**.
- **Mensagens de erro que ajudam.** Quando uma conexão (Gmail, Slack, Agenda) falha, agora aparece o
  motivo e o próximo passo, em vez de um "tente de novo" genérico. Reconectar por chave de API também
  ficou mais confiável.
- **Para quem integra sistemas (CRM, ERP, Hotmart).** A área de personalização agora recebe eventos
  dos seus sistemas por webhook, com uma fila que **não perde nada** (re-tenta sozinha) e um painel
  no /config mostrando os últimos eventos. Rotinas automáticas suas também rodam junto ao sistema, e
  qualquer ação disparada por elas passa pela mesma aprovação do resto.

### 🛡️ O seu Segundo Cérebro ficou à prova de falhas

- **Chat, voz e Cérebro nunca mais congelam juntos.** Antes, quando o Cérebro não conseguia
  sincronizar com o GitHub, tudo ficava "rodando": a conversa não salvava, a voz não conectava e a
  tela do Cérebro não abria. Agora uma falha de sincronização **não trava mais nada**, e a
  instância **se recupera sozinha** quando a conexão volta (sem precisar reiniciar).
- **GitHub fora do ar virou um não-evento.** As respostas do seu assistente vêm da memória guardada
  no banco de dados, então uma queda na sincronização **não atrapalha a leitura**: os agentes
  seguem com a memória inteira. O que você ensinar de novo fica numa fila segura e **sincroniza
  sozinho** quando o GitHub voltar, sem perder nada.
- **Honestidade quando falta dado.** No caso raro de não conseguir consultar a memória, o
  assistente **avisa e pede pra você confirmar**, em vez de inventar.
- **Aviso claro quando o sync para.** Se a sincronização com o GitHub parar, aparece uma **faixa de
  aviso em qualquer tela** ("reconecte o GitHub em Configurações") e você recebe **um aviso no
  Telegram**, uma vez, no momento que cai. Assim dá pra consertar rápido, sem descobrir tarde.
- **O briefing do dia parou de inventar.** As pendências no seu resumo diário agora são calculadas
  **na hora que você lê** (nunca de um cache velho), e o texto do assistente só usa fatos
  verificados, sem especular.

### 💰 Controle de custo sem surpresa

- **O teto fixo saiu do caminho.** O limite de gasto que vinha travado de fábrica foi removido:
  novas instalações sobem **sem teto**. Você define a estimativa mensal que quiser no /config (ou
  deixa vazio pra sem limite), e o valor mostrado é uma estimativa por uso.

### ✨ Vários acertos que somam

- **Fuso horário certo.** Saudação, briefing e radar de prazos agora respeitam o seu fuso (nada de
  "bom dia" às 21h com a data de amanhã).
- **Caixa de texto do chat.** Cresce sozinha em mensagens longas e volta ao normal ao enviar.
- **Tela de agentes no modo técnico.** A coluna "Responde a" parou de sumir em telas com escala do
  Windows.
- **Reforço de segurança e estabilidade.** Endurecemos os controles de acesso internos, corrigimos
  exposições menores e melhoramos a proteção do banco de dados.

## [v1.9.0] — 2026-07-16

**A conversa que te dá as boas-vindas.** Agora o seu assistente **conduz a primeira conversa** —
ele se apresenta, mostra o que a sua empresa de IA sabe fazer e **te conhece conversando**, sem te
encher de formulário. Dá pra **começar sem nem ter empresa** (explora primeiro, cadastra depois) e
fazer tudo isso **por voz**. Além disso, **ensinar o Cérebro com seus arquivos ficou muito mais
confiável**, o **atendente do WhatsApp ficou mais esperto e honesto**, e o Cérebro passou a
**cruzar informação espalhada em documentos diferentes**. É só atualizar — nada pra reconfigurar.

### 👋 O assistente conduz a sua primeira conversa

- **Uma boas-vindas de verdade, não um formulário.** Na primeira vez que você fala com o
  assistente, ele **abre explicando o que dá pra fazer** e vai te conhecendo numa conversa natural
  — entende o seu momento (já tem empresa? está começando? é agência/revendedor? só espiando?) e
  **só aprofunda no que faz sentido pra você**. Nada de interrogatório: ele pergunta uma coisa de
  cada vez, no tom certo, e sabe a hora de parar.
- **Dá pra entrar sem ter empresa ainda.** Se você ainda não montou um negócio, agora dá pra
  **nascer e explorar** o produto à vontade — sem precisar inventar uma empresa fake só pra passar
  da porta. Quando (e se) você tiver, é só dizer **"tenho uma empresa agora"** e o assistente
  **transforma o que você já construiu** na sua empresa de verdade, sem recomeçar do zero.
- **Funciona por voz também.** Essa conversa guiada acontece igual **falando** (voz em tempo real):
  você responde no microfone e o assistente **avança sozinho** — e o progresso é **o mesmo** se
  você começar digitando e continuar por voz (ou o contrário).

### 🧠 Ensinar o Cérebro com seus arquivos ficou muito mais confiável

- **Você revisa antes de entrar.** Ao importar um documento, os fatos extraídos agora passam por
  uma **tela de revisão** no `/cerebro`: dá pra **editar, aprovar ou descartar** cada um antes que
  ele vire memória oficial. Nada entra sem o seu ok.
- **Arquivo grande não trava mais.** PDFs longos e escaneados são processados **página por página**,
  aos poucos, sem estourar o tempo — e se algo travar no meio, **retoma de onde parou** sozinho.
  Agora também dá pra **colar texto direto** e acompanhar o **progresso ao vivo** da importação.
- **Extração mais fiel.** Word vira texto estruturado, PDF é lido página a página e planilha
  respeita cada aba — menos informação perdida no caminho, e o Destilador **não inventa** o que
  não estava no material.
- **Arquivamento mais esperto.** O Curador entende melhor **onde** cada fato pertence (a organização
  do seu Cérebro) e **de onde ele veio**, deixando a memória mais limpa e rastreável.

### 💬 O atendente do WhatsApp ficou mais esperto — e mais honesto

- **Ele não promete o que não fez.** O atendente (Sofia/Davi) ganhou uma **trava contra "inventar
  ação"**: ele não diz "pronto, remarquei ✅" se não tiver de fato como executar aquilo — quando
  não pode resolver, **passa pra um humano** em vez de fingir.
- **Ele acha a resposta certa mesmo espalhada.** A busca na base de respostas do atendimento passou
  a **cruzar informações ligadas** — então uma pergunta cuja resposta depende de dois pedaços
  diferentes da base é respondida com o quadro completo.
- **Cuida dos dados sensíveis do cliente.** Telefone, CPF e PIX que aparecem na conversa são
  **tratados com cuidado** antes de virar ficha, e assuntos delicados **acionam um aviso pra
  escalar** pro humano.

### 🔎 O Cérebro conecta fatos de documentos diferentes

- **Ele "liga os pontos" entre anotações.** Quando a resposta certa exige juntar um dado de um
  documento com outro dado de outro, o Cérebro agora **encontra essa ponte** sozinho — cruzando as
  **entidades** que aparecem nos dois (um nome de cliente, um número de contrato). Numa bateria de
  perguntas que exigem essa costura entre documentos, o acerto **saltou de cerca de 67% para cerca
  de 95%**, sem piorar em nada o resto.

### 🔧 Detalhes que somam

- **Atalho pros Tutoriais.** Um novo item **"Tutoriais"** no rodapé do menu leva direto ao guia —
  ajuda à mão quando bate a dúvida.

## [v1.8.3] — 2026-07-15

**Uma atualização de acabamento.** Deixamos o painel de **Atualizações** mais claro e honesto,
destravamos o deploy em servidores **ARM** e passamos uma leva de reforços internos de
estabilidade. Nada pra reconfigurar — é só atualizar.

### 🔄 O card de Atualizações agora fala a verdade

- **Repositório e Deploy, separados e claros.** No `/config → Licença → Atualizações`, "onde
  seu código é publicado" (o seu repositório no GitHub) e "como o deploy é disparado" (o webhook
  do EasyPanel) viraram dois campos distintos, cada um com o seu próprio **trocar**. Acabou a
  confusão de misturar uma coisa com a outra.
- **Seu webhook de deploy fica protegido na tela.** Depois de salvo, ele aparece **mascarado** —
  some da vista de quem só está de passagem pela sua máquina.
- **Fim do status que enganava.** Havia um indicador de "Auto Deploy" que dava a entender que o
  EasyPanel republicava sozinho a cada envio — o que **nunca foi verdade**. Tiramos essa ficção:
  o botão agora diz exatamente o que faz ("Atualizar", com o deploy disparado pelo webhook), sem
  promessa falsa.

### 🐳 O deploy parou de quebrar em servidores ARM

- **Sobe em Oracle Ampere, Hetzner e afins.** O build da imagem quebrava em servidores de
  arquitetura **ARM** (cada vez mais comuns e baratos) por um detalhe do empacotamento de um
  componente nativo. Corrigido: a imagem agora monta igual em **ARM e x64**, sem susto na hora
  de subir.

### 🔧 Nos bastidores

- **Mais estabilidade na sincronização de licença e nas atualizações.** Uma rodada de reforços
  internos deixou a conversa da sua instância com o servidor mais **tolerante a falhas de rede e
  a reconexões** — menos ruído e menos "pisca-pisca" no painel de licença. Você não precisa fazer
  nada; funciona sozinho.
- **Faxina de código e de telemetria.** Limpeza interna que não muda nada no seu dia a dia — só
  deixa a base mais enxuta e leve pras próximas novidades.

## [v1.8.1] — 2026-07-14

### 🧠 O Cérebro ficou muito mais preciso pra achar a resposta certa

- **A busca do Segundo Cérebro parou de se perder.** Uma nota curta e genérica (tipo um "fale
  com a gente") vinha, sem querer, "roubando o topo" de perguntas específicas — e quanto mais
  ela aparecia, mais o sistema a empurrava pra cima (um efeito bola-de-neve). Corrigimos a forma
  como a busca combina **significado + palavras exatas**, e agora ela **crava a nota certa** com
  muito mais frequência: numa bateria de 47 perguntas difíceis (gírias, siglas, números de
  contrato, paráfrases), acertar a resposta em **1º lugar** saltou de **47% para 94%**, e "está
  entre as 3 primeiras" foi para **100%**. Você pergunta, ele acha — e você não mexe em nada, é
  só atualizar.

## [v1.8.0] — 2026-07-14

**Outra atualização enorme.** Sua empresa de IA ganhou um **canal de WhatsApp que usa o número
que você já tem**, uma **Sala onde você treina o atendente só conversando**, a capacidade de
**ensinar o Cérebro jogando arquivos nele**, um **Telegram que finalmente conversa tão bem
quanto a tela** e uma **zona 100% sua** que sobrevive a todo update. É só atualizar — nada pra
reconfigurar.

### 📲 WhatsApp com o número que você já usa (canal não-oficial)

- **Conecte por QR Code, sem depender da API oficial da Meta.** Além do WhatsApp Cloud
  (oficial), agora dá pra plugar um número comum através de um serviço gerenciado (você traz o
  seu — BYO): escaneia o QR na tela, como no WhatsApp Web, e o atendente já responde por ele.
  Ideal pra quem não quer (ou não pode) esperar a aprovação da API oficial.
- **Nasce em modo teste, sem risco.** No próprio formulário de conexão você liga o **modo
  teste**: o canal só responde os números que você liberar. Dá pra validar a Sofia/o Davi à
  vontade, sem nenhuma chance de falar com um cliente de verdade antes da hora.
- **Se o canal cair, você fica sabendo na hora.** Sessão expirou, número desconectou? Chega um
  **aviso no seu Telegram** e um **banner no Command Center** — nada de descobrir que o
  atendimento ficou mudo só quando o cliente reclama.

### 🎓 Seu atendente aprende conversando — e para de inventar (Sala de Treino)

- Na **Sala de Treino**, você corrige a Sofia/o Davi em linguagem normal e cada correção vai
  pro lugar certo sozinha: um **jeito de responder numa situação** ("quando o cliente reclama
  de atraso, faça X") vira um **playbook** que o atendente consulta automaticamente na hora
  certa; um **fato** (preço, horário) entra na base; e uma **regra inviolável** vira uma das
  poucas "regras de ouro" dele. O atendente agora **só afirma o que a base sustenta** — se não
  tiver a resposta, ele **passa pra um humano em vez de chutar**. E o "jeito" dele **não incha
  com o tempo**: correções parecidas se **fundem** em vez de empilhar. Toda correção continua
  virando um **teste** que garante que ele não regride.

### 🧠 Ensine o Cérebro jogando seus arquivos nele

- **Arraste o arquivo, o Cérebro aprende.** Word (DOCX), PDF, planilha (CSV/Excel), imagem e
  até **PDF escaneado ou foto** entram pelo `/cerebro`: um **Destilador** lê o material cru e
  extrai os **fatos**, e o **Curador** arquiva sozinho no lugar certo. Documento vira memória
  da empresa sem você ficar copiando e colando.
- **Ele lê imagem e papel escaneado.** Foto e PDF sem texto (digitalizado) passam por
  transcrição por visão — o que estava preso na imagem vira conhecimento pesquisável.
- **Contexto primeiro.** Antes de importar, você escreve uma nota curta dizendo o que é aquele
  material — e ela guia o Destilador a entender o que realmente importa ali.
- **Errou? Desfaz num clique.** Um botão **reverte a importação inteira** (o Cérebro é
  versionado, então a reversão é limpa — e honesta: avisa se houver conflito).

### 💬 O Telegram do dono agora conversa igual à web

- **Mesmo cérebro nas duas telas.** O que você fala com o assistente pelo **Telegram** passou a
  ter as mesmas capacidades da conversa na web: copy pronta pra colar, imagem, fontes citadas e
  memória. Antes o Telegram "derrapava" e perdia recurso no meio do caminho.
- **A equipe te devolve o resultado na hora.** Quando você delega uma tarefa e um funcionário
  termina, o assistente **te avisa ao vivo pelo Telegram já com o entregável em mãos** —
  relatório de tráfego, contrato, copy ou anúncio — sem você ter que ir atrás.

### 🎨 A empresa é sua — a pasta `custom/` e a marca também

- **Sua zona de customização: a pasta `custom/`.** Tudo dentro dela é seu e **sobrevive ao
  update 1-clique**. São 4 pontos de extensão: **tools de agente** (com aprovação humana
  opcional em `/aprovacoes`), **telas próprias** em `/c/<slug>`, **endpoints** em
  `/api/c/<slug>` (já autenticados) e **migrations SQL suas** (faixa 9000+, rodam sozinhas
  no boot). Guias dentro da pasta: `custom/README.md` + `custom/CLAUDE.md`.
- **A marca agora é sua — sem tocar código.** Novo card **Marca** no `/config`: nome do app,
  nome do assistente, logo e cor de acento viram config e valem na interface inteira.
- **O aviso de "você editou o código" ficou justo:** mudanças dentro de `custom/` não
  disparam mais o alerta de divergência do update — só edições no core contam.

### 🔧 Correções e ajustes

- **Composio: conexão OAuth atualizada.** O provedor aposentou o método antigo de iniciar a
  conexão gerenciada; passamos a usar o caminho novo (`connectedAccounts.link`), então plugar
  ferramentas que pedem login volta a funcionar sem tropeço.

## [v1.7.0] — 2026-07-13

**A maior atualização do Awave até hoje.** Sua empresa de IA ficou mais **econômica**, mais
**inteligente**, mais **confiável** e mais **bonita** — e você não precisa mexer em nada: é só
atualizar.

### 💰 Você gasta bem menos com a OpenAI — sem perder qualidade

- **A maior parte da sua conta estava escondida — e agora foi domada.** Uma auditoria completa
  rastreou cada token e descobriu que o maior gasto vinha do **trabalho de bastidor** (a memória
  "refletindo" cada conversa, resumos, curadoria) rodando no modelo mais caro e **invisível no
  painel de custo**. Arrumamos: esse trabalho agora roda num **modelo econômico** (`CHEAP_MODEL`,
  com troca automática pro principal se sua conta não tiver ele), **só reprocessa o que mudou**
  desde a última vez, e finalmente **aparece no `/custo`**. Fim do "gasto que ninguém entende".
- **A voz, o recurso mais caro, agora se cuida sozinha.** Ela **só liga quando você vai falar** e
  **desliga sozinha** quando você sai da tela ou troca de aba. Nada de microfone caro aberto à toa.
- **Um teto de gasto opcional pra dormir tranquilo.** Defina um limite mensal (`budget_usd` no
  `/config`) e o Motor **segura o chat e o trabalho de fundo** ao se aproximar dele — sem nunca
  travar sua empresa por engano.

> A inteligência do assistente e dos funcionários continua **exatamente a mesma**. O que mudou
> foi só a conta.

### 🧠 Um Segundo Cérebro em que dá pra confiar

- **Ele lembra de tudo — e agora TODO funcionário consulta.** Antes, alguns funcionários (os de
  bastidor e os que atendem por voz) respondiam "no escuro", sem acesso à memória da empresa.
  Agora **todos bebem da mesma fonte**: o que você ensina uma vez vale pra empresa inteira.
- **Ele parou de inventar.** Quando a resposta depende de um dado que a memória não tem, o
  assistente **diz que não sabe** em vez de chutar — e **mostra a fonte** quando tem. Menos
  achismo, mais confiança.
- **Ele entende português de verdade.** A busca passou a tratar "contrato", "contratos" e
  "contratação" como a mesma ideia, **junta trechos vizinhos** pra não cortar a informação no
  meio e **segue as ligações entre anotações** pra trazer o contexto completo.
- **Ele se organiza sozinho, nos bastidores.** Um processo automático reconcilia o que ficou pra
  trás, **tenta de novo o que falhou** e nunca perde uma anotação por conflito.
- **O conhecimento chega ao atendimento.** O assistente agora pode **sugerir (com a sua
  aprovação)** que uma informação do Cérebro entre na base de respostas do atendimento por
  WhatsApp — a empresa aprende num lugar e responde melhor em todos.

### ⚡ Superpoderes na hora certa

- **O assistente pega a ferramenta certa na hora — de um catálogo de 500+.** Seus funcionários
  podem plugar mais de 500 ferramentas (planilhas, e-mail, agenda, CRM…). Antes, o assistente
  carregava só um punhado fixo por mensagem — caro, lento e limitado a poucas por vez. Agora ele
  **busca e traz exatamente as que o pedido precisa**. Acabou o limite: **nenhuma ferramenta fica
  de fora**, e o chat responde mais leve.
- **Conectar ferramentas ficou à prova de tropeço.** A **chave do Composio salva** de primeira,
  integrações que "morriam" **voltaram a funcionar**, e ao trocar uma conexão o funcionário **se
  atualiza na hora**. Você também pode **conectar uma ferramenta a qualquer agente**, mesmo os sem
  painel próprio.
- **Segurança reforçada:** qualquer ação que **modifica** algo lá fora (enviar, apagar, publicar)
  **sempre pede a sua aprovação** — nunca dispara sozinha por engano.

### ✨ Mais bonito e mais claro

- **As respostas do chat agora saem formatadas.** Negrito, listas e títulos aparecem lindos na
  conversa, em vez de vazar os símbolos crus (`**`, `##`). Vale pro assistente e pra todos os
  espaços dos especialistas.

### 🔄 Você no controle das atualizações

- **Troque o repositório das atualizações quando quiser.** O GitHub que recebe as atualizações do
  seu Motor podia ser escolhido só no primeiro setup. Agora, no `/config → Licença`, é só clicar
  em **"trocar"** e apontar pra outro repositório a qualquer momento.
- **O card de Atualizações agora fala a verdade.** Se o deploy não foi acionado após publicar, ele
  **avisa o motivo** e o que fazer — em vez de ficar eternamente em "Aguardando…". E sem uma
  licença ativa, mostra um estado **honesto e neutro** em vez de um "atualizado" enganoso.

### 🔧 Detalhes que somam

- O menu lateral agora diz **"Configuração"** por extenso; o **briefing diário parou de repetir o
  valor gasto** (custo mora só no `/config`); e o atalho de conexão do Composio aponta pro
  **painel novo** deles.

## [v1.6.4] — 2026-07-11

- **Ligar o deploy automático ficou possível a qualquer hora**: o campo pra colar o webhook do
  EasyPanel (o "Gatilho de Implantação", que faz o app reconstruir sozinho após atualizar) agora
  aparece no `/config → Licença` **mesmo quando você já está atualizado** — antes ele só existia
  enquanto havia uma atualização pendente, então quem estava em dia não achava onde configurar.
  Agora é um setup fixo, disponível quando quiser.

## [v1.6.3] — 2026-07-11

- **Segundo Cérebro volta a funcionar no self-host (corrige `EACCES /data/brain`)**: em
  instâncias novas, salvar memória / registrar conhecimento / nascer a empresa falhava com
  "Não consegui registrar agora" e o log mostrava `EACCES: permission denied ... '/data/brain'`.
  Causa: o container roda o app como usuário `node` (não-root, por segurança), mas o volume do
  cérebro subia como `root` — e o código ainda tentava **apagar a própria pasta** do clone (o
  que exige permissão na pasta-mãe). Agora (a) o container **conserta a dona do volume sozinho
  no boot** (sobe como root só pra isso e larga o privilégio na hora — o app segue não-root) e
  (b) o clone **limpa só o conteúdo**, nunca a pasta montada. O **volume virou opcional**: sem
  ele o cérebro é re-clonado a cada deploy (barato); com ele, persiste — e **você não precisa
  mexer em permissão** (`docs/DEPLOY.md §4`).
- **Chat: o rodapé "Licenciado para…" não cobre mais a caixa de mensagem**: na tela de
  conversa, o carimbo de licença no rodapé ficava por cima do campo de escrever e da dica
  "Segure Espaço para falar · Enter para enviar". Ajuste de layout — o chat agora respeita a
  faixa do rodapé.

## [v1.6.2] — 2026-07-10

- **Licença de uso atualizada (v2.0)**: a licença do Awave Agents foi renovada para deixar
  **explícito que você pode usar comercialmente** — inclusive operar como SaaS e atender os
  seus próprios clientes. A única trava continua sendo **revender ou redistribuir o produto em
  si** (o código, um template ou um curso de instalação) para terceiros. A nova versão concede
  **mais direitos** que a anterior e passa a valer também para quem já comprou. O texto completo
  está no arquivo `LICENSE`.

## [v1.6.1] — 2026-07-10

- **Atualização automática mais confiável**: o campo pra ligar o "deploy automático" — o
  webhook do EasyPanel que faz o app reconstruir sozinho depois de você atualizar — agora
  fica **sempre acessível** no `/config → Licença`, mesmo depois de um deploy manual. Antes,
  um deploy feito na mão no EasyPanel escondia esse campo pra sempre; aí a próxima atualização
  ficava presa em "Aguardando o EasyPanel reconstruir…" **sem ter onde colar o webhook**.
  Também acertamos o passo-a-passo pra apontar o lugar certo no EasyPanel (aba **Implantações →
  Gatilho de Implantação**).

## [v1.6.0] — 2026-07-10

- **O menu lateral só mostra o que você tem**: os espaços dos especialistas (Copy, Design,
  Tráfego, Jurídico e o Inbox de atendimento) agora aparecem no menu **só depois** que você
  contrata o funcionário — ou, no caso do Inbox, quando conecta um canal de WhatsApp. Assim
  que você contrata na Loja, o atalho surge na hora, sem recarregar a página; se dispensa,
  ele some. E abrir o espaço de um especialista que você ainda não contratou (por link direto
  ou pela busca) não dá mais erro — mostra um convite calmo pra contratar na Loja.
- **Tempo real de verdade**: o feed "Ao vivo" do Command Center, o Inbox de atendimento e o
  menu lateral agora atualizam **na hora**, sem recarregar a página. (Correção de uma falha
  antiga em que a conexão de tempo real subia sem se autenticar e o banco, por segurança,
  não entregava as novidades — então tudo só aparecia ao recarregar.)
- **Central de Integrações (`/integracoes`)**: uma vitrine pra descobrir, buscar e conectar
  tudo que seus funcionários podem plugar — num lugar só. Veja o que já está conectado e
  **quais funcionários usam cada integração**, busque por nome ("planilha", "e-mail") e, se não
  achar no time curado, **mergulhe no catálogo completo** do Composio. Conecte, reconecte ou
  desconecte ali mesmo. O `/config` segue com a conexão rápida — agora com atalho pra cá.
- **Ajuste seu agente conversando (revisão)**: no botão "Ajustar agente" da estação de
  trabalho, você conversa com o RH pra mudar o que precisar no funcionário (missão,
  ferramentas, limites) — ele mostra o **antes e o depois** e, com um clique em "Aplicar
  mudanças", o agente é regenerado sem perder o que já aprendeu com você. E, direto na
  estação e na Ficha de RH, agora dá pra **ligar/desligar uma integração**, **ensinar** uma
  regra nova ao agente e **renomear** o funcionário — tudo sem programar.
- **Contratação sob medida na Loja**: descreva o que você precisa numa conversa com
  o RH da sua empresa — ele entrevista, conecta suas ferramentas (Composio) ali
  mesmo na conversa, mostra o candidato pronto (o que faz sozinho × o que pede sua
  aprovação) e, com um clique, o agente nasce com estação de trabalho própria.
  Funciona mesmo sem licença e sem Composio configurado (as conexões ficam
  pendentes e são cobradas depois). A Loja também ganhou o atalho "Abrir estação
  de trabalho" nos cargos instalados.
- **Estação de trabalho universal (`/agente/<id>`)**: todo agente sem cockpit próprio
  ganha uma casa viva — chat direto com ele, fila de tarefas, entregas, aprovações
  pendentes, integrações conectadas e o que ele já aprendeu com você. O Command Center,
  o organograma e a página de agentes agora levam direto pra lá (agentes com cockpit
  dedicado, como o Rui, continuam indo pro cockpit deles).

## [v1.4.6] — 2026-07-08

- **Voz do assistente masculina por padrão**: o Nathan agora fala com uma voz
  masculina (`cedar`) tanto no "Conheça o Nathan" do onboarding quanto no `/conversa`.
  Antes, em instalações novas, a saudação do ritual saía com uma voz feminina porque
  usava um caminho de voz separado — agora as duas telas usam a mesma fonte de voz.
- **Botão "Entrar no Command Center" confiável**: no fim do onboarding, o botão só
  libera quando a empresa termina de nascer. Acabou o clique que "não fazia nada" (e
  o retorno ao começo do ritual pra preencher tudo de novo) quando se clicava rápido
  demais — enquanto finaliza, aparece um discreto "Finalizando o nascimento…".
- **Loja libera na hora ao conectar a licença**: ao colar a licença no `/config`, a
  `/loja` passa a mostrar os cargos imediatamente, em vez de esperar até ~5 minutos
  pelo ciclo interno de atualização do catálogo.

## [v1.4.5] — 2026-07-08

- **Jornada "ritual primeiro" no primeiro acesso**: ao criar o operador, você cai
  direto no ritual de boas-vindas (não mais numa tela técnica de chaves). A jornada
  virou uma cena só — **nome da empresa → conectar as 3 chaves → conhecer o assistente
  (voz) → nascimento** — em vez de quicar entre o `/config` e o `/onboarding`. O passo
  das chaves reusa o mesmo painel do `/config` (criar/escolher repositório, testar
  chave, tudo guiado). O `/config` virou console de retorno.
- **Fim da sidebar duplicada no `/config`**: a rail (menu lateral) agora tem um dono
  único (o quadro do app), então ela nunca mais aparece duplicada ao entrar na
  configuração — nem no carregamento.
- **Aviso de chaves faltando**: se, depois de tudo configurado, alguma chave essencial
  sumir, uma faixa discreta avisa e leva direto pra configuração (em vez de a tela
  quebrar sem explicação).

## [v1.4.4] — 2026-07-08

- **Proteção contra a Direct connection do Supabase**: se você colar a *Direct
  connection* (`db.<ref>.supabase.co`) no `SUPABASE_DB_URL`, o Motor agora avisa
  claro pra usar a *Session pooler* — em vez de estourar um `ENOTFOUND` críptico
  no boot (a Direct é só IPv6 e não resolve no EasyPanel/maioria dos hosts).
- **`.env.example` em PT-BR e mais enxuto**, com a `SUPABASE_DB_URL` documentada
  (as migrations automáticas dependem dela) + o passo-a-passo da Session pooler.
- **Guia da conexão do banco no `/config`** (card Atualizações): numeração dos
  passos corrigida e aviso reforçado contra a Direct connection / Transaction pooler.

## [v1.4.3] — 2026-07-08

- **Ajustes no guia da conexão do banco** (`/config` → Atualizações, introduzido na
  v1.4.2): os passos do "Como configurar" voltaram a exibir a numeração (1, 2, 3) e
  o aviso passou a ser anunciado por leitores de tela quando aparece.

## [v1.4.2] — 2026-07-08

- **Migração à prova de leigo (`SUPABASE_DB_URL`)**: se você colar o **Transaction
  pooler** (porta 6543) do Supabase por engano, o Motor troca sozinho pro **Session
  pooler** (5432) no boot — em vez de recusar e o container não subir. Qualquer outro
  `:6543` (Postgres não-Supabase) segue recusado, sem suposição arriscada.
- **Guia self-serve da conexão do banco** no `/config` → Atualizações: o aviso do
  `SUPABASE_DB_URL` virou um **"Como configurar"** com o passo-a-passo do Supabase
  (aba Session pooler / 5432), a connection string **com o ref do seu projeto já
  preenchido** e botão de copiar — no lugar do antigo "ver DEPLOY.md".

## [v1.4.1] — 2026-07-08

- **`/loja` honesta quando não há cargos**: com a licença revogada, expirada ou ausente
  (ou o catálogo indisponível), a Loja mostra um banner honesto por-estado no lugar de uma
  página vazia — em vez de silenciar. A vitrine só aparece com a licença ativa (ou offline
  dentro da graça de verificação).
- **Fix — vazamento da Loja pós-revogamento**: antes, a Loja só sumia quando o cache de
  cargos esvaziava, então um comprador revogado via a vitrine funcionando por até ~1h (o
  cache de catálogo atrasa o estado da licença). Agora o banner honesto aparece de imediato
  nos estados sem direito ao firehose, mesmo com cargos ainda em cache.

## [v1.4.0] — 2026-07-07

- **Command Center v3 "Ponte de Comando"**: redesign da home one-screen — WaveLine viva,
  cards-porta que abrem o cockpit de cada C-level, feed "estrela" de atividade e fila
  unificada de aprovações/tarefas.
- **/agentes "O Palco com elenco"**: o modo leigo virou cena viva — time ativo em arco,
  herói centrado no facho, ficha em dossiê e chip de férias; o modo técnico segue intacto.
- **Entregas inline no `/conversa`**: os artefatos dos cockpits (relatório, peça, anúncio,
  contrato, imagem) chegam como cards inline no próprio thread + lightbox central, com
  markdown formatado — no lugar do antigo chip flutuante e do painel lateral.
- **`/config` navegável**: console por sidebar de 5 seções, unificando o primeiro setup e o
  retorno (o wizard por etapas foi aposentado).
- **Endurecimento de segurança**: RLS ligada nas 42 tabelas (o Cérebro não vaza entre
  operadores), identidade de operador explícita — "authenticated" deixou de ser o operador
  (bind + `is_operator`) —, `registrarDiretriz` passou a exigir aprovação (HITL) e a
  exposição de RPCs sensíveis foi fechada (migrations 0043–0045).
- **Atualização 1-clique (auto-update)**: o Motor descobre uma versão nova pelo heartbeat
  (o Hub responde `latest_version` no `/validate`), mostra o card "vX.Y.Z disponível" no
  `/config` → Licença, e com 1 clique baixa o `.zip` carimbado do Hub
  (`POST /api/hub/download-instance`, autenticado por licença), extrai e publica no repo do
  próprio comprador — o EasyPanel reconstrói no push. **Migrations agora rodam sozinhas no
  boot** do container (`migrate.mjs` + env `SUPABASE_DB_URL`; idempotente, com baseline
  `awave_migrations` e advisory lock — falha ⇒ o container novo não sobe e o EasyPanel mantém
  o antigo servindo). Sem `SUPABASE_DB_URL` o fluxo manual de `docs/DEPLOY.md §7` segue igual.
  Regra inviolável preservada: nada disso gateia o motor — update é firehose (só com licença).
  Hardening da revisão (bloqueadores, timeouts do card e guards) aplicado; requisitos de deploy
  (Auto Deploy obrigatório, ordem env×baseline `0046`, token em 2 repos, fronteira de confiança
  do Hub) documentados em `docs/DEPLOY.md §7` + `docs/ARQUITETURA-OPEN-CORE.md §6.1`.
- **Assistente proativo + Telegram do dono**: canal do bot oficial (long-polling), briefing
  push, lembretes com âncora de dia, aprovações com botões inline; fotos e áudios do dono
  entram com visão/transcrição; imagens geradas chegam no bolso via sendPhoto.
- **Estúdio da Lia — loop de performance**: peça "no ar" vinculada ao anúncio real do Meta,
  leitura de performance da peça e revisão orientada por dados (loop com o Rui).
- **Radar de prazos do Alan** (`/juridico`): prazos extraídos dos contratos, com lembretes.
- **Briefing do Téo** (`/design`): direção de arte briefing-first no estúdio.
- **Perf hardening (Tiers 1–4)**: índices no banco, loaders paralelos, prompt-cache
  preservado (prefixo estável entre canais), custo honesto com `cached_tokens` ponta a
  ponta, skeletons por-rota, gate de recall pra mensagens fáticas.
- **Fix de deploy**: `telegram-poll.mjs` agora entra na imagem Docker (antes o canal
  Telegram só funcionava fora do container).
- **Docs**: `docs/DEPLOY.md` reescrito (todas as migrations + como aplicar, atualização,
  backup, réplica única), `README.md` na raiz, este CHANGELOG e o mapa de arquitetura do
  Motor (`docs/ARQUITETURA-MOTOR.md`).

## [v1.3.0] — 2026-07-03

- **4 cockpits novos**: `/copy` (estúdio da Lia — peças com variações, campanhas, swipes,
  handoffs João→Lia e Rui→Lia), `/design` (estúdio do Téo — anúncios reais com
  `gpt-image-2`, headline/CTA na imagem), `/juridico` (escritório do Alan — gerar, analisar
  e revisar contratos, upload de PDF), `/inbox` (atendimento WhatsApp Cloud API — Sofia &
  Davi: modos rascunho→autônomo, base de conhecimento, ficha do cliente, escalação).
- **/organograma "empresa viva"**: org chart top-down com avatar-onda e conectores com pulso.
- **/agentes virou Ficha de RH**: linguagem 100% leiga (modo técnico opcional no `/config`).
- **/loja redesign**: recepção cinematográfica com o time em formação.
- Transcrição de áudio inbound (`gpt-4o-transcribe`) com custo no painel.

## [v1.2.0] — 2026-07-02

- **Loja "Empresa Completa"**: 12 cargos em 4 departamentos (+9: Vendas, Atendimento,
  Financeiro, Social, Dados, RH, Processos, Jurídico, SEO), vitrine agrupada por
  departamento e 8 SKILL.md starter de ofício. Catálogo 100% servido pelo Hub — cargo novo
  não exige redeploy do Motor.
- **/trafego — as 3 camadas do Estrategista + painel acionável**: histórico com baseline,
  drill hierárquico (campanha → conjunto → anúncio), memória da conta (Ficha), motor de
  sinais com veredito, sparklines e Plano de ação com fadiga real.

## [v1.1.1] — 2026-06-30

- `LICENSE` fair-source final (Licença de Uso Sustentável).
- Fix: presets de período fora do enum do Meta viram `time_range` explícito.

## [v1.1.0] — 2026-06-30

- **Painel de Tráfego do Rui** (`/trafego`): leitura READ-ONLY do Meta Ads, chip de saúde
  dirigido pela leitura real (não só conta ativa), relatório determinístico, conexão
  por-toolkit com reconectar/desconectar no `/config`.

## [v1.0.0] — 2026-06-30

- Primeira release completa do Motor self-host: Segundo Cérebro (Git + Supabase, Curador
  com aprovações), chat + voz Realtime, ações externas (Composio) com HITL, agentes-como-
  config, Maestro/organograma/contratação, memória de longo prazo (4 tiers), skills,
  onboarding ritual, painel de custo — mais a fundação open-core: licença com lease
  "1 ativação viva", catálogo da Loja servido pelo Hub e entrega `.zip` carimbada
  por-comprador.
