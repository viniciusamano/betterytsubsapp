# Roadmap

## Fase 1 — Catálogo e organização (sem OAuth)

Tudo que precisa apenas de dados **públicos** do YouTube. Nenhuma ação nesta fase modifica a conta do usuário no YouTube, então não é preciso passar pela tela de consentimento OAuth do Google — só uma chave de API simples.

- [x] Interface: tabela, filtros, propriedades customizáveis, export CSV, perfil de canal, responsivo (protótipo em `prototype/channel-catalog.html`).
- [ ] Importar a lista de inscrições via export do Google Takeout (CSV/JSON — não depende de login com o YouTube).
- [ ] Sincronizar estatísticas de cada canal (`channels.list`) e data do último vídeo (feed RSS público ou `playlistItems.list`) usando uma API key simples.
- [ ] Persistir tudo num banco (Postgres via Supabase) — canais, propriedades, valores.
- [ ] Classificação automática de "Segmento" via IA (Claude), a partir do título/descrição/últimos vídeos do canal — sempre editável manualmente depois.
- [ ] Deploy público (Netlify) com sync agendado (1x/dia ou botão manual).

## Fase 2 — Ações na conta do YouTube (com OAuth)

Só entra em jogo quando a Fase 1 estiver estável. Tudo aqui exige login OAuth do usuário com escopo de escrita (`.../auth/youtube`), porque modifica a conta de verdade.

- [ ] Login "Conectar com o YouTube".
- [ ] Sincronizar a lista de inscrições automaticamente (sem precisar de export manual do Takeout).
- [ ] Botão de **cancelar inscrição** direto pela interface (já desenhado no protótipo, hoje desabilitado).

Ver [`docs/youtube-api.md`](youtube-api.md) para o porquê dessa divisão e o que cada fase realmente exige do Google.
