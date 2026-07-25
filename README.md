# Meus Canais

Um jeito melhor de ver, organizar e filtrar os canais que você é inscrito no YouTube — sem depender da lista gigante e sem filtros de `youtube.com/feed/channels`.

A ideia: conectar sua conta (ou importar sua lista de inscrições), puxar dados de cada canal (inscritos, vídeos, views, último vídeo postado) e te deixar organizar tudo numa tabela com propriedades e tags totalmente customizáveis — parecido com um banco de dados tipo Notion, mas focado em canais do YouTube.

## Status atual

🚧 **Fase de prototipagem de interface.** Ainda não há backend nem integração real com a API do YouTube — o foco agora é validar a experiência de uso (tabela, filtros, propriedades customizáveis, perfil de canal) com dados de exemplo, antes de construir a aplicação de verdade.

Veja o protótipo interativo em [`prototype/channel-catalog.html`](prototype/channel-catalog.html) — é um único arquivo HTML, sem dependências de build. Baixe e abra direto no navegador.

## O que o protótipo já mostra

- Tabela com todos os canais: segmento, inscritos, vídeos, views totais, data do último vídeo (com indicador Ativo / Esfriando / Inativo).
- **Propriedades customizáveis**: além de "Segmento" (vem com sugestão pronta, pensada para ser preenchida por IA no futuro), você pode criar novas propriedades do zero — seleção única, múltipla seleção, texto, número, checkbox ou link — e editar/apagar tags a qualquer momento, direto na tabela.
- Filtros por segmento (chips), busca por nome/handle e por status de atividade.
- Colunas configuráveis (esconder/mostrar o que não interessa).
- Seleção em massa + exportação para CSV (inclui todas as propriedades criadas).
- Painel de perfil por canal (estilo simplificado de ferramentas como o ViewStats): stats, descrição, últimos vídeos, link direto pro YouTube.
- Responsivo: a tabela vira uma lista de cards em telas menores que ~760px.
- Botão de "cancelar inscrição" já está desenhado na interface, mas fica desabilitado — essa ação depende de autorização OAuth do Google (ver [Fase 2](docs/roadmap.md)).

## Documentação

- [`docs/roadmap.md`](docs/roadmap.md) — o que já está pronto, o que falta, e por quê está dividido em duas fases.
- [`docs/youtube-api.md`](docs/youtube-api.md) — como a API do YouTube funciona pra esse projeto: o que precisa de OAuth, o que não precisa, cotas, custos e limitações.
- [`docs/architecture.md`](docs/architecture.md) — stack planejada (Next.js + Supabase + Netlify), modelo de dados das propriedades customizáveis, e como o sync com o YouTube vai funcionar.

## Por que assim

O YouTube não deixa você segmentar, taggear ou simplesmente *ver direito* mais de algumas dezenas de canais inscritos. Esse projeto existe pra resolver isso pra quem acompanha uma quantidade grande de canais (500+) e quer conseguir: encontrar rápido "meus canais de ciência", saber quais pararam de postar, e mandar uma lista organizada pra um amigo que pediu recomendação de algum nicho.
