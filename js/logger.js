(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  const Logger = {
    action(state, payload) {
      state.meta.nextLogId += 1;
      const entry = {
        id: `log-${String(state.meta.nextLogId).padStart(7, "0")}`,
        kind: "ACTION",
        timestamp: state.meta.actionCount,
        day: state.day,
        period: payload.period,
        periodLabel: payload.periodLabel,
        character: payload.character,
        expectedAction: payload.decision.expectedAction,
        expectedActionLabel: payload.expectedActionLabel,
        chosenAction: payload.decision.chosenAction,
        chosenActionLabel: payload.chosenActionLabel,
        dialogue: payload.dialogue,
        expressionType: payload.expressionType || "DIALOGUE",
        type: payload.decision.decisionType,
        reasons: payload.decision.reasons,
        memoriesUsed: payload.decision.memoriesUsed,
        memoryDetails: payload.decision.memoryDetails,
        emotionalFactors: payload.decision.emotionalFactors,
        score: payload.decision.score,
        deterministicScore: payload.decision.deterministicScore,
        scoreMargin: payload.decision.scoreMargin,
        alternatives: payload.decision.alternatives,
        externalEvent: state.dailyContext.externalEvent,
        consequences: payload.consequences,
        memoriesCreated: payload.memoriesCreated,
        stateBefore: payload.stateBefore,
        stateAfter: payload.stateAfter,
        routineSnapshot: payload.routineSnapshot || null,
        narrativeSource: payload.narrativeSource || "LOCAL_FALLBACK"
      };
      state.history.push(entry);
      return entry;
    },

    reaction(state, payload) {
      state.meta.nextLogId += 1;
      const entry = {
        id: `log-${String(state.meta.nextLogId).padStart(7, "0")}`,
        kind: "REACTION",
        timestamp: state.meta.actionCount,
        day: state.day,
        period: payload.period,
        periodLabel: payload.periodLabel,
        character: payload.character,
        sourceCharacter: payload.sourceCharacter,
        sourceAction: payload.sourceAction,
        expressionType: payload.expressionType || "THOUGHT",
        text: payload.text,
        reasons: payload.reasons || [],
        stateSnapshot: payload.stateSnapshot || {},
        narrativeSource: payload.narrativeSource || "LOCAL_FALLBACK"
      };
      state.history.push(entry);
      return entry;
    },

    event(state, payload) {
      state.meta.nextLogId += 1;
      const entry = {
        id: `log-${String(state.meta.nextLogId).padStart(7, "0")}`,
        kind: "EVENT",
        timestamp: state.meta.actionCount,
        day: state.day,
        period: payload.period || "CONTEXTO",
        title: payload.title,
        description: payload.description,
        eventId: payload.eventId,
        tags: payload.tags || [],
        consequences: payload.consequences || []
      };
      state.history.push(entry);
      return entry;
    },

    dayEnd(state, payload) {
      state.meta.nextLogId += 1;
      const entry = {
        id: `log-${String(state.meta.nextLogId).padStart(7, "0")}`,
        kind: "DAY_END",
        timestamp: state.meta.actionCount,
        day: state.day,
        period: "FIM_DIA",
        title: `Fim do dia ${state.day}`,
        description: payload.description,
        memoryConsolidation: payload.memoryConsolidation,
        stateSnapshot: payload.stateSnapshot
      };
      state.history.push(entry);
      return entry;
    },

    stats(state) {
      return state.history.reduce((stats, entry) => {
        if (entry.kind !== "ACTION") return stats;
        stats.actions += 1;
        if (entry.type === "SCRIPTED") stats.scripted += 1;
        if (entry.type === "ADAPTIVE") stats.adaptive += 1;
        if (entry.type === "EMERGENT") stats.emergent += 1;
        if (entry.type !== "SCRIPTED") stats.deviations += 1;
        return stats;
      }, { actions: 0, scripted: 0, adaptive: 0, emergent: 0, deviations: 0 });
    }
  };

  Experiment.Logger = Logger;
})(window);
