const assert = require("node:assert/strict");

global.window = global;
[
  "utils",
  "characters",
  "memory",
  "decision-engine",
  "logger",
  "world"
].forEach((moduleName) => require(`../js/${moduleName}.js`));

function runSteps(seed, steps) {
  const world = new Experiment.World(null, { seed });
  for (let index = 0; index < steps; index += 1) world.step();
  return world;
}

function historySignature(state) {
  return state.history.map((entry) => [
    entry.kind,
    entry.day,
    entry.period,
    entry.character,
    entry.expectedAction,
    entry.chosenAction,
    entry.type,
    entry.eventId,
    entry.score,
    entry.expressionType,
    entry.text
  ]);
}

const totalSteps = (Experiment.DAILY_PLAN.length + 1) * 72;
const uninterrupted = runSteps(583729, totalSteps);
const stats = Experiment.Logger.stats(uninterrupted.state);
const actionLogs = uninterrupted.state.history.filter((entry) => entry.kind === "ACTION");
const reactionLogs = uninterrupted.state.history.filter((entry) => entry.kind === "REACTION");

assert.ok(uninterrupted.state.day >= 60, "a simulação deve atravessar dezenas de dias");
assert.ok(stats.scripted > 0, "deve haver decisões SCRIPTED");
assert.ok(stats.adaptive > 0, "deve haver decisões ADAPTIVE");
assert.ok(stats.emergent > 0, "deve haver decisões EMERGENT");
assert.equal(stats.actions, actionLogs.length, "as métricas devem refletir o histórico");
assert.ok(reactionLogs.length > 0, "interações devem produzir respostas dos interlocutores");
assert.deepEqual(new Set(actionLogs.map((entry) => entry.expressionType)), new Set(["DIALOGUE", "THOUGHT", "NARRATION"]), "fala, pensamento e narração devem ser distinguíveis");

actionLogs.forEach((entry) => {
  assert.ok(entry.expectedAction && entry.chosenAction && entry.type);
  assert.ok(Array.isArray(entry.reasons));
  assert.ok(Array.isArray(entry.memoriesUsed));
  assert.ok(entry.stateBefore && entry.stateAfter);
  if (entry.type === "EMERGENT") {
    assert.ok(entry.emotionalFactors.length || entry.memoriesUsed.length, "emergência deve ter causa observável");
  }
});

reactionLogs.forEach((entry) => {
  assert.ok(entry.character && entry.sourceCharacter && entry.sourceAction);
  assert.ok(["DIALOGUE", "THOUGHT"].includes(entry.expressionType));
  assert.ok(entry.text);
});

const chosenActions = new Set(actionLogs.map((entry) => entry.chosenAction));
["acordar_cedo", "acordar_tarde", "preparar_cafe_completo", "preparar_cafe_rapido", "nao_preparar_cafe", "sair_sem_comer", "discutir_na_escola", "apresentar_bem_trabalho", "apresentar_com_dificuldade", "nao_apresentar_trabalho", "aceitar_cafe_secretaria"].forEach((actionId) => {
  assert.ok(chosenActions.has(actionId), `a cadeia causal deve alcançar ${actionId}`);
});

actionLogs.filter((entry) => entry.chosenAction === "discutir_na_escola").forEach((entry) => {
  assert.ok(entry.stateBefore.states.hunger >= 42, "a briga só deve ser liberada com fome alta");
  assert.ok(entry.stateBefore.states.irritability >= 42, "a briga só deve ser liberada com irritabilidade alta");
  assert.equal(entry.stateBefore.worldFacts.daughterSkippedBreakfast, true, "a briga desta trajetória deve carregar o jejum como causa");
});

actionLogs.filter((entry) => entry.chosenAction === "aceitar_cafe_secretaria").forEach((entry) => {
  assert.equal(entry.stateBefore.worldFacts.fatherSkippedBreakfast, true, "aceitar o café deve estar ligado à saída em jejum");
});

const gradeActions = actionLogs.filter((entry) => ["apresentar_bem_trabalho", "apresentar_com_dificuldade", "nao_apresentar_trabalho"].includes(entry.chosenAction));
assert.ok(gradeActions.every((entry) => Number.isFinite(entry.routineSnapshot.schoolGrade)), "cada apresentação deve produzir nota rastreável");
assert.ok(uninterrupted.state.history.some((entry) => entry.kind === "EVENT" && entry.eventId === "scent_detected"), "a proximidade no trabalho deve poder deixar vestígio perceptível em casa");

const secretaryLineIndex = uninterrupted.state.history.findIndex((entry) => entry.kind === "ACTION" && entry.character === "secretaria" && entry.expressionType === "DIALOGUE");
assert.ok(secretaryLineIndex >= 0, "a secretária deve possuir falas no experimento");
const fatherResponse = uninterrupted.state.history[secretaryLineIndex + 1];
assert.equal(fatherResponse.kind, "REACTION", "uma fala da secretária deve receber retorno imediato");
assert.equal(fatherResponse.character, "pai", "o pai deve responder à fala da secretária");

const splitPoint = Experiment.DAILY_PLAN.length * 13 + 7;
const partial = runSteps(583729, splitPoint);
const restoredState = JSON.parse(JSON.stringify(partial.state));
const resumed = new Experiment.World(restoredState);
for (let index = splitPoint; index < totalSteps; index += 1) resumed.step();

assert.deepEqual(historySignature(resumed.state), historySignature(uninterrupted.state), "retomar o estado deve preservar a trajetória");
assert.equal(resumed.state.rngState, uninterrupted.state.rngState, "o estado do RNG deve ser reproduzível");

const firstEmergent = actionLogs.find((entry) => entry.type === "EMERGENT");
console.log(JSON.stringify({
  result: "ok",
  day: uninterrupted.state.day,
  stats,
  firstEmergent: {
    day: firstEmergent.day,
    character: firstEmergent.character,
    action: firstEmergent.chosenAction,
    memoriesUsed: firstEmergent.memoriesUsed.length,
    reasons: firstEmergent.reasons
  }
}, null, 2));
