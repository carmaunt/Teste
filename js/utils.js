(function (global) {
  "use strict";

  const Experiment = global.Experiment = global.Experiment || {};

  class SeededRandom {
    constructor(seed, state) {
      this.seed = SeededRandom.normalizeSeed(seed);
      this.state = Number.isInteger(state) ? state >>> 0 : this.seed;
    }

    static normalizeSeed(value) {
      const numeric = Number.parseInt(String(value), 10);
      if (Number.isFinite(numeric)) return (Math.abs(numeric) || 1) >>> 0;

      let hash = 2166136261;
      String(value).split("").forEach((character) => {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      });
      return (hash || 1) >>> 0;
    }

    next() {
      this.state = (this.state + 0x6D2B79F5) >>> 0;
      let result = this.state;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    }

    between(min, max) {
      return min + (max - min) * this.next();
    }

    integer(min, max) {
      return Math.floor(this.between(min, max + 1));
    }

    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    }
  }

  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 1) => Number(value.toFixed(digits));
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const formatDay = (day) => String(day).padStart(2, "0");

  const STATE_LABELS = {
    sadness: "Tristeza",
    happiness: "Felicidade",
    trustHusband: "Confiança no marido",
    anger: "Raiva",
    energy: "Disposição",
    concern: "Preocupação",
    insecurity: "Insegurança",
    trustParents: "Confiança nos pais",
    satisfaction: "Satisfação",
    attraction: "Atração",
    guilt: "Culpa",
    familyLove: "Amor pela família",
    frustration: "Frustração",
    stress: "Estresse",
    confidence: "Confiança",
    fearConsequences: "Medo das consequências",
    interest: "Interesse",
    hope: "Esperança",
    jealousy: "Ciúme",
    persistence: "Insistência",
    hunger: "Fome",
    irritability: "Irritabilidade",
    schoolMotivation: "Motivação escolar",
    academicConfidence: "Confiança acadêmica",
    encouragement: "Incentivo percebido"
  };

  const TRAIT_LABELS = {
    loyalty: "lealdade",
    impulsiveness: "impulsividade",
    empathy: "empatia",
    honesty: "honestidade",
    conscientiousness: "apego à rotina",
    resilience: "resiliência",
    persistence: "persistência",
    sensitivity: "sensibilidade",
    autonomy: "autonomia"
  };

  const RELATION_LABELS = {
    affection: "afeto",
    trust: "confiança",
    resentment: "ressentimento",
    tension: "tensão"
  };

  Object.assign(Experiment, {
    SeededRandom,
    clamp,
    round,
    deepClone,
    formatDay,
    STATE_LABELS,
    TRAIT_LABELS,
    RELATION_LABELS
  });
})(window);
