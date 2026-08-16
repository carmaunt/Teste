(function (global) {
  "use strict";

  const Experiment = global.Experiment;
  const ui = new Experiment.ExperimentUI();
  const controls = {
    seedInput: document.getElementById("seedInput"),
    createHero: document.getElementById("newExperimentHero"),
    start: document.getElementById("startButton"),
    pause: document.getElementById("pauseButton"),
    nextAction: document.getElementById("nextActionButton"),
    nextDay: document.getElementById("nextDayButton"),
    autoRun: document.getElementById("autoRun"),
    speed: document.getElementById("speedSelect"),
    history: document.getElementById("historyButton"),
    export: document.getElementById("exportButton"),
    restart: document.getElementById("restartButton"),
    newExperiment: document.getElementById("newExperimentButton"),
    panelToggle: document.getElementById("panelToggle")
  };

  let world;
  let running = false;
  let timer = null;
  let busy = false;
  let narrativeProvider = new Experiment.AINarrativeProvider();
  let narrativeStatus = { available: false, source: "LOCAL_FALLBACK", label: "Verificando IA" };

  async function initialize() {
    const saved = await Experiment.Storage.load();
    world = saved ? new Experiment.World(saved) : new Experiment.World(null, { seed: controls.seedInput.value });
    try {
      narrativeStatus = await narrativeProvider.health();
    } catch (error) {
      narrativeStatus = { available: false, source: "LOCAL_FALLBACK", label: "Servidor de IA offline" };
    }
    controls.seedInput.value = world.state.seed;
    const hasActions = world.state.history.some((entry) => entry.kind === "ACTION");
    ui.renderHistory(world.state, !hasActions && !saved);
    ui.setNarrativeStatus(narrativeStatus);
    updateControls();
    if (saved && hasActions) ui.showToast(`Experimento restaurado no dia ${world.state.day}.`);
    if (!narrativeStatus.available) ui.showToast("IA narrativa indisponível. Configure o servidor para liberar novas cenas.");
  }

  async function createExperiment(seed, options) {
    if (busy) {
      ui.showToast("Aguarde a IA concluir o turno antes de criar outro experimento.");
      return;
    }
    pause();
    ui.closeHistory();
    await Experiment.Storage.clear();
    world = new Experiment.World(null, { seed });
    controls.seedInput.value = world.state.seed;
    await Experiment.Storage.save(world.state);
    ui.renderHistory(world.state, Boolean(options && options.showIntro));
    updateControls();
    ui.showToast(`Novo experimento criado com a seed ${world.state.seed}.`);
  }

  function start() {
    if (running || !narrativeStatus.available) {
      if (!narrativeStatus.available) ui.showToast("A IA narrativa precisa estar disponível antes de iniciar.");
      return;
    }
    running = true;
    ui.setIntroVisible(false);
    if (!ui.elements.transcript.children.length) ui.appendEntries(world.state.history.slice(-1), world.state, false);
    updateControls();
    scheduleTick(60);
  }

  function pause() {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
    if (world) updateControls();
  }

  function scheduleTick(delay) {
    if (!running) return;
    timer = setTimeout(tick, delay);
  }

  async function tick() {
    if (!running) return;
    const result = await performStep(true);
    if (!result) return;
    if (controls.autoRun.checked) {
      scheduleTick(readingDelay(result.entries));
    } else {
      pause();
    }
  }

  function readingDelay(entries) {
    const baseDelay = Number(controls.speed.value);
    if (baseDelay <= 1000) return baseDelay;
    const readableText = entries.map((entry) => {
      if (entry.kind === "ACTION") return `${entry.dialogue} ${entry.type !== "SCRIPTED" ? entry.reasons.join(" ") : ""}`;
      if (entry.kind === "REACTION") return entry.text;
      return entry.description || entry.title || "";
    }).join(" ");
    const wordCount = readableText.trim().split(/\s+/).filter(Boolean).length;
    const extraReadingTime = Math.min(6500, wordCount * 52);
    return baseDelay + extraReadingTime;
  }

  async function performStep(shouldScroll) {
    if (busy) return null;
    if (!narrativeStatus.available) {
      ui.showToast("A simulação está pausada porque o texto precisa ser gerado pela IA.");
      return null;
    }
    busy = true;
    ui.setNarrativeBusy(narrativeStatus.available);
    updateControls();
    const stateBeforeTurn = Experiment.deepClone(world.state);
    const result = world.step();
    try {
      await narrativeProvider.enrich(result, world.state);
      ui.setNarrativeStatus(narrativeStatus);
    } catch (error) {
      world = new Experiment.World(stateBeforeTurn);
      narrativeStatus = { available: false, source: "LOCAL_FALLBACK", label: "IA indisponível · recarregue" };
      pause();
      ui.setNarrativeStatus(narrativeStatus);
      ui.showToast(`${error.message} A decisão foi desfeita; nenhum texto automático foi publicado.`);
      busy = false;
      ui.setNarrativeBusy(false);
      updateControls();
      return null;
    }
    await Experiment.Storage.save(world.state);
    ui.appendEntries(result.entries, world.state, shouldScroll);
    busy = false;
    ui.setNarrativeBusy(false);
    updateControls();
    return result;
  }

  async function goToNextDay() {
    pause();
    ui.setIntroVisible(false);
    if (!ui.elements.transcript.children.length) ui.appendEntries(world.state.history.slice(-1), world.state, false);
    const targetDay = world.state.day + 1;
    let guard = Experiment.DAILY_PLAN.length + 2;
    while (world.state.day < targetDay && guard > 0) {
      const result = await performStep(false);
      if (!result) break;
      guard -= 1;
    }
    ui.scrollToLatest();
  }

  function updateControls() {
    ui.refresh(world.state, running);
    controls.pause.disabled = !running;
    controls.start.disabled = running || busy || !narrativeStatus.available;
    controls.nextAction.disabled = running || busy || !narrativeStatus.available;
    controls.nextDay.disabled = running || busy || !narrativeStatus.available;
    controls.start.innerHTML = world.state.meta.actionCount
      ? '<span class="play-icon">▶</span> CONTINUAR'
      : '<span class="play-icon">▶</span> INICIAR';
  }

  function randomSeed() {
    if (global.crypto && global.crypto.getRandomValues) {
      const value = new Uint32Array(1);
      global.crypto.getRandomValues(value);
      return (value[0] % 999999999) + 1;
    }
    return Math.floor(Math.random() * 999999999) + 1;
  }

  controls.createHero.addEventListener("click", () => createExperiment(controls.seedInput.value));
  controls.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") createExperiment(controls.seedInput.value);
  });
  controls.start.addEventListener("click", start);
  controls.pause.addEventListener("click", pause);
  controls.nextAction.addEventListener("click", async () => {
    ui.setIntroVisible(false);
    if (!ui.elements.transcript.children.length) ui.appendEntries(world.state.history.slice(-1), world.state, false);
    await performStep(true);
  });
  controls.nextDay.addEventListener("click", goToNextDay);
  controls.history.addEventListener("click", () => {
    pause();
    ui.openHistory(world.state);
  });
  document.getElementById("closeHistoryButton").addEventListener("click", () => ui.closeHistory());
  document.querySelector("[data-close-history]").addEventListener("click", () => ui.closeHistory());
  document.querySelectorAll("[data-history-filter]").forEach((button) => {
    button.addEventListener("click", () => ui.setHistoryFilter(button.dataset.historyFilter));
  });
  document.getElementById("loadMoreHistory").addEventListener("click", () => ui.loadMoreHistory());
  controls.export.addEventListener("click", () => {
    Experiment.Storage.export(world.state);
    ui.showToast("Histórico completo exportado em JSON.");
  });
  controls.restart.addEventListener("click", () => {
    if (world.state.meta.actionCount && !global.confirm("Reiniciar esta seed e apagar o progresso atual?")) return;
    createExperiment(world.state.seed);
  });
  controls.newExperiment.addEventListener("click", () => {
    if (world.state.meta.actionCount && !global.confirm("Apagar o experimento atual e criar uma nova trajetória?")) return;
    createExperiment(randomSeed());
  });
  controls.panelToggle.addEventListener("click", () => ui.togglePanel());
  global.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ui.elements.historyModal.hidden) ui.closeHistory();
  });
  global.addEventListener("beforeunload", () => {
    if (!busy) Experiment.Storage.save(world.state);
  });

  initialize();

  Experiment.app = {
    get world() { return world; },
    step: () => performStep(false),
    nextDay: goToNextDay,
    pause,
    start,
    createExperiment
  };
})(window);
