# Entrelinhas

MVP de um experimento de comportamento emergente com quatro agentes. O motor local decide e aplica as consequências; o Ollama apenas redige a fala, o pensamento ou a narração correspondente ao resultado já calculado.

## Executar com Ollama local

Use Node.js 18 ou superior. Com o Ollama instalado e pelo menos um modelo disponível, inicie o servidor:

```bash
node server.mjs
```

Depois acesse `http://localhost:8000`.

O servidor consulta os modelos disponíveis no Ollama e, se `OLLAMA_MODEL` não for informado, usa o primeiro modelo retornado. Para escolher explicitamente um modelo:

```bash
OLLAMA_MODEL="nome-do-modelo" node server.mjs
```

A API local do Ollama não exige chave.

## Executar com Ollama Cloud

Para usar diretamente a API do Ollama Cloud, informe sua chave e o modelo:

```bash
OLLAMA_API_KEY="sua-chave" OLLAMA_MODEL="nome-do-modelo" node server.mjs
```

Quando `OLLAMA_API_KEY` está presente, o servidor usa `https://ollama.com/api`. Se precisar apontar para outro host, use `OLLAMA_URL`.

Exemplo:

```bash
OLLAMA_URL="http://127.0.0.1:11434" OLLAMA_MODEL="nome-do-modelo" node server.mjs
```

Nunca coloque a chave no navegador nem faça commit dela no Git. A chave, quando usada, fica somente no processo do servidor.

## Porta ocupada

A porta padrão é `8000`. Se ela já estiver em uso, você pode iniciar em outra porta:

```bash
PORT=8001 node server.mjs
```

## Como a narrativa funciona

Abrir o HTML diretamente ou usar um servidor estático não ativa a rota `/api/narrate`. O navegador conversa somente com `server.mjs`; o servidor então chama o Ollama.

Antes de liberar novas cenas, `/api/health` verifica se o Ollama está acessível e se existe um modelo utilizável. Se uma chamada falhar durante um turno, a decisão é revertida e nenhum texto local é publicado como se fosse conteúdo de IA.

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
- `server.mjs`: arquivos estáticos e proxy seguro para a API do Ollama com saída JSON estruturada.
- `logger.js` / `storage.js`: histórico completo e persistência em IndexedDB.
- `ui.js` / `app.js`: painel causal, controles, leitura e tratamento de indisponibilidade da IA.
