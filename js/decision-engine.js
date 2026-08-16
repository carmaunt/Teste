(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  class DecisionProvider {
    decide() {
      throw new Error("DecisionProvider.decide precisa ser implementado.");
    }
  }

  class LocalDecisionProvider extends DecisionProvider {
    scoreCandidate(character, context, action, expectedAction, rng) {
      let deterministicScore = action.baseScore || 0;
      const reasons = [];
      const emotionalFactors = [];
      let causalStrength = 0;

      const record = (label, contribution, category, key) => {
        deterministicScore += contribution;
        if (contribution < 3.25) return;
        causalStrength += contribution;
        reasons.push({ label, contribution: Experiment.round(contribution), category, key });
        if (category === "emotion") {
          emotionalFactors.push({
            state: key,
            label: Experiment.STATE_LABELS[key] || key,
            value: character.states[key],
            contribution: Experiment.round(contribution)
          });
        }
      };

      if (action.id === expectedAction) {
        const routine = character.personality.conscientiousness || 0.55;
        const contribution = 16 + routine * 14;
        deterministicScore += contribution;
        reasons.push({ label: "o roteiro ainda é coerente com sua rotina", contribution, category: "script" });
      }

      (action.goals || []).forEach((goalName) => {
        const weight = character.goals[goalName];
        if (!weight) return;
        record(`objetivo: ${this.humanizeGoal(goalName)}`, weight * 7, "goal", goalName);
      });

      Object.entries(action.stateWeights || {}).forEach(([stateName, weight]) => {
        const value = character.states[stateName];
        if (value == null) return;
        const contribution = weight >= 0 ? (value / 100) * weight : ((100 - value) / 100) * Math.abs(weight);
        const direction = weight >= 0 ? "nível alto" : "nível baixo";
        record(`${direction} de ${(Experiment.STATE_LABELS[stateName] || stateName).toLowerCase()} (${Experiment.round(value)})`, contribution, "emotion", stateName);
      });

      Object.entries(action.traitWeights || {}).forEach(([traitName, weight]) => {
        const value = character.personality[traitName];
        if (value == null) return;
        const contribution = weight >= 0 ? value * weight : (1 - value) * Math.abs(weight);
        const direction = weight >= 0 ? "elevada" : "baixa";
        record(`${Experiment.TRAIT_LABELS[traitName] || traitName} ${direction}`, contribution, "personality", traitName);
      });

      (action.relationshipWeights || []).forEach((driver) => {
        const targetId = driver.target;
        const relationship = character.relationships[targetId];
        if (!relationship || relationship[driver.field] == null) return;
        const value = relationship[driver.field];
        const contribution = driver.weight >= 0
          ? (value / 100) * driver.weight
          : ((100 - value) / 100) * Math.abs(driver.weight);
        const target = context.characters[targetId];
        const direction = driver.weight >= 0 ? "elevado" : "baixo";
        record(`${Experiment.RELATION_LABELS[driver.field] || driver.field} ${direction} por ${target ? target.name.toLowerCase() : targetId}`, contribution, "relationship", driver.field);
      });

      const recalled = Experiment.MemoryStore.recall(character, context, action);
      recalled.forEach((item) => {
        record(`lembrança: ${item.memory.description}`, item.influence, "memory", item.memory.id);
      });

      const eventTags = new Set((context.externalEvent && context.externalEvent.tags) || []);
      Object.entries(action.eventWeights || {}).forEach(([tag, weight]) => {
        if (eventTags.has(tag)) record(`contexto: ${context.externalEvent.title.toLowerCase()}`, weight, "event", tag);
      });

      Object.entries(action.factWeights || {}).forEach(([fact, weight]) => {
        if (context.facts[fact]) record(this.humanizeFact(fact), weight, "fact", fact);
      });

      const anticipatedUtility = this.anticipatedUtility(character, context, action);
      record(anticipatedUtility.label, anticipatedUtility.score, "consequence", action.id);

      if (action.id !== expectedAction) {
        const recentRepetitions = character.memories.filter((memory) => memory.event === action.id && context.day - memory.day <= 3).length;
        deterministicScore -= Math.min(30, recentRepetitions * (action.repetitionPenalty || 8));
      }

      const noise = rng.between(-3.2, 3.2);
      const total = deterministicScore + noise;
      const memoryReasons = reasons.filter((reason) => reason.category === "memory");

      return {
        action,
        total,
        deterministicScore,
        noise,
        causalStrength,
        reasons,
        emotionalFactors,
        memoriesUsed: recalled
          .filter((item) => memoryReasons.some((reason) => reason.key === item.memory.id) || item.influence >= 1)
          .map((item) => item.memory)
      };
    }

    anticipatedUtility(character, context, action) {
      const positiveStates = new Set(["happiness", "satisfaction", "confidence", "energy", "familyLove", "trustParents", "trustHusband", "hope", "schoolMotivation", "academicConfidence", "encouragement"]);
      const negativeStates = new Set(["sadness", "anger", "concern", "insecurity", "guilt", "frustration", "stress", "fearConsequences", "jealousy", "hunger", "irritability"]);
      const positiveRelations = new Set(["affection", "trust"]);
      const negativeRelations = new Set(["resentment", "tension"]);
      let score = 0;

      (action.effects || []).forEach((effect) => {
        const valence = positiveStates.has(effect.state) ? 1 : negativeStates.has(effect.state) ? -1 : 0;
        if (!valence) return;
        const targetId = effect.character === "self" ? character.id : effect.character;
        if (targetId === character.id) {
          score += effect.delta * valence * 0.13;
          return;
        }
        const affection = character.relationships[targetId] ? character.relationships[targetId].affection / 100 : 0.35;
        score += effect.delta * valence * (character.personality.empathy || 0.5) * affection * 0.11;
      });

      (action.relationEffects || []).forEach((effect) => {
        const valence = positiveRelations.has(effect.field) ? 1 : negativeRelations.has(effect.field) ? -1 : 0;
        if (!valence) return;
        const ownership = effect.character === character.id ? 1 : (character.personality.empathy || 0.5) * 0.6;
        score += effect.delta * valence * ownership * 0.09;
      });

      const bounded = Experiment.clamp(score, -8, 8);
      return {
        score: bounded,
        label: bounded >= 0 ? "consequências esperadas compatíveis com seus objetivos" : "custos emocionais esperados"
      };
    }

    decide(character, context, expectedAction, candidates, rng) {
      if (!candidates.length) throw new Error(`Nenhuma ação disponível para ${character.id}.`);

      const scored = candidates
        .map((candidate) => this.scoreCandidate(character, context, candidate, expectedAction, rng))
        .sort((a, b) => b.total - a.total);
      const chosen = scored[0];
      const expected = scored.find((item) => item.action.id === expectedAction);
      let decisionType = "SCRIPTED";

      if (chosen.action.id !== expectedAction) {
        const evidenceBeyondChance = chosen.deterministicScore > (expected ? expected.deterministicScore : -Infinity);
        const hasAccumulatedCause = chosen.emotionalFactors.some((item) => item.contribution >= 7)
          || chosen.memoriesUsed.some((memory) => memory.importance >= 5)
          || chosen.reasons.some((reason) => ["fact", "event"].includes(reason.category) && reason.contribution >= 5);
        decisionType = chosen.action.novelty === "emergent" && evidenceBeyondChance && hasAccumulatedCause
          ? "EMERGENT"
          : "ADAPTIVE";
      }

      const rankedReasons = chosen.reasons
        .filter((reason) => reason.category !== "script" || decisionType === "SCRIPTED")
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 4)
        .map((reason) => reason.label);

      if (!rankedReasons.length) rankedReasons.push("preferência compatível com o estado interno atual");

      return {
        chosenAction: chosen.action.id,
        expectedAction,
        decisionType,
        reasons: rankedReasons,
        memoriesUsed: chosen.memoriesUsed.map((memory) => memory.id),
        memoryDetails: chosen.memoriesUsed.map((memory) => ({
          id: memory.id,
          day: memory.day,
          description: memory.description,
          importance: memory.importance
        })),
        emotionalFactors: chosen.emotionalFactors,
        score: Experiment.round(chosen.total, 2),
        deterministicScore: Experiment.round(chosen.deterministicScore, 2),
        scoreMargin: Experiment.round(chosen.total - (scored[1] ? scored[1].total : 0), 2),
        alternatives: scored.slice(0, 4).map((item) => ({
          action: item.action.id,
          score: Experiment.round(item.total, 2),
          deterministicScore: Experiment.round(item.deterministicScore, 2)
        }))
      };
    }

    humanizeGoal(goal) {
      const labels = {
        careDaughter: "cuidar da filha",
        preserveFamily: "preservar a família",
        nurtureMarriage: "cultivar o casamento",
        feelSafe: "sentir segurança",
        receiveAttention: "receber atenção",
        keepRoutine: "manter a rotina",
        work: "trabalhar",
        stability: "manter estabilidade",
        avoidConflict: "evitar conflitos",
        approachFather: "aproximar-se do pai",
        preserveDignity: "preservar a própria dignidade"
      };
      return labels[goal] || goal;
    }

    humanizeFact(fact) {
      const labels = {
        affairOccurred: "há uma aproximação íntima a esconder",
        affairKnown: "a confiança familiar foi rompida",
        suspicionActive: "existem sinais recentes de comportamento incomum",
        motherAwakeLate: "a mãe acordou tarde",
        daughterReadyLate: "a filha se atrasou na arrumação",
        breakfastAvailable: "há café disponível em casa",
        breakfastUnavailable: "não há café pronto em casa",
        daughterSkippedBreakfast: "a filha saiu sem comer",
        daughterAteBreakfast: "a filha tomou café da manhã",
        fatherSkippedBreakfast: "o pai saiu de casa em jejum",
        fatherAteBreakfast: "o pai tomou café em casa",
        schoolArrivalLate: "a filha chegou atrasada à escola",
        schoolConflict: "houve uma briga antes da apresentação",
        scentDetectedToday: "a mãe percebeu um perfume estranho na roupa do marido",
        previousDayGoodGrade: "a boa nota do dia anterior trouxe alívio à casa",
        previousDayLowGrade: "a nota baixa do dia anterior aumentou a preocupação da mãe"
      };
      return labels[fact] || fact;
    }
  }

  class DecisionEngine {
    constructor(provider) {
      this.provider = provider || new LocalDecisionProvider();
    }

    decide(character, context, expectedAction, candidates, rng) {
      return this.provider.decide(character, context, expectedAction, candidates, rng);
    }

    setProvider(provider) {
      if (!provider || typeof provider.decide !== "function") {
        throw new TypeError("O provedor precisa implementar decide().");
      }
      this.provider = provider;
    }
  }

  Experiment.DecisionProvider = DecisionProvider;
  Experiment.LocalDecisionProvider = LocalDecisionProvider;
  Experiment.DecisionEngine = DecisionEngine;
})(window);
