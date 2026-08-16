const assert = require("node:assert/strict");

global.window = global;
["utils", "characters", "memory", "decision-engine", "logger", "world", "narrative-provider"].forEach((moduleName) => require(`../js/${moduleName}.js`));

(async () => {
  const world = new Experiment.World(null, { seed: 583729 });
  world.step();
  const result = world.step();
  const action = result.entries.find((entry) => entry.kind === "ACTION");
  const reaction = result.entries.find((entry) => entry.kind === "REACTION");
  assert.ok(action && reaction, "o turno de teste precisa conter ação e resposta");

  let receivedTurn = null;
  global.fetch = async (url, options) => {
    assert.equal(url, "/api/narrate");
    receivedTurn = JSON.parse(options.body).turn;
    return {
      ok: true,
      async json() {
        return { actionText: "Filha, vamos levantar com calma; ainda temos tempo.", reactionText: "Eu ouvi. Já vou me arrumar.", model: "test-model" };
      }
    };
  };

  const provider = new Experiment.AINarrativeProvider();
  await provider.enrich(result, world.state);

  assert.equal(action.dialogue, "Filha, vamos levantar com calma; ainda temos tempo.");
  assert.equal(reaction.text, "Eu ouvi. Já vou me arrumar.");
  assert.equal(action.narrativeSource, "OLLAMA");
  assert.equal(reaction.narrativeSource, "OLLAMA");
  assert.equal(receivedTurn.action.id, action.chosenAction);
  assert.equal(receivedTurn.reaction.required, true);
  assert.ok(!JSON.stringify(receivedTurn.action).includes("Filha, acorde"), "o template local não deve ser enviado como resposta a copiar");
  assert.equal(world.state.history.find((entry) => entry.id === action.id).dialogue, action.dialogue, "o texto gerado deve permanecer no histórico");

  console.log(JSON.stringify({ result: "ok", provider: "OLLAMA", reaction: true }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
