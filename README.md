# Entrelinhas

MVP de um experimento de comportamento emergente com quatro agentes. O motor local decide e aplica as consequências; a OpenAI apenas redige a fala, o pensamento ou a narração correspondente ao resultado já calculado.

## Executar com a narrativa por IA

Use Node.js 18 ou superior e inicie o servidor seguro do projeto:

```bash
OPENAI_API_KEY="sua-chave" node server.mjs
```

Depois acesse `http://localhost:8000`. A chave fica apenas no processo do servidor e nunca é enviada ao navegador. O modelo padrão é `gpt-5.6`; para substituí-lo:

```bash
OPENAI_API_KEY="sua-chave" OPENAI_MODEL="modelo-compatível" node server.mjs
```

Abrir o HTML diretamente ou usar um servidor estático não ativa a rota `/api/narrate`. Se a IA estiver sem chave, sem cota ou indisponível, os controles de novas cenas ficam bloqueados. Se uma chamada falhar durante um turno, a decisão é revertida e nenhum texto local é publicado como se fosse conteúdo de IA.

## Cadeias causais

Cada dia registra variáveis intermediárias visíveis no painel:

- horário em que a mãe acordou e atraso da filha;
- café disponível, refeição da filha e refeição do pai;
- fome, irritabilidade, chegada à escola, conflito, apresentação e nota;
- café aceito ou recusado no trabalho, incentivo percebido pela secretária e proximidade;
- vestígio de perfume e reação emocional da mãe, mesmo sem traição consumada.

As ações mais fortes só ficam disponíveis depois de limiares observáveis. Por exemplo, a briga escolar exige fome e irritabilidade altas; acordar tarde exige baixa disposição, emoções negativas ou preocupação trazida pela nota anterior. Boas notas também podem favorecer uma manhã antecipada e mais estável.

O texto gerado é salvo no mesmo registro da decisão. Assim, recarregar a página não gera outra versão para uma conversa que já aconteceu. A seed continua reproduzindo decisões e consequências; o texto da IA é preservado pelo histórico, pois geração de linguagem não é deterministicamente reproduzível.

## Validação

```bash
node tests/simulation.test.cjs
node tests/narrative-provider.test.cjs
```

O primeiro teste atravessa 72 dias e exige caminhos positivos e negativos, limiares, respostas dos interlocutores, notas, café aceito e perfume detectado. O segundo simula a resposta estruturada da API e comprova que a fala e a reação geradas substituem os placeholders e permanecem no histórico.

## Arquitetura

- `characters.js`: personalidade, objetivos, estados e relações.
- `memory.js`: memória episódica, recuperação, saliência e consolidação.
- `decision-engine.js`: decisões locais, reproduzíveis e auditáveis.
- `world.js`: rotina, limiares, ações, efeitos e cadeias causais.
- `narrative-provider.js`: cliente assíncrono que envia apenas o turno estruturado para redação.
- `server.mjs`: arquivos estáticos e proxy seguro para a Responses API com saída JSON estruturada.
- `logger.js` / `storage.js`: histórico completo e persistência em IndexedDB.
- `ui.js` / `app.js`: painel causal, controles, leitura e tratamento de indisponibilidade da IA.
