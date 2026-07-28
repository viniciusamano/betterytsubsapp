# Histórico do projeto — Meus Canais

Registro dos principais marcos e aprendizados até aqui, pra consultar quando voltar depois de um tempo parado. Detalhes de arquitetura, modelo de dados e roadmap ficam nos outros arquivos de `docs/` — este é só a linha do tempo e o "porquê" de cada decisão/problema.

## Linha do tempo

**24–25 jul 2026 — Protótipo e fundação**
- Protótipo interativo em HTML puro (`prototype/channel-catalog.html`): tabela de canais, propriedades customizáveis (tipo Notion/Airtable), filtros, export CSV, perfil de canal.
- Documentação do plano técnico escrita antes de codar de verdade: `docs/roadmap.md` (duas fases — catálogo público sem OAuth, depois ações que exigem OAuth), `docs/youtube-api.md` (cotas e custos da API do YouTube), `docs/architecture.md` (Next.js + Supabase/Postgres + Netlify, schema de propriedades dinâmicas).
- Aplicação real criada: Next.js (App Router) + TypeScript + Drizzle ORM.
- Tela de import do Google Takeout (`subscriptions.csv`) — primeira forma de popular a base sem precisar de login OAuth com o YouTube.
- Job de sincronização com o YouTube: `channels.list` para estatísticas + feed RSS público para data do último vídeo (sem gastar cota de API).

**25 jul — Primeiros problemas de deploy/produção**
- Deploy na Netlify falhou por falta da variável `DATABASE_URL` — corrigido, e também descoberto que o client do banco falhava na hora de importar o módulo quando a variável não existia, transformando qualquer erro real num "500" genérico do Next.js. Passou a criar a conexão sob demanda e capturar o erro de verdade.
- A biblioteca `postgres.js` esconde a causa real de erro de conexão dentro de `error.cause` e mostra só uma mensagem inútil ("Failed query..."). Corrigido para mostrar a causa real na tela.

**25–26 jul — Sync mais robusto**
- Canais com bilhões de views (ex. Vsauce, Kendrick Lamar) estouravam o limite da coluna `view_count` (era `int4`, virou `bigint`).
- Ordem de sync passou a priorizar canais nunca sincronizados / há mais tempo sem sincronizar, pra repetidas chamadas manuais cobrirem o catálogo inteiro em vez de sempre repetir as mesmas primeiras linhas.

**26 jul — Tabela principal migrada para React + banco real**
- A home saiu de dado de exemplo (protótipo estático) para a tabela real ligada ao Postgres: busca, filtros, propriedades customizáveis (criar/renomear/apagar propriedade e tags), export CSV, seleção em massa, drawer de perfil de canal, botão de sync manual.
- Decisão de arquitetura importante: "Segmento" não é um campo especial no código — é só a primeira `property` criada. Qualquer regra que tratasse "Segmento" como caso especial quebraria a promessa central do produto (propriedades 100% customizáveis).

**26 jul — Classificação por IA**
- Botão "Classificar com IA": manda lotes de 30 canais pro Claude (Opus 5) pra sugerir um "Segmento", reaproveitando tags existentes quando fazem sentido. Só roda em canais ainda sem Segmento, pra nunca sobrescrever edição manual.

**27 jul — Três bugs sutis de robustez em produção**
1. **Timeout de função na classificação em lote**: o loop fazia até 2 idas ao banco por canal classificado; num lote de 30 isso estourava o tempo limite da função da Netlify a meio caminho, deixando a rodada parcialmente aplicada. Resolvido: calcular todos os ids de opção em memória primeiro, depois no máximo 2 queries em lote por rodada, independente do tamanho do lote.
2. **Data do último vídeo errada pra praticamente todo canal ativo**: o parser pegava a primeira tag `<published>` do XML do feed RSS, mas o feed tem um `<published>` no nível do canal (data de *criação* do canal) antes de qualquer `<entry>` de vídeo. Todo canal sincronizado até então mostrava a data de criação do canal, não a do último vídeo — fazendo canais super ativos parecerem inativos. Corrigido para só considerar o `<published>` de dentro do primeiro `<entry>`.
3. Aproveitando a mexida no sync, adicionada a coluna "Canal desde" (data de criação, que já vinha da API mas não aparecia).

**28 jul — Dois bugs na integração com a IA**
1. **Um `channelId` inventado pela IA travava o lote inteiro**: se a Claude devolvesse um id que não batia com nenhum canal do lote, o insert em massa falhava inteiro por causa da restrição de chave estrangeira — descartando silenciosamente todos os resultados válidos daquele lote. Como a query de seleção de alvos não tinha ordem estável, o mesmo lote travado kept sendo reselecionado, fazendo cliques repetidos não progredirem nada, sem nenhum aviso pro usuário. Corrigido: validar os `channelId` devolvidos contra o lote antes de inserir, dar ordem estável à query (pra retries avançarem), e mostrar contagem de classificados/sincronizados (+ primeiro erro) na tela em vez de falhar em silêncio.
2. **Corte de texto no meio de um emoji quebrava o pedido inteiro**: a descrição do canal era cortada em 300 unidades UTF-16 (`.slice(0, 300)`), o que não é o mesmo que 300 caracteres — se o corte caísse bem no meio de um emoji (que usa "par substituto"/surrogate pair), sobrava metade de um emoji, e a API da Anthropic rejeitava a requisição inteira ("no low surrogate in string"), derrubando o lote de 30 canais por causa de uma descrição só. Corrigido: remover surrogates órfãos antes e depois do corte.

**28 jul — Bloqueio de deploy (créditos Netlify)**
- Ao tentar publicar a correção do item acima, descobrimos que a equipe no Netlify estourou os **créditos mensais gratuitos** (plano Free = 300 créditos/mês, compartilhados entre todos os projetos da conta, não só este). Isso pausa novos deploys e "Agent Runners" até o ciclo renovar ou até upgrade de plano — mas **não tira do ar o que já está publicado**. Decisão: esperar o ciclo renovar (ver data em Netlify → Usage & billing) antes de publicar a correção pendente.

## Aprendizados que valem lembrar

- **Corte de string por tamanho fixo é perigoso com texto arbitrário da internet** (emoji, símbolos fora do plano básico Unicode) — sempre limpar surrogates órfãos depois de truncar por índice.
- **Resultado de IA não é confiável o suficiente pra usar direto numa chave estrangeira** — sempre validar contra o conjunto esperado antes de gravar no banco.
- **Um erro de rodada em lote sem ordem estável trava progresso silenciosamente** — dar ordem estável às queries de "próximo alvo" garante que retries avancem em vez de martelar o mesmo item.
- **Serverless tem orçamento de tempo apertado** — qualquer loop com N chamadas ao banco por item processado é candidato a estourar timeout; resolver agregando em poucas queries em lote.
- **Plataformas com "hospedagem grátis pra sempre" (Netlify Free) ainda cobram créditos por *build/deploy*, não pela hospedagem em si** — o site publicado continua no ar mesmo com créditos zerados; só publicar coisa nova é que trava.
- **Erros de conexão de banco tendem a vir mascarados** por camadas do framework (Server Actions) e da lib de banco (`postgres.js` esconde a causa em `error.cause`) — vale sempre cavar a causa real em vez de confiar na mensagem de topo.

## Onde as coisas estão hoje (28 jul 2026)

- Código: branch `claude/youtube-subscription-manager-lzorne`, tudo commitado e empurrado pro GitHub. Sem PR aberto ainda (opcional, só formaliza revisão — ver conversa).
- Produção (Netlify, site `betterytsubsapp`): publicado no commit `e270920` (uma correção atrás do mais recente). A correção `bd7b113` (bug do emoji/surrogate pair) está pronta e commitada, só falta publicar quando os créditos da Netlify renovarem.
- Pendências do roadmap original: item 7 (deploy com sync agendado) e item 8 (documentar setup real no README) do plano de Fase 1 ainda não fechados.
