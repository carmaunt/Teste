(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  class ExperimentUI {
    constructor() {
      this.elements = {
        intro: document.getElementById("intro"),
        transcript: document.getElementById("transcript"),
        scrollAnchor: document.getElementById("scrollAnchor"),
        dayLabel: document.getElementById("dayLabel"),
        periodLabel: document.getElementById("periodLabel"),
        dayProgress: document.getElementById("dayProgress"),
        characterStates: document.getElementById("characterStates"),
        metricDay: document.getElementById("metricDay"),
        metricActions: document.getElementById("metricActions"),
        metricScripted: document.getElementById("metricScripted"),
        metricAdaptive: document.getElementById("metricAdaptive"),
        metricEmergent: document.getElementById("metricEmergent"),
        metricDeviations: document.getElementById("metricDeviations"),
        seedBadge: document.getElementById("seedBadge"),
        runStatus: document.getElementById("runStatus"),
        narrativeStatus: document.getElementById("narrativeStatus"),
        routineSummary: document.getElementById("routineSummary"),
        panel: document.getElementById("labPanel"),
        panelToggle: document.getElementById("panelToggle"),
        toast: document.getElementById("toast"),
        historyModal: document.getElementById("historyModal"),
        historyList: document.getElementById("historyList"),
        historyRange: document.getElementById("historyRange"),
        loadMoreHistory: document.getElementById("loadMoreHistory")
      };
      this.lastPeriodKey = null;
      this.toastTimer = null;
      this.historyState = null;
      this.historyFilter = "ALL";
      this.historyVisibleCount = 120;
    }

    setIntroVisible(visible) {
      this.elements.intro.classList.toggle("is-hidden", !visible);
    }

    renderHistory(state, showIntro) {
      this.elements.transcript.replaceChildren();
      this.lastPeriodKey = null;
      this.setIntroVisible(showIntro);
      if (!showIntro) {
        state.history.slice(-140).forEach((entry) => this.appendEntry(entry, state, false));
      }
      this.refresh(state, false);
    }

    appendEntries(entries, state, shouldScroll = true) {
      this.setIntroVisible(false);
      entries.forEach((entry) => this.appendEntry(entry, state, false));
      while (this.elements.transcript.children.length > 240) {
        this.elements.transcript.firstElementChild.remove();
      }
      this.refresh(state, false);
      if (shouldScroll) this.scrollToLatest();
    }

    appendEntry(entry, state) {
      if (entry.kind === "ACTION") {
        const periodKey = `${entry.day}-${entry.period}`;
        if (periodKey !== this.lastPeriodKey) {
          this.elements.transcript.appendChild(this.periodDivider(entry));
          this.lastPeriodKey = periodKey;
        }
        this.elements.transcript.appendChild(this.actionEntry(entry, state));
      } else if (entry.kind === "EVENT") {
        this.elements.transcript.appendChild(this.eventEntry(entry));
      } else if (entry.kind === "REACTION") {
        this.elements.transcript.appendChild(this.reactionEntry(entry, state));
      } else if (entry.kind === "DAY_END") {
        this.elements.transcript.appendChild(this.dayEndEntry(entry));
        this.lastPeriodKey = null;
      }
    }

    periodDivider(entry) {
      const divider = document.createElement("div");
      divider.className = "period-divider";
      divider.innerHTML = `<span>DIA ${Experiment.formatDay(entry.day)} · ${this.escape(entry.periodLabel)}</span>`;
      return divider;
    }

    actionEntry(entry, state) {
      const character = state.characters[entry.character];
      const article = document.createElement("article");
      const expressionType = entry.expressionType || "DIALOGUE";
      article.className = `dialogue-entry type-${entry.type.toLowerCase()} is-${expressionType.toLowerCase()}`;
      article.style.setProperty("--character", character.color);

      const memoryText = entry.memoryDetails && entry.memoryDetails.length
        ? entry.memoryDetails.slice(0, 2).map((memory) => `Dia ${memory.day}: ${memory.description}`).join(" · ")
        : "Nenhuma memória episódica foi decisiva.";
      const emotionText = entry.emotionalFactors && entry.emotionalFactors.length
        ? entry.emotionalFactors.slice(0, 3).map((factor) => `${factor.label} ${Experiment.round(factor.value)}`).join(" · ")
        : "O estado emocional não produziu um fator dominante.";
      const consequenceText = entry.consequences && entry.consequences.length
        ? entry.consequences.slice(0, 3).join(" · ")
        : "Sem alteração mensurável imediata.";

      article.innerHTML = `
        <div class="avatar" aria-hidden="true">${this.escape(character.initials)}</div>
        <div class="dialogue-body">
          <div class="speaker-line"><strong>${this.escape(character.name.toUpperCase())}</strong><span>${entry.type} · SCORE ${entry.score} · ${entry.narrativeSource !== "LOCAL_FALLBACK" ? "TEXTO IA" : "TEXTO LOCAL"}</span></div>
          ${this.expressionMarkup(entry.dialogue, expressionType)}
          <p class="action-caption">AÇÃO · ${this.escape(entry.chosenActionLabel)}</p>
        </div>
        ${entry.type === "SCRIPTED" ? "" : `
          <div class="decision-card ${entry.type === "EMERGENT" ? "emergent" : ""}">
            <div class="decision-title"><i></i>${entry.type === "EMERGENT" ? "★ COMPORTAMENTO EMERGENTE" : "⚠ DESVIO DE ROTEIRO · ADAPTATIVO"}</div>
            <div class="decision-comparison">
              <div><small>ESPERADO</small><p>${this.escape(entry.expectedActionLabel)}</p></div>
              <div><small>DECISÃO</small><p>${this.escape(entry.chosenActionLabel)}</p></div>
            </div>
            <div class="reason-block"><small>MOTIVO</small><p>${this.escape(entry.reasons.join(" + "))}</p></div>
            <p class="memory-note"><strong>MEMÓRIA</strong> · ${this.escape(memoryText)}</p>
            <p class="memory-note"><strong>EMOÇÕES</strong> · ${this.escape(emotionText)}</p>
            <p class="memory-note"><strong>CONSEQUÊNCIAS</strong> · ${this.escape(consequenceText)}</p>
          </div>`}
      `;
      return article;
    }

    expressionMarkup(text, expressionType) {
      if (expressionType === "THOUGHT") {
        return `<span class="expression-label">PENSAMENTO INTERNO</span><p class="thought-copy">“${this.escape(text)}”</p>`;
      }
      if (expressionType === "NARRATION") {
        return `<span class="expression-label">AÇÃO OBSERVADA</span><p class="narration-copy">${this.escape(text)}</p>`;
      }
      return `<span class="expression-label">DIÁLOGO</span><p class="dialogue-copy">“${this.escape(text)}”</p>`;
    }

    reactionEntry(entry, state) {
      const character = state.characters[entry.character];
      const source = state.characters[entry.sourceCharacter];
      const isThought = entry.expressionType === "THOUGHT";
      const article = document.createElement("article");
      article.className = `reaction-entry ${isThought ? "is-thought" : "is-dialogue"}`;
      article.style.setProperty("--character", character.color);
      article.innerHTML = `
        <div class="reaction-speaker">
          <strong>${this.escape(character.name.toUpperCase())}</strong>
          <span>${isThought ? "PENSAMENTO EM RESPOSTA" : "RESPOSTA A " + (source ? source.name.toUpperCase() : "INTERAÇÃO")} · ${entry.narrativeSource !== "LOCAL_FALLBACK" ? "IA" : "LOCAL"}</span>
        </div>
        <p class="reaction-copy">${isThought ? "“" : "“"}${this.escape(entry.text)}”</p>
      `;
      return article;
    }

    eventEntry(entry) {
      const article = document.createElement("article");
      article.className = "event-card";
      article.innerHTML = `
        <span>◇ CONTEXTO EXTERNO · DIA ${Experiment.formatDay(entry.day)}</span>
        <h3>${this.escape(entry.title)}</h3>
        <p>${this.escape(entry.description)}</p>
      `;
      return article;
    }

    dayEndEntry(entry) {
      const article = document.createElement("article");
      article.className = "day-end-card";
      const retained = Object.values(entry.memoryConsolidation || {}).reduce((sum, item) => sum + item.after, 0);
      article.innerHTML = `
        <span>FIM DO DIA ${Experiment.formatDay(entry.day)}</span>
        <h3>Memórias consolidadas: ${retained}</h3>
        <p>${this.escape(entry.description)}</p>
      `;
      return article;
    }

    refresh(state, running) {
      const item = Experiment.DAILY_PLAN[state.currentStep];
      const period = item ? Experiment.PERIODS[item.period] : Experiment.PERIODS.FIM_DIA;
      const stats = Experiment.Logger.stats(state);
      this.elements.dayLabel.textContent = `DIA ${Experiment.formatDay(state.day)}`;
      this.elements.periodLabel.textContent = period;
      this.elements.dayProgress.style.width = `${(state.currentStep / Experiment.DAILY_PLAN.length) * 100}%`;
      this.elements.metricDay.textContent = Experiment.formatDay(state.day);
      this.elements.metricActions.textContent = stats.actions;
      this.elements.metricScripted.textContent = stats.scripted;
      this.elements.metricAdaptive.textContent = stats.adaptive;
      this.elements.metricEmergent.textContent = stats.emergent;
      this.elements.metricDeviations.textContent = stats.deviations;
      this.elements.seedBadge.textContent = `SEED ${state.seed}`;
      this.renderRoutine(state);
      this.renderCharacters(state);
      if (typeof running === "boolean") this.setRunning(running);
    }

    renderCharacters(state) {
      this.elements.characterStates.innerHTML = Object.values(state.characters).map((character) => {
        const rows = character.displayStates.map((stateName) => {
          const value = Experiment.round(character.states[stateName]);
          return `
            <div class="state-row">
              <label title="${this.escape(Experiment.STATE_LABELS[stateName] || stateName)}">${this.escape(Experiment.STATE_LABELS[stateName] || stateName)}</label>
              <span class="state-bar"><i style="width:${value}%"></i></span>
              <output>${value}</output>
            </div>`;
        }).join("");
        return `
          <section class="character-state" style="--character:${character.color}">
            <div class="character-summary">
              <div class="character-id"><span class="mini-avatar">${this.escape(character.initials)}</span><strong>${this.escape(character.name.toUpperCase())}</strong></div>
              <span class="memory-count">${character.memories.length} MEMÓRIAS</span>
            </div>
            ${rows}
          </section>`;
      }).join("");
    }

    renderRoutine(state) {
      if (!this.elements.routineSummary) return;
      const routine = state.dailyContext && state.dailyContext.routine;
      if (!routine) return;
      const items = [
        ["Mãe acordou", routine.motherWake],
        ["Filha se arrumou", routine.daughterReady],
        ["Café em casa", routine.breakfast],
        ["Filha comeu", routine.daughterBreakfast],
        ["Pai comeu", routine.fatherBreakfast],
        ["Chegada à escola", routine.schoolArrival],
        ["Convívio escolar", routine.schoolClimate],
        ["Apresentação", routine.presentation],
        ["Nota", Number.isFinite(routine.schoolGrade) ? routine.schoolGrade.toFixed(1) : "PENDENTE"],
        ["Café no trabalho", routine.fatherCoffeeAtWork],
        ["Perfume percebido", routine.scentDetected ? "SIM" : "NÃO"]
      ];
      this.elements.routineSummary.innerHTML = items.map(([label, value]) => `
        <div class="routine-item ${value === "PENDENTE" ? "pending" : ""}">
          <span>${this.escape(label)}</span><strong>${this.escape(value)}</strong>
        </div>`).join("");
    }

    setRunning(running) {
      this.elements.runStatus.classList.toggle("running", running);
      this.elements.runStatus.classList.toggle("paused", !running);
      this.elements.runStatus.innerHTML = `<i></i>${running ? " EM EXECUÇÃO" : " EM PAUSA"}`;
    }

    setNarrativeStatus(status) {
      if (!this.elements.narrativeStatus) return;
      this.elements.narrativeStatus.classList.toggle("available", Boolean(status.available));
      this.elements.narrativeStatus.classList.toggle("fallback", !status.available);
      this.elements.narrativeStatus.innerHTML = `<i></i>${this.escape(status.label || (status.available ? "IA ativa" : "Modo local"))}`;
    }

    setNarrativeBusy(busy) {
      if (!this.elements.narrativeStatus) return;
      this.elements.narrativeStatus.classList.toggle("generating", Boolean(busy));
      if (busy) this.elements.narrativeStatus.innerHTML = "<i></i>IA ESCREVENDO…";
    }

    togglePanel() {
      const collapsed = this.elements.panel.classList.toggle("is-collapsed");
      this.elements.panelToggle.setAttribute("aria-expanded", String(!collapsed));
    }

    openHistory(state) {
      this.historyState = state;
      this.historyFilter = "ALL";
      this.historyVisibleCount = 120;
      this.elements.historyModal.hidden = false;
      document.body.classList.add("history-open");
      document.querySelectorAll("[data-history-filter]").forEach((button) => {
        button.classList.toggle("active", button.dataset.historyFilter === "ALL");
      });
      this.renderGeneralHistory();
      requestAnimationFrame(() => this.elements.historyList.scrollTop = 0);
    }

    closeHistory() {
      this.elements.historyModal.hidden = true;
      document.body.classList.remove("history-open");
    }

    setHistoryFilter(filter) {
      this.historyFilter = filter;
      this.historyVisibleCount = 120;
      document.querySelectorAll("[data-history-filter]").forEach((button) => {
        button.classList.toggle("active", button.dataset.historyFilter === filter);
      });
      this.renderGeneralHistory();
      this.elements.historyList.scrollTop = 0;
    }

    loadMoreHistory() {
      this.historyVisibleCount += 160;
      this.renderGeneralHistory();
    }

    filteredGeneralHistory() {
      if (!this.historyState) return [];
      return this.historyState.history.filter((entry) => {
        const expressionType = entry.expressionType || (entry.kind === "ACTION" ? "DIALOGUE" : null);
        if (this.historyFilter === "CONVERSATIONS") return ["ACTION", "REACTION"].includes(entry.kind) && expressionType === "DIALOGUE";
        if (this.historyFilter === "THOUGHTS") return ["ACTION", "REACTION"].includes(entry.kind) && expressionType === "THOUGHT";
        if (this.historyFilter === "DEVIATIONS") return entry.kind === "ACTION" && entry.type !== "SCRIPTED";
        return true;
      });
    }

    renderGeneralHistory() {
      const records = this.filteredGeneralHistory();
      const visible = records.slice(0, this.historyVisibleCount);
      this.elements.historyList.innerHTML = visible.map((entry) => this.historyRecordMarkup(entry)).join("");
      this.elements.historyRange.textContent = records.length
        ? `MOSTRANDO 1–${visible.length} DE ${records.length} REGISTROS`
        : "NENHUM REGISTRO NESTE FILTRO";
      this.elements.loadMoreHistory.hidden = visible.length >= records.length;
    }

    historyRecordMarkup(entry) {
      const characters = this.historyState.characters;
      const character = entry.character ? characters[entry.character] : null;
      const source = entry.sourceCharacter ? characters[entry.sourceCharacter] : null;
      const color = character ? character.color : "#8c919b";
      const period = entry.periodLabel || Experiment.PERIODS[entry.period] || entry.period || "CONTEXTO";
      let speaker = character ? character.name.toUpperCase() : "AMBIENTE";
      let text = "";
      let detail = "";
      let kind = entry.kind;
      let kindClass = "";
      let contentClass = "";

      if (entry.kind === "ACTION") {
        const expressionType = entry.expressionType || "DIALOGUE";
        text = entry.dialogue;
        detail = `${entry.chosenActionLabel} · ${entry.type}${entry.type !== "SCRIPTED" ? " · esperado: " + entry.expectedActionLabel : ""}`;
        kind = expressionType === "THOUGHT" ? "PENSAMENTO" : expressionType === "NARRATION" ? "AÇÃO" : entry.type;
        kindClass = entry.type.toLowerCase();
        contentClass = expressionType === "THOUGHT" ? "thought" : "";
      } else if (entry.kind === "REACTION") {
        text = entry.text;
        detail = `${entry.expressionType === "THOUGHT" ? "Resposta interna" : "Resposta"} a ${source ? source.name : entry.sourceCharacter}`;
        kind = entry.expressionType === "THOUGHT" ? "PENSAMENTO" : "RESPOSTA";
        kindClass = entry.expressionType === "THOUGHT" ? "thought" : "";
        contentClass = entry.expressionType === "THOUGHT" ? "thought" : "";
      } else if (entry.kind === "EVENT") {
        speaker = "AMBIENTE";
        text = `${entry.title}. ${entry.description}`;
        detail = "Contexto externo";
        kind = "EVENTO";
      } else {
        speaker = "SISTEMA";
        text = entry.description || entry.title;
        detail = "Consolidação de memórias e estados";
        kind = "FIM DO DIA";
      }

      return `
        <article class="history-record ${entry.kind === "REACTION" ? "is-reaction" : ""} ${entry.kind === "EVENT" ? "is-event" : ""}" style="--record-color:${color}">
          <time>DIA ${Experiment.formatDay(entry.day)}<br>${this.escape(period)}</time>
          <strong class="history-speaker">${this.escape(speaker)}</strong>
          <div class="history-content"><p class="${contentClass}">${contentClass === "thought" ? "“" : ""}${this.escape(text)}${contentClass === "thought" ? "”" : ""}</p><small>${this.escape(detail)}</small></div>
          <span class="history-kind ${kindClass}">${this.escape(kind)}</span>
        </article>`;
    }

    scrollToLatest() {
      requestAnimationFrame(() => this.elements.scrollAnchor.scrollIntoView({ behavior: "smooth", block: "end" }));
    }

    showToast(message) {
      clearTimeout(this.toastTimer);
      this.elements.toast.textContent = message;
      this.elements.toast.classList.add("visible");
      this.toastTimer = setTimeout(() => this.elements.toast.classList.remove("visible"), 2800);
    }

    escape(value) {
      return String(value == null ? "" : value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  }

  Experiment.ExperimentUI = ExperimentUI;
})(window);
