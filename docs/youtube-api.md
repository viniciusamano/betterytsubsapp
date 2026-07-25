# YouTube Data API — o que esse projeto realmente precisa

Resumo das descobertas que definiram a divisão em [Fase 1 e Fase 2](roadmap.md).

## O que é dado público (só precisa de uma API key)

Uma API key simples do Google Cloud Console — sem tela de consentimento, sem verificação, sem usuário de teste — já dá acesso a:

- **`channels.list`**: estatísticas de qualquer canal (inscritos, visualizações totais, quantidade de vídeos, descrição, data de criação). Aceita até 50 IDs de canal por chamada.
- **Feed RSS de cada canal** (`https://www.youtube.com/feeds/videos.xml?channel_id=ID`): últimos vídeos publicados, sem gastar cota de API nenhuma.
- **`playlistItems.list`** na "uploads playlist" do canal (alternativa ao RSS, útil se quiser mais metadados por vídeo).

Isso cobre praticamente toda a Fase 1: tabela, stats, indicador de atividade.

## O que precisa de OAuth (login do usuário)

- **`subscriptions.list`**: ler a lista de inscrições de uma conta é dado privado — exige login OAuth (mesmo que só leitura).
- **`subscriptions.delete`**: cancelar inscrição exige OAuth com escopo de **escrita** (`.../auth/youtube`), não o de leitura.

## Por que a Fase 1 evita OAuth de propósito

Em vez de pedir login do Google só para ler a lista de inscrições, a Fase 1 usa o **export do Google Takeout** (takeout.google.com → YouTube e YouTube Music → Inscrições). O usuário baixa um arquivo (formato varia — CSV ou JSON dependendo da versão do Takeout) com a lista de canais inscritos, e importa isso no app. Zero fricção de OAuth pra só *ver* a lista.

A vantagem de adiar o OAuth de escrita pra Fase 2: contas em modo "Testing" no Google Cloud Console têm refresh token expirando a cada 7 dias, o que seria bem irritante pra um app que fica sempre online. Publicar o app sem completar a verificação do Google contorna isso (aparece um aviso de "app não verificado" só na tela de login), mas só vale a pena configurar isso quando a ação que realmente precisa (cancelar inscrição) estiver sendo construída.

## Cota e custos

A API é gratuita. Cota padrão: 10.000 unidades/dia por projeto no Google Cloud.

| Chamada | Custo | Uso estimado (500 canais) |
|---|---|---|
| `channels.list` (50 ids/chamada) | 1 unidade | ~10 unidades |
| RSS de cada canal | 0 (fora da API) | grátis |
| `playlistItems.list` | 1 unidade/chamada | ~500 unidades |
| `subscriptions.list` (paginado, Fase 2) | 1 unidade/página | ~10 unidades |

Total para sincronizar um catálogo de 500 canais: bem menos de 1.000 unidades — dá pra rodar várias vezes por dia sem chegar perto do limite gratuito. O único endpoint a evitar é `search.list` (100 unidades/chamada), que este projeto não precisa usar.

## Classificação de segmento/nicho

A API não categoriza canais por assunto de forma confiável (o campo de tópicos é limitado e praticamente abandonado). A abordagem planejada: usar um LLM para sugerir o segmento a partir do título, descrição e títulos dos últimos vídeos — sempre como sugestão inicial editável, nunca como valor travado.
