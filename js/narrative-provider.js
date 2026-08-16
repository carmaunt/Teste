(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  class NarrativeProvider {
    async health() {
      return { available: false, source: "LOCAL_FALLBACK", label: "Modo local" };
    }

    async enrich() {
      throw new Error("NarrativeProvider.enrich precisa ser implementado.");
    }
  }

  class AINarrativeProvider extends NarrativeProvider {
    constructor(endpoint) {
      super();
      this.endpoint = endpoint || "/api/narrate";
      this.model = null;
    }

    async health() {
      const response = await global.fetch("/api/health", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Servidor narrativo indisponível.");
      const status = await response.json();
      this.model = status.model || null;
      return {
        available: Boolean(status.aiConfigured),
        source: status.aiConfigured ? "OPENAI" : "LOCAL_FALLBACK",
        label: status.aiConfigured ? `IA · ${status.model}` : "IA sem chave"
      };
    }

    buildTurn(result, state) {
      const action = result.entries.find((entry) => entry.kind === "ACTION");
      if (!action) return null;
      const reaction = result.entries.find((entry) => entry.kind === "REACTION");
      const actor = state.characters[action.character];
      const reactor = reaction ? state.characters[reaction.character] : null;
      const actionIndex = state.history.findIndex((entry) => entry.id === action.id);
      const recentHistory = state.history
        .slice(0, actionIndex < 0 ? state.history.length : actionIndex)
        .filter((entry) => ["ACTION", "REACTION"].includes(entry.kind))
        .slice(-6)
        .map((entry) => ({
          character: state.characters[entry.character] ? state.characters[entry.character].name : entry.character,
          expressionType: entry.expressionType,
          text: entry.kind === "ACTION" ? entry.dialogue : entry.text
        }));

      return {
        turnId: action.id,
        day: action.day,
        period: action.periodLabel,
        actor: { id: actor.id, name: actor.name, states: action.stateAfter.states, personality: actor.personality },
        action: {
          id: action.chosenAction,
          label: action.chosenActionLabel,
          expressionType: action.expressionType,
          decisionType: action.type,
          expected: action.expectedActionLabel,
          reasons: action.reasons,
          consequences: action.consequences
        },
        reaction: reaction ? {
          required: true,
          character: { id: reactor.id, name: reactor.name, states: reaction.stateSnapshot, personality: reactor.personality },
          expressionType: reaction.expressionType,
          reasons: reaction.reasons
        } : { required: false, character: null, expressionType: "NONE", reasons: [] },
        routine: action.routineSnapshot || state.dailyContext.routine,
        externalEvent: action.externalEvent,
        memories: action.memoryDetails || [],
        recentHistory
      };
    }

    async enrich(result, state) {
      const turn = this.buildTurn(result, state);
      if (!turn) return result;
      const response = await global.fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ turn })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Falha na IA narrativa (${response.status}).`);
      if (!payload.actionText || typeof payload.actionText !== "string") throw new Error("A IA retornou uma cena inválida.");

      const action = result.entries.find((entry) => entry.kind === "ACTION");
      const reaction = result.entries.find((entry) => entry.kind === "REACTION");
      action.dialogue = payload.actionText.trim();
      action.narrativeSource = "OPENAI";
      action.narrativeModel = payload.model || this.model;
      if (reaction) {
        if (!payload.reactionText || typeof payload.reactionText !== "string") throw new Error("A IA não gerou a resposta obrigatória.");
        reaction.text = payload.reactionText.trim();
        reaction.narrativeSource = "OPENAI";
        reaction.narrativeModel = payload.model || this.model;
      }
      return result;
    }
  }

  class LocalNarrativeProvider extends NarrativeProvider {
    async enrich(result) {
      result.entries.forEach((entry) => {
        if (["ACTION", "REACTION"].includes(entry.kind)) entry.narrativeSource = "LOCAL_FALLBACK";
      });
      return result;
    }
  }

  Experiment.NarrativeProvider = NarrativeProvider;
  Experiment.AINarrativeProvider = AINarrativeProvider;
  Experiment.LocalNarrativeProvider = LocalNarrativeProvider;
})(window);
