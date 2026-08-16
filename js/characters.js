(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  const CHARACTER_TEMPLATES = {
    mae: {
      id: "mae",
      name: "Mãe",
      initials: "M",
      color: "#ff627d",
      goals: {
        careDaughter: 0.95,
        preserveFamily: 0.86,
        nurtureMarriage: 0.8
      },
      personality: {
        empathy: 0.84,
        conscientiousness: 0.78,
        resilience: 0.58,
        honesty: 0.72,
        impulsiveness: 0.22
      },
      states: {
        sadness: 12,
        happiness: 68,
        trustHusband: 88,
        anger: 5,
        energy: 76,
        concern: 18
      },
      relationships: {
        filha: { affection: 94, trust: 92, resentment: 1, tension: 4 },
        pai: { affection: 86, trust: 90, resentment: 3, tension: 7 },
        secretaria: { affection: 5, trust: 45, resentment: 2, tension: 5 }
      },
      displayStates: ["sadness", "trustHusband", "anger", "energy", "concern"]
    },
    filha: {
      id: "filha",
      name: "Filha",
      initials: "F",
      color: "#f3c94f",
      goals: {
        feelSafe: 0.94,
        receiveAttention: 0.88,
        keepRoutine: 0.82
      },
      personality: {
        sensitivity: 0.76,
        conscientiousness: 0.68,
        resilience: 0.48,
        autonomy: 0.38,
        empathy: 0.66
      },
      states: {
        happiness: 72,
        sadness: 9,
        insecurity: 14,
        concern: 10,
        trustParents: 92,
        hunger: 8,
        irritability: 10,
        schoolMotivation: 76,
        academicConfidence: 72
      },
      relationships: {
        mae: { affection: 95, trust: 94, resentment: 1, tension: 3 },
        pai: { affection: 90, trust: 91, resentment: 1, tension: 4 },
        secretaria: { affection: 5, trust: 40, resentment: 0, tension: 2 }
      },
      displayStates: ["happiness", "hunger", "irritability", "schoolMotivation", "academicConfidence"]
    },
    pai: {
      id: "pai",
      name: "Pai",
      initials: "P",
      color: "#62a7ff",
      goals: {
        preserveFamily: 0.92,
        work: 0.82,
        stability: 0.86,
        avoidConflict: 0.7
      },
      personality: {
        loyalty: 0.8,
        impulsiveness: 0.25,
        empathy: 0.7,
        honesty: 0.65,
        conscientiousness: 0.74,
        resilience: 0.62
      },
      states: {
        satisfaction: 65,
        attraction: 22,
        guilt: 5,
        familyLove: 88,
        frustration: 16,
        stress: 25,
        confidence: 72,
        fearConsequences: 24,
        hunger: 8
      },
      relationships: {
        mae: { affection: 88, trust: 91, resentment: 2, tension: 6 },
        filha: { affection: 94, trust: 93, resentment: 1, tension: 2 },
        secretaria: { affection: 20, trust: 54, resentment: 2, tension: 14 }
      },
      displayStates: ["guilt", "attraction", "hunger", "stress", "fearConsequences"]
    },
    secretaria: {
      id: "secretaria",
      name: "Secretária",
      initials: "S",
      color: "#b787ff",
      goals: {
        approachFather: 0.94,
        receiveAttention: 0.88,
        preserveDignity: 0.52
      },
      personality: {
        persistence: 0.8,
        impulsiveness: 0.6,
        empathy: 0.4,
        conscientiousness: 0.52,
        resilience: 0.56,
        honesty: 0.44
      },
      states: {
        interest: 78,
        frustration: 18,
        hope: 62,
        jealousy: 20,
        persistence: 76,
        encouragement: 18
      },
      relationships: {
        pai: { affection: 62, trust: 58, resentment: 3, tension: 22 },
        mae: { affection: 4, trust: 20, resentment: 7, tension: 18 },
        filha: { affection: 8, trust: 35, resentment: 0, tension: 3 }
      },
      displayStates: ["interest", "frustration", "hope", "encouragement", "persistence"]
    }
  };

  function createInitialCharacters() {
    const characters = Experiment.deepClone(CHARACTER_TEMPLATES);
    Object.values(characters).forEach((character) => {
      character.memories = [];
    });
    return characters;
  }

  function adjustState(character, stateName, delta) {
    if (!character || !(stateName in character.states)) return;
    character.states[stateName] = Experiment.round(Experiment.clamp(character.states[stateName] + delta));
  }

  function adjustRelationship(character, targetId, field, delta) {
    const relationship = character && character.relationships[targetId];
    if (!relationship || !(field in relationship)) return;
    relationship[field] = Experiment.round(Experiment.clamp(relationship[field] + delta));
  }

  Experiment.Characters = {
    templates: CHARACTER_TEMPLATES,
    createInitialCharacters,
    adjustState,
    adjustRelationship
  };
})(window);
