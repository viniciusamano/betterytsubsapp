# Backlog — melhorias futuras

Ideias fora do escopo atual das duas fases (`roadmap.md`), pra revisitar depois. Nada aqui está implementado.

- **Diff inteligente no reimport do Google Takeout.** Hoje o import (`src/app/import/actions.ts`) é só aditivo: adiciona canal novo, atualiza o nome de quem já existe, e nunca mexe em quem saiu da lista — mesmo que você tenha cancelado a inscrição de verdade no YouTube. Melhoria: ao reimportar, comparar com o que já está no banco e perguntar explicitamente se quer remover os canais que não aparecem mais no novo export, antes de apagar qualquer coisa. Continua sem tocar em classificação/propriedades dos canais que ficam.

- **Sincronizar a lista de inscrições direto do YouTube (sem Takeout manual).** Já é a ideia central da Fase 2 do roadmap (login "Conectar com o YouTube" via OAuth) — worth destacar aqui porque resolve o mesmo problema do item acima de um jeito melhor: em vez de comparar exports manuais, o app puxaria a lista atual direto da API sempre que quiser, criando/removendo automaticamente. Depende de OAuth com escopo de leitura do YouTube (não precisa do escopo de escrita que a Fase 2 pede pra cancelar inscrição — dá pra fazer só a leitura primeiro, como um passo intermediário antes do resto da Fase 2).

- **Mudanças visuais.** Vinicius mencionou querer ajustar o visual em algum momento futuro — sem specs ainda. Quando quiser tocar nisso, listamos o que muda (cores, densidade da tabela, tipografia, o que voltar do protótipo que ficou de fora como o ticker animado e a marca d'água de fundo, etc.) e priorizamos.
