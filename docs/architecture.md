# Arquitetura planejada

Este documento descreve a direção técnica para quando o protótipo (`prototype/channel-catalog.html`) virar uma aplicação de verdade. Nada aqui está implementado ainda — é o plano.

## Stack

- **Frontend + backend**: Next.js (App Router), TypeScript. Rotas de API na própria aplicação cuidam de: parsear o import do Google Takeout, sincronizar dados do YouTube, servir os dados pro frontend.
- **Banco de dados**: Postgres via Supabase (tier gratuito cobre o uso de uma pessoa/poucas pessoas). ORM: Drizzle ou Prisma.
- **Deploy**: Netlify, com uma função agendada (scheduled function) pra rodar o sync diário.
- **Sem sistema de login na Fase 1** — é uma ferramenta auto-hospedada: cada pessoa que rodar a própria instância importa a própria lista de canais. Login OAuth só entra na Fase 2, e mesmo assim só para autorizar ações na conta do YouTube (não pra multi-tenancy).

## Modelo de dados: propriedades customizáveis

O pedido central do produto é: "quero poder criar novas propriedades e novas tags dentro delas, do jeito que eu precisar" — isso significa que o schema de organização não pode ser fixo (nada de coluna `segmento` fixa no banco). É modelado como um sistema de propriedades dinâmico, no estilo Notion/Airtable:

```
channels
  id (youtube channel id, PK)
  name, handle, description
  subscriber_count, video_count, view_count
  last_video_published_at
  created_at_youtube
  synced_at

properties
  id (PK)
  name
  type (multi_select | select | text | number | checkbox | link)
  ai_suggested (bool)
  created_at

property_options            -- só usado por multi_select / select
  id (PK)
  property_id (FK -> properties)
  label
  color

channel_property_values
  channel_id (FK -> channels)
  property_id (FK -> properties)
  value_option_ids (array, para multi_select/select -> aponta pra property_options)
  value_text
  value_number
  value_bool
```

"Segmento" nasce como a primeira `property` (tipo `multi_select`), populada por IA — mas depois de criada não é tratada como especial em nenhuma regra de negócio: renomear, apagar, ou criar outras 10 propriedades do zero funciona do mesmo jeito. O protótipo em `prototype/channel-catalog.html` já implementa esse modelo inteiro em memória (array `PROPERTIES` + `channel.values`), incluindo criar/renomear/excluir propriedades e criar/excluir tags dentro delas — é o comportamento de referência pra implementação real.

## Sync com o YouTube

1. **Import inicial**: usuário sobe o export do Google Takeout (lista de canais inscritos) → grava linhas em `channels` com os campos ainda vazios de estatística.
2. **Job de sync** (manual ou agendado): para cada canal, busca `channels.list` (stats) e o feed RSS (último vídeo) — ver [`docs/youtube-api.md`](youtube-api.md) para detalhes de cota. Atualiza `channels.synced_at` e os campos de estatística.
3. **Classificação por IA**: só roda para canais que ainda não têm nenhum valor na propriedade "Segmento" — evita sobrescrever edição manual do usuário.

## Por que não há histórico de crescimento (ainda)

A API do YouTube não devolve histórico de inscritos no passado — só o valor atual. Um gráfico de crescimento (tipo o do ViewStats) só é possível a partir do dia em que o sync começar a rodar de verdade, guardando um snapshot (`channel_stats_history`, não incluído no modelo acima ainda) a cada sync. Fica como extensão natural depois que a Fase 1 estiver no ar.
