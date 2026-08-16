(function (global) {
  "use strict";

  const Experiment = global.Experiment;
  const { adjustState, adjustRelationship } = Experiment.Characters;

  const PERIODS = {
    MANHA_CASA: "MANHÃ · CASA",
    DESLOCAMENTO: "DESLOCAMENTO",
    TRABALHO_ESCOLA: "TRABALHO / ESCOLA",
    TARDE: "TARDE",
    NOITE: "NOITE · CASA",
    FIM_DIA: "FIM DO DIA"
  };

  const DAILY_PLAN = [
    { period: "MANHA_CASA", character: "mae", expectedAction: "acordar_no_horario", candidates: ["acordar_cedo", "acordar_no_horario", "acordar_tarde"] },
    { period: "MANHA_CASA", character: "mae", expectedAction: "preparar_filha", candidates: ["preparar_filha", "preparar_distante", "pedir_autonomia", "permanecer_cama"] },
    { period: "MANHA_CASA", character: "filha", expectedAction: "cooperar_rotina", candidates: ["cooperar_rotina", "pedir_atencao", "arrumar_sozinha", "recusar_rotina"] },
    { period: "MANHA_CASA", character: "mae", expectedAction: "preparar_cafe_completo", candidates: ["preparar_cafe_completo", "preparar_cafe_rapido", "nao_preparar_cafe"] },
    { period: "MANHA_CASA", character: "filha", expectedAction: "tomar_cafe_manha", candidates: ["tomar_cafe_manha", "comer_as_pressas", "sair_sem_comer"] },
    { period: "MANHA_CASA", character: "pai", expectedAction: "tomar_cafe_casa", candidates: ["tomar_cafe_casa", "cafe_rapido_casa", "sair_sem_cafe"] },
    { period: "MANHA_CASA", character: "pai", expectedAction: "despedir_familia", candidates: ["despedir_familia", "demonstrar_afeto", "sair_apressado", "evitar_olhares"] },
    { period: "DESLOCAMENTO", character: "filha", expectedAction: "ir_escola", candidates: ["ir_escola", "hesitar_escola", "pedir_para_ficar"] },
    { period: "DESLOCAMENTO", character: "pai", expectedAction: "ir_trabalho", candidates: ["ir_trabalho", "adiar_ida", "trabalhar_de_casa"] },
    { period: "TRABALHO_ESCOLA", character: "secretaria", expectedAction: "oferecer_cafe_profissional", candidates: ["oferecer_cafe_profissional", "oferecer_cafe_pessoal", "nao_oferecer_cafe"] },
    { period: "TRABALHO_ESCOLA", character: "pai", expectedAction: "recusar_cafe_secretaria", candidates: ["recusar_cafe_secretaria", "aceitar_cafe_secretaria", "aceitar_cafe_e_conversar"] },
    { period: "TRABALHO_ESCOLA", character: "secretaria", expectedAction: "aproximar_pai", candidates: ["aproximar_pai", "conversa_profissional", "insistir", "flertar_abertamente", "recuar"] },
    { period: "TRABALHO_ESCOLA", character: "pai", expectedAction: "resistir_secretaria", candidates: ["resistir_secretaria", "conversar_secretaria", "evitar_secretaria", "flertar", "ceder", "confrontar_secretaria"] },
    { period: "TRABALHO_ESCOLA", character: "filha", expectedAction: "conviver_bem_escola", candidates: ["conviver_bem_escola", "discutir_na_escola", "pedir_ajuda_na_escola"] },
    { period: "TRABALHO_ESCOLA", character: "filha", expectedAction: "apresentar_bem_trabalho", candidates: ["apresentar_bem_trabalho", "apresentar_com_dificuldade", "nao_apresentar_trabalho"] },
    { period: "TRABALHO_ESCOLA", character: "mae", expectedAction: "cuidar_casa", candidates: ["cuidar_casa", "ruminar_preocupacao", "buscar_apoio", "descansar"] },
    { period: "TARDE", character: "filha", expectedAction: "voltar_casa_escola", candidates: ["voltar_casa_escola", "demorar_volta", "ligar_para_mae"] },
    { period: "TARDE", character: "mae", expectedAction: "receber_filha", candidates: ["receber_filha", "conversar_filha", "receber_distante", "pedir_espaco_filha"] },
    { period: "TARDE", character: "secretaria", expectedAction: "encerrar_expediente", candidates: ["encerrar_expediente", "prolongar_expediente", "enviar_mensagem", "silenciar_contato"] },
    { period: "NOITE", character: "pai", expectedAction: "voltar_casa", candidates: ["voltar_casa", "demonstrar_afeto_familia", "adiar_volta", "confessar_esposa"] },
    { period: "NOITE", character: "mae", expectedAction: "acolher_marido", candidates: ["acolher_marido", "questionar_marido", "afastar_marido", "elogiar_marido"] },
    { period: "NOITE", character: "filha", expectedAction: "interagir_pais", candidates: ["interagir_pais", "buscar_seguranca", "evitar_conflito", "isolar_quarto"] }
  ];

  function define(id, actor, label, options) {
    return Object.assign({
      id,
      actor,
      label,
      baseScore: 8,
      novelty: "adaptive",
      dialogues: [label],
      tags: [],
      stateWeights: {},
      traitWeights: {},
      relationshipWeights: [],
      memoryWeights: {},
      eventWeights: {},
      factWeights: {},
      available: null,
      repetitionPenalty: 8,
      expressionType: null,
      goals: [],
      effects: [],
      relationEffects: []
    }, options || {});
  }

  const ACTIONS = {
    acordar_cedo: define("acordar_cedo", "mae", "Acordar antes do horário", {
      baseScore: 13, stateWeights: { energy: 24, happiness: 10, sadness: -12, anger: -10 }, traitWeights: { conscientiousness: 15 }, factWeights: { previousDayGoodGrade: 24 },
      tags: ["morning", "early", "routine"], expressionType: "THOUGHT", dialogues: ["Acordei antes do despertador. Posso começar o dia sem pressa."], special: "mother_wake_early"
    }),
    acordar_no_horario: define("acordar_no_horario", "mae", "Acordar no horário", {
      baseScore: 15, goals: ["careDaughter", "preserveFamily"], stateWeights: { energy: 13, happiness: 5, sadness: -6 }, traitWeights: { conscientiousness: 16 },
      tags: ["morning", "on_time", "routine"], expressionType: "THOUGHT", dialogues: ["O despertador tocou. É hora de colocar a casa em movimento."], special: "mother_wake_on_time"
    }),
    acordar_tarde: define("acordar_tarde", "mae", "Acordar tarde", {
      baseScore: 1, novelty: "emergent", stateWeights: { sadness: 42, anger: 22, energy: -42, concern: 13 }, traitWeights: { resilience: -18, conscientiousness: -10 },
      memoryWeights: { exhaustion: 2.5, family_tension: 2.2, betrayal: 3 }, factWeights: { affairKnown: 13 },
      available: (state, actor) => actor.states.sadness >= 52 || actor.states.anger >= 58 || actor.states.energy <= 42 || state.facts.previousDayLowGrade,
      tags: ["morning", "late", "exhaustion", "family_tension"], expressionType: "THOUGHT", dialogues: ["Passei do horário. Meu corpo simplesmente não respondeu ao despertador."], special: "mother_wake_late"
    }),

    preparar_cafe_completo: define("preparar_cafe_completo", "mae", "Preparar café para a família", {
      baseScore: 15, goals: ["careDaughter", "preserveFamily"], stateWeights: { energy: 18, happiness: 8, sadness: -10, anger: -8 }, traitWeights: { conscientiousness: 16, empathy: 10 },
      factWeights: { motherAwakeEarly: 12, motherAwakeOnTime: 7 }, available: (state, actor) => !(state.facts.motherAwakeLate && (actor.states.sadness >= 82 || actor.states.anger >= 80 || actor.states.energy <= 25)), tags: ["breakfast", "care", "family_warmth"], target: "filha",
      dialogues: ["O café está pronto. Sentem um pouco antes de sair."], special: "breakfast_full"
    }),
    preparar_cafe_rapido: define("preparar_cafe_rapido", "mae", "Improvisar um café rápido", {
      baseScore: 20, stateWeights: { concern: 16, energy: -12 }, traitWeights: { conscientiousness: 13 }, factWeights: { motherAwakeLate: 55, daughterReadyLate: 25 },
      available: (state, actor) => state.facts.motherAwakeLate && actor.states.sadness < 82 && actor.states.anger < 80 && actor.states.energy > 25, tags: ["breakfast", "rush", "care"], target: "filha", dialogues: ["Não dá para sentar hoje. Levem alguma coisa no caminho."], special: "breakfast_quick"
    }),
    nao_preparar_cafe: define("nao_preparar_cafe", "mae", "Não conseguir preparar o café", {
      baseScore: 0, novelty: "emergent", stateWeights: { sadness: 34, anger: 25, energy: -36, concern: 10 }, traitWeights: { resilience: -16 },
      memoryWeights: { exhaustion: 2.2, family_tension: 1.8 }, factWeights: { motherAwakeLate: 18 }, available: (state, actor) => state.facts.motherAwakeLate && (actor.states.sadness >= 58 || actor.states.anger >= 62 || actor.states.energy <= 38), tags: ["breakfast", "absence", "exhaustion"], target: "filha",
      dialogues: ["Hoje eu não consegui preparar nada. Vocês vão precisar sair assim."], special: "breakfast_none"
    }),
    tomar_cafe_manha: define("tomar_cafe_manha", "filha", "Tomar café da manhã", {
      baseScore: 15, goals: ["keepRoutine"], stateWeights: { hunger: 18, schoolMotivation: 8 }, traitWeights: { conscientiousness: 12 }, factWeights: { breakfastAvailable: 24, daughterReadyOnTime: 9 },
      available: (state) => Boolean(state.facts.breakfastAvailable), tags: ["breakfast", "school", "routine"], target: "mae", dialogues: ["Vou comer antes de sair. Ainda temos alguns minutos."], special: "daughter_breakfast_full"
    }),
    comer_as_pressas: define("comer_as_pressas", "filha", "Comer às pressas", {
      baseScore: 12, stateWeights: { hunger: 22, concern: 12 }, factWeights: { quickBreakfast: 50, daughterReadyLate: 25, motherAwakeLate: 10 },
      available: (state) => Boolean(state.facts.breakfastAvailable), tags: ["breakfast", "rush", "school"], target: "mae", dialogues: ["Vou comer só um pouco no caminho para não perder mais tempo."], special: "daughter_breakfast_quick"
    }),
    sair_sem_comer: define("sair_sem_comer", "filha", "Sair de casa com fome", {
      baseScore: 1, novelty: "adaptive", stateWeights: { concern: 18, irritability: 6 }, factWeights: { breakfastUnavailable: 45, daughterReadyLate: 24, motherAwakeLate: 14 },
      tags: ["hunger", "late", "school_problem"], expressionType: "THOUGHT", dialogues: ["Não dá mais tempo. Vou para a escola sem comer."], special: "daughter_skips_breakfast"
    }),
    tomar_cafe_casa: define("tomar_cafe_casa", "pai", "Tomar café em casa", {
      baseScore: 15, goals: ["preserveFamily", "stability"], stateWeights: { hunger: 17, familyLove: 10 }, traitWeights: { conscientiousness: 11 }, factWeights: { breakfastAvailable: 22, motherAwakeEarly: 6 },
      available: (state) => Boolean(state.facts.breakfastAvailable), tags: ["breakfast", "family_warmth", "boundary"], target: "mae", dialogues: ["Vou tomar café com vocês antes de sair."], special: "father_breakfast_full"
    }),
    cafe_rapido_casa: define("cafe_rapido_casa", "pai", "Tomar um café rápido em casa", {
      baseScore: 13, stateWeights: { hunger: 20, stress: 12 }, factWeights: { quickBreakfast: 52, motherAwakeLate: 18 },
      available: (state) => Boolean(state.facts.breakfastAvailable), tags: ["breakfast", "rush"], target: "mae", dialogues: ["Só tenho tempo para alguns goles, mas não vou sair em jejum."], special: "father_breakfast_quick"
    }),
    sair_sem_cafe: define("sair_sem_cafe", "pai", "Sair sem tomar café", {
      baseScore: 2, novelty: "adaptive", stateWeights: { stress: 18, frustration: 9 }, factWeights: { breakfastUnavailable: 42, motherAwakeLate: 16 },
      tags: ["hunger", "rush", "work_pressure"], expressionType: "THOUGHT", dialogues: ["Vou ter de tomar café no trabalho. Não posso me atrasar mais."], special: "father_skips_breakfast"
    }),

    oferecer_cafe_profissional: define("oferecer_cafe_profissional", "secretaria", "Oferecer café de modo profissional", {
      baseScore: 15, goals: ["approachFather"], stateWeights: { interest: 10, encouragement: 12 }, traitWeights: { conscientiousness: 12 },
      tags: ["coffee", "professional", "secretary_approach"], target: "pai", dialogues: ["Trouxe café. Quer uma xícara antes da reunião?"], special: "secretary_coffee_offer"
    }),
    oferecer_cafe_pessoal: define("oferecer_cafe_pessoal", "secretaria", "Usar o café para se aproximar", {
      baseScore: 4, novelty: "adaptive", goals: ["approachFather"], stateWeights: { interest: 18, hope: 17, encouragement: 36, persistence: 12 }, traitWeights: { persistence: 16, impulsiveness: 10 },
      memoryWeights: { coffee_accepted: 3, conversation: 1.8 }, tags: ["coffee", "flirt", "secretary_approach"], target: "pai", dialogues: ["Fiz o café do jeito que você gosta. Pensei que poderíamos conversar um pouco."], special: "secretary_coffee_offer_close"
    }),
    nao_oferecer_cafe: define("nao_oferecer_cafe", "secretaria", "Manter distância no café", {
      baseScore: 3, stateWeights: { frustration: 22, hope: -28, encouragement: -25 }, memoryWeights: { rejection: 2.5 }, tags: ["coffee", "withdrawal", "boundary"],
      expressionType: "THOUGHT", dialogues: ["Hoje não vou oferecer nada. Quero ver se ele nota minha distância."], special: "secretary_keeps_distance"
    }),
    recusar_cafe_secretaria: define("recusar_cafe_secretaria", "pai", "Recusar o café da secretária", {
      baseScore: 15, goals: ["preserveFamily", "work"], stateWeights: { familyLove: 17, hunger: -20, attraction: -10 }, traitWeights: { loyalty: 20 }, factWeights: { fatherAteBreakfast: 28 },
      tags: ["coffee", "rejection", "boundary"], target: "secretaria", dialogues: ["Obrigado, mas já tomei café em casa. Vamos direto à reunião."], special: "father_rejects_coffee"
    }),
    aceitar_cafe_secretaria: define("aceitar_cafe_secretaria", "pai", "Aceitar o café por educação", {
      baseScore: 14, novelty: "adaptive", stateWeights: { hunger: 48, stress: 9, attraction: 8 }, traitWeights: { empathy: 14 }, factWeights: { fatherSkippedBreakfast: 66 }, available: (state, actor) => actor.states.hunger >= 28,
      tags: ["coffee", "conversation", "ambiguity"], target: "secretaria", dialogues: ["Aceito, obrigado. Só preciso voltar ao trabalho logo depois."], special: "father_accepts_coffee"
    }),
    aceitar_cafe_e_conversar: define("aceitar_cafe_e_conversar", "pai", "Aceitar o café e prolongar a conversa", {
      baseScore: 15, novelty: "emergent", stateWeights: { hunger: 36, attraction: 45, stress: 12, familyLove: -14 }, traitWeights: { impulsiveness: 17 }, factWeights: { fatherSkippedBreakfast: 62 },
      memoryWeights: { coffee_accepted: 4, flirt: 2 }, available: (state, actor) => actor.states.hunger >= 40 && actor.states.attraction >= 27, tags: ["coffee", "conversation", "secretary_approach", "ambiguity"], target: "secretaria", dialogues: ["Posso ficar alguns minutos. Como foi sua noite?"], special: "father_accepts_coffee_and_talks"
    }),

    conviver_bem_escola: define("conviver_bem_escola", "filha", "Conviver bem com os colegas", {
      baseScore: 15, goals: ["keepRoutine", "feelSafe"], stateWeights: { happiness: 10, hunger: -18, irritability: -20, schoolMotivation: 10 }, traitWeights: { empathy: 14 }, factWeights: { daughterAteBreakfast: 18, schoolArrivalOnTime: 8 },
      tags: ["school", "cooperation", "school_safe"], target: null, expressionType: "NARRATION", dialogues: ["Ela participa da atividade com os colegas sem transformar os desacordos em conflito."], special: "daughter_school_calm"
    }),
    discutir_na_escola: define("discutir_na_escola", "filha", "Brigar com um colega", {
      baseScore: 0, novelty: "emergent", stateWeights: { hunger: 41, irritability: 46, insecurity: 15, sadness: 10 }, traitWeights: { resilience: -14 }, factWeights: { daughterSkippedBreakfast: 28, schoolArrivalLate: 12 },
      available: (state, actor) => actor.states.hunger >= 42 && actor.states.irritability >= 42, tags: ["school", "conflict", "school_problem", "hunger"], target: null, dialogues: ["Para de mexer no meu trabalho! Eu já disse que não foi minha culpa."], special: "daughter_school_fight"
    }),
    pedir_ajuda_na_escola: define("pedir_ajuda_na_escola", "filha", "Pedir ajuda antes de discutir", {
      baseScore: 5, novelty: "adaptive", stateWeights: { irritability: 20, insecurity: 18, schoolMotivation: 12 }, traitWeights: { resilience: 14, empathy: 10 }, factWeights: { daughterSkippedBreakfast: 12 },
      tags: ["school", "help", "self_regulation"], target: null, dialogues: ["Professora, eu estou irritada e não quero brigar. Posso sair um minuto?"], special: "daughter_seeks_school_help"
    }),
    apresentar_bem_trabalho: define("apresentar_bem_trabalho", "filha", "Apresentar bem o trabalho", {
      baseScore: 15, goals: ["keepRoutine"], stateWeights: { academicConfidence: 22, schoolMotivation: 15, hunger: -18, irritability: -13 }, traitWeights: { conscientiousness: 15 }, factWeights: { daughterAteBreakfast: 14, schoolArrivalOnTime: 10, schoolMorningCalm: 9 },
      tags: ["school", "presentation", "good_grade"], expressionType: "NARRATION", dialogues: ["Ela apresenta o trabalho com clareza e responde às perguntas da turma."], special: "presentation_good"
    }),
    apresentar_com_dificuldade: define("apresentar_com_dificuldade", "filha", "Apresentar o trabalho com dificuldade", {
      baseScore: 15, novelty: "adaptive", stateWeights: { insecurity: 20, hunger: 32, irritability: 20, concern: 12 }, factWeights: { daughterSkippedBreakfast: 40, schoolArrivalLate: 20, schoolConflict: 20 },
      tags: ["school", "presentation", "low_grade"], expressionType: "NARRATION", dialogues: ["Ela perde partes da apresentação e tem dificuldade para organizar o que ensaiou."], special: "presentation_difficult"
    }),
    nao_apresentar_trabalho: define("nao_apresentar_trabalho", "filha", "Não conseguir apresentar o trabalho", {
      baseScore: 0, novelty: "emergent", stateWeights: { insecurity: 36, hunger: 25, irritability: 24, sadness: 18, schoolMotivation: -22 }, traitWeights: { resilience: -17 }, factWeights: { schoolConflict: 28, schoolArrivalLate: 12 },
      memoryWeights: { school_problem: 2.4, low_grade: 2 }, available: (state, actor) => state.facts.schoolConflict || actor.states.schoolMotivation <= 34 || actor.states.insecurity >= 60, tags: ["school", "presentation", "low_grade", "withdrawal"], expressionType: "THOUGHT", dialogues: ["Não vou conseguir apresentar. Quero desaparecer daqui."], special: "presentation_missed"
    }),

    preparar_filha: define("preparar_filha", "mae", "Preparar a filha para a escola", {
      baseScore: 15, goals: ["careDaughter"], stateWeights: { energy: 15, happiness: 6 }, traitWeights: { empathy: 18 },
      relationshipWeights: [{ target: "filha", field: "affection", weight: 10 }],
      memoryWeights: { family_warmth: 1.2, daughter_need: 1.3 }, tags: ["care", "daughter", "routine", "family_warmth"], target: "filha",
      dialogues: ["Filha, acorde. Separei sua roupa e o café já está na mesa.", "Bom dia, meu amor. Vamos começar devagar, mas sem perder a hora."],
      effects: [{ character: "filha", state: "trustParents", delta: 0.8 }, { character: "self", state: "energy", delta: -1 }], special: "prepare_daughter_supported"
    }),
    preparar_distante: define("preparar_distante", "mae", "Cumprir a rotina de forma distante", {
      baseScore: 9, goals: ["careDaughter"], stateWeights: { sadness: 26, concern: 14, energy: -12 }, traitWeights: { conscientiousness: 12 },
      memoryWeights: { family_tension: 1.8, betrayal: 2.2 }, tags: ["care", "daughter", "distance", "family_tension"], target: "filha",
      dialogues: ["Sua roupa está na cadeira. O café está pronto.", "Está tudo preparado. Preciso de um pouco de silêncio agora."],
      effects: [{ character: "filha", state: "insecurity", delta: 2 }, { character: "filha", state: "happiness", delta: -1.5 }], special: "prepare_daughter_distant"
    }),
    pedir_autonomia: define("pedir_autonomia", "mae", "Pedir que a filha se arrume sozinha", {
      baseScore: 7, stateWeights: { concern: 12, energy: -28, sadness: 20 }, traitWeights: { resilience: -8 },
      relationshipWeights: [{ target: "filha", field: "trust", weight: 9 }], memoryWeights: { exhaustion: 2, family_tension: 1.2 },
      tags: ["daughter", "autonomy", "exhaustion"], target: "filha",
      dialogues: ["Hoje preciso que você escolha a roupa e arrume a mochila sozinha, está bem?", "Você consegue se preparar hoje? Eu preciso recuperar o fôlego."],
      effects: [{ character: "filha", state: "insecurity", delta: 2.5 }, { character: "self", state: "energy", delta: 2 }], special: "prepare_daughter_autonomous"
    }),
    permanecer_cama: define("permanecer_cama", "mae", "Permanecer na cama", {
      baseScore: 1, novelty: "emergent", stateWeights: { sadness: 34, energy: -30, anger: 14 }, traitWeights: { resilience: -14 },
      memoryWeights: { betrayal: 2.8, family_tension: 1.5, exhaustion: 2.2 }, factWeights: { affairKnown: 14 },
      tags: ["withdrawal", "exhaustion", "family_tension"], target: "filha",
      dialogues: ["Eu ouvi o despertador... mas hoje não consigo levantar.", "Filha, me desculpe. Hoje você vai precisar começar sem mim."],
      effects: [{ character: "filha", state: "insecurity", delta: 7 }, { character: "filha", state: "sadness", delta: 5 }, { character: "self", state: "energy", delta: 3 }], special: "prepare_daughter_absent"
    }),

    cooperar_rotina: define("cooperar_rotina", "filha", "Cooperar com a rotina da manhã", {
      baseScore: 14, goals: ["keepRoutine", "feelSafe"], stateWeights: { happiness: 10, trustParents: 12 }, traitWeights: { conscientiousness: 14 },
      relationshipWeights: [{ target: "mae", field: "trust", weight: 9 }], memoryWeights: { care: 1.2, family_warmth: 1 },
      tags: ["routine", "mother", "safety"], target: "mae", dialogues: ["Já estou levantando. Posso levar a blusa amarela?", "Estou pronta, mãe. Só falta fechar a mochila."],
      effects: [{ character: "mae", state: "happiness", delta: 1 }, { character: "self", state: "happiness", delta: 0.5 }], special: "daughter_ready_cooperative"
    }),
    pedir_atencao: define("pedir_atencao", "filha", "Pedir mais atenção à mãe", {
      baseScore: 8, goals: ["receiveAttention", "feelSafe"], stateWeights: { insecurity: 30, concern: 24, sadness: 16 }, traitWeights: { sensitivity: 14 },
      memoryWeights: { distance: 2.2, family_tension: 1.7, mother: 1 }, tags: ["attention", "mother", "daughter_need"], target: "mae",
      dialogues: ["Mãe, você pode olhar para mim um pouquinho? Está tudo bem?", "Antes de eu sair... você pode ficar aqui comigo só mais um minuto?"],
      effects: [{ character: "mae", state: "concern", delta: 3 }, { character: "self", state: "insecurity", delta: -1 }], special: "daughter_ready_delayed"
    }),
    arrumar_sozinha: define("arrumar_sozinha", "filha", "Arrumar-se sozinha", {
      baseScore: 7, goals: ["keepRoutine"], stateWeights: { insecurity: 10, trustParents: -8 }, traitWeights: { autonomy: 24, resilience: 10 },
      memoryWeights: { autonomy: 2, exhaustion: 1.2 }, tags: ["autonomy", "routine"], dialogues: ["Eu consigo fazer sozinha hoje.", "Pode deixar. Vou arrumar tudo sem chamar ninguém."],
      effects: [{ character: "self", state: "insecurity", delta: -0.5 }, { character: "self", state: "happiness", delta: -0.5 }], special: "daughter_ready_autonomous"
    }),
    recusar_rotina: define("recusar_rotina", "filha", "Recusar a rotina", {
      baseScore: 1, novelty: "emergent", stateWeights: { insecurity: 36, sadness: 30, concern: 22, happiness: -14 }, traitWeights: { resilience: -15 },
      memoryWeights: { family_tension: 2.6, betrayal: 1.5, school_problem: 1.8 }, factWeights: { affairKnown: 12 }, tags: ["refusal", "insecurity"], target: "mae",
      dialogues: ["Eu não quero fingir que está tudo normal.", "Não vou me arrumar até alguém me explicar o que está acontecendo."],
      effects: [{ character: "mae", state: "concern", delta: 5 }, { character: "self", state: "insecurity", delta: 2 }], special: "daughter_ready_refusal"
    }),

    despedir_familia: define("despedir_familia", "pai", "Despedir-se da família", {
      baseScore: 14, goals: ["preserveFamily", "work"], stateWeights: { familyLove: 16, satisfaction: 5 }, traitWeights: { loyalty: 15, conscientiousness: 8 },
      relationshipWeights: [{ target: "mae", field: "affection", weight: 9 }], memoryWeights: { family_warmth: 1.1 }, tags: ["family_warmth", "routine", "family"], target: "mae",
      dialogues: ["Tenham um bom dia. Volto para o jantar.", "Até mais tarde. Me mandem mensagem se precisarem de alguma coisa."],
      effects: [{ character: "mae", state: "trustHusband", delta: 0.6 }, { character: "filha", state: "trustParents", delta: 0.5 }]
    }),
    demonstrar_afeto: define("demonstrar_afeto", "pai", "Demonstrar afeto antes de sair", {
      baseScore: 9, goals: ["preserveFamily"], stateWeights: { familyLove: 22, guilt: 24, fearConsequences: 8 }, traitWeights: { empathy: 12 },
      memoryWeights: { family_tension: 1.2, guilt: 1.7, family_warmth: 1 }, tags: ["family_warmth", "affection", "family"], target: "mae",
      dialogues: ["Venham cá vocês duas. Eu precisava deste abraço antes de sair.", "Eu sei que ando distraído. Amo vocês."],
      effects: [{ character: "mae", state: "trustHusband", delta: 1 }, { character: "filha", state: "happiness", delta: 2 }, { character: "self", state: "guilt", delta: 1 }]
    }),
    sair_apressado: define("sair_apressado", "pai", "Sair apressado", {
      baseScore: 8, stateWeights: { stress: 26, frustration: 14, guilt: 8 }, traitWeights: { empathy: -10 }, eventWeights: { work_stress: 12 },
      memoryWeights: { work_pressure: 2, family_tension: 1 }, tags: ["distance", "work_pressure", "stress"],
      dialogues: ["Estou atrasado. A gente conversa à noite.", "Preciso ir — hoje o trabalho não vai esperar."],
      effects: [{ character: "mae", state: "concern", delta: 2 }, { character: "filha", state: "insecurity", delta: 1 }]
    }),
    evitar_olhares: define("evitar_olhares", "pai", "Evitar o olhar da família", {
      baseScore: 2, novelty: "emergent", stateWeights: { guilt: 42, fearConsequences: 28, stress: 10 }, traitWeights: { honesty: -16 },
      memoryWeights: { affair: 3, betrayal: 1.8, secret: 2.5 }, factWeights: { affairOccurred: 22, affairKnown: -62 }, tags: ["distance", "secret", "suspicion"], target: "mae",
      dialogues: ["Eu... preciso ir. Depois falamos.", "Até mais tarde.", "Não quero me atrasar."],
      effects: [{ character: "mae", state: "concern", delta: 5 }], special: "raise_suspicion"
    }),

    ir_escola: define("ir_escola", "filha", "Ir à escola", {
      baseScore: 14, goals: ["keepRoutine"], stateWeights: { happiness: 5, trustParents: 7 }, traitWeights: { conscientiousness: 15 },
      memoryWeights: { school_safe: 1, routine: .6 }, expressionType: "NARRATION", tags: ["school", "routine", "school_safe"], dialogues: ["A filha entra na escola antes do sinal.", "Ela segue para a sala pensando no trabalho em grupo."],
      effects: [{ character: "self", state: "happiness", delta: 0.4 }], special: "daughter_goes_school"
    }),
    hesitar_escola: define("hesitar_escola", "filha", "Hesitar antes de ir à escola", {
      baseScore: 8, stateWeights: { insecurity: 25, concern: 22, sadness: 12 }, traitWeights: { sensitivity: 12 },
      memoryWeights: { school_problem: 2.5, family_tension: 1 }, eventWeights: { school_stress: 11 }, tags: ["school", "hesitation", "insecurity"], target: "mae",
      dialogues: ["Eu posso ficar mais um pouco? Não estou com vontade de entrar.", "Mãe, promete que vai estar aqui quando eu voltar?"],
      effects: [{ character: "mae", state: "concern", delta: 2 }, { character: "self", state: "insecurity", delta: 1 }], special: "daughter_delays_school"
    }),
    pedir_para_ficar: define("pedir_para_ficar", "filha", "Pedir para não ir à escola", {
      baseScore: 1, novelty: "emergent", stateWeights: { insecurity: 38, sadness: 30, concern: 25 }, traitWeights: { resilience: -18 },
      memoryWeights: { school_problem: 3, family_tension: 2.3 }, eventWeights: { school_stress: 16 }, factWeights: { affairKnown: 8 }, tags: ["school_refusal", "insecurity"], target: "mae",
      dialogues: ["Por favor, deixa eu ficar em casa hoje.", "Eu não consigo entrar. Minha barriga dói só de pensar."],
      effects: [{ character: "mae", state: "concern", delta: 6 }, { character: "self", state: "insecurity", delta: 3 }], special: "daughter_delays_school"
    }),

    ir_trabalho: define("ir_trabalho", "pai", "Ir ao trabalho", {
      baseScore: 15, goals: ["work", "stability"], stateWeights: { confidence: 7 }, traitWeights: { conscientiousness: 18 },
      memoryWeights: { work_success: 1, routine: .5 }, expressionType: "NARRATION", tags: ["work", "routine"], dialogues: ["O pai segue para o escritório e inicia uma manhã cheia.", "Ele chega ao trabalho decidido a terminar o relatório."],
      effects: [{ character: "self", state: "stress", delta: 0.5 }]
    }),
    adiar_ida: define("adiar_ida", "pai", "Adiar a ida ao trabalho", {
      baseScore: 5, stateWeights: { stress: 24, frustration: 18, guilt: 10 }, traitWeights: { conscientiousness: -16 },
      memoryWeights: { work_pressure: 1.7, family_tension: 1.3 }, eventWeights: { work_stress: 10 }, tags: ["avoidance", "work"],
      dialogues: ["Vou esperar um pouco antes de sair.", "Talvez eu chegue mais tarde hoje. Preciso organizar a cabeça."],
      effects: [{ character: "self", state: "stress", delta: -2 }, { character: "self", state: "satisfaction", delta: -1 }]
    }),
    trabalhar_de_casa: define("trabalhar_de_casa", "pai", "Decidir trabalhar de casa", {
      baseScore: 3, novelty: "emergent", goals: ["work", "preserveFamily"], stateWeights: { familyLove: 10, guilt: 26, stress: 15 }, traitWeights: { conscientiousness: 8 },
      memoryWeights: { family_tension: 2.2, affair: 1.5 }, factWeights: { affairKnown: 14 }, tags: ["work", "family", "adaptation"],
      dialogues: ["Vou trabalhar daqui hoje. Acho melhor ficar por perto.", "Cancelei a ida ao escritório. Consigo resolver tudo de casa."],
      effects: [{ character: "mae", state: "concern", delta: -1 }, { character: "self", state: "stress", delta: -2 }]
    }),

    resistir_secretaria: define("resistir_secretaria", "pai", "Rejeitar a aproximação da secretária", {
      baseScore: 14, goals: ["preserveFamily", "stability"], stateWeights: { familyLove: 18, guilt: 12, fearConsequences: 8 }, traitWeights: { loyalty: 22, empathy: 5 },
      relationshipWeights: [{ target: "mae", field: "affection", weight: 8 }], memoryWeights: { secretary_approach: 1.2, family_warmth: 1.1, rejection: .8 },
      tags: ["rejection", "boundary", "secretary_approach", "loyalty"], target: "secretaria",
      dialogues: ["Prefiro manter nossa relação estritamente profissional.", "Não quero alimentar esse tipo de conversa. Vamos voltar ao trabalho."],
      effects: [{ character: "self", state: "attraction", delta: -1 }, { character: "self", state: "confidence", delta: 1 }, { character: "secretaria", state: "frustration", delta: 5 }, { character: "secretaria", state: "hope", delta: -3 }],
      relationEffects: [{ character: "secretaria", target: "pai", field: "resentment", delta: 2 }], special: "father_rejects_secretary"
    }),
    conversar_secretaria: define("conversar_secretaria", "pai", "Prolongar a conversa com a secretária", {
      baseScore: 19, stateWeights: { attraction: 30, stress: 9, frustration: 12, satisfaction: -7 }, traitWeights: { impulsiveness: 12 },
      relationshipWeights: [{ target: "secretaria", field: "affection", weight: 11 }], memoryWeights: { secretary_approach: 2, flirt: 2, rejection: .5 }, eventWeights: { work_stress: 5 },
      tags: ["secretary_approach", "conversation", "ambiguity"], target: "secretaria",
      dialogues: ["Podemos conversar mais um pouco... mas só por alguns minutos.", "Eu deveria voltar ao trabalho, mas quero ouvir o resto."],
      effects: [{ character: "self", state: "attraction", delta: 3 }, { character: "self", state: "guilt", delta: 2 }, { character: "secretaria", state: "hope", delta: 5 }], special: "small_evidence"
    }),
    evitar_secretaria: define("evitar_secretaria", "pai", "Evitar a secretária", {
      baseScore: 8, stateWeights: { guilt: 24, fearConsequences: 20, stress: 9 }, traitWeights: { loyalty: 11 },
      memoryWeights: { flirt: 2.4, affair: 2.7, secretary_approach: 1 }, factWeights: { affairOccurred: 10 }, tags: ["avoidance", "secretary", "guilt"], target: "secretaria",
      dialogues: ["Vou trabalhar na sala de reuniões hoje.", "Se precisar de mim, envie por e-mail. Preciso ficar sozinho."],
      effects: [{ character: "self", state: "attraction", delta: -2 }, { character: "secretaria", state: "frustration", delta: 3 }, { character: "secretaria", state: "hope", delta: -2 }]
    }),
    flertar: define("flertar", "pai", "Flertar com a secretária", {
      baseScore: 3, novelty: "emergent", stateWeights: { attraction: 43, frustration: 17, stress: 8, familyLove: -18 }, traitWeights: { impulsiveness: 22, loyalty: -16 },
      relationshipWeights: [{ target: "secretaria", field: "affection", weight: 12 }], memoryWeights: { flirt: 3, secretary_approach: 2.2, family_tension: 1.2 },
      eventWeights: { work_stress: 4 }, factWeights: { affairKnown: -38 }, tags: ["flirt", "secretary_approach", "secret"], target: "secretaria",
      dialogues: ["Você sabe que torna estes dias difíceis um pouco mais leves.", "Talvez eu goste mais da sua companhia do que deveria."],
      effects: [{ character: "self", state: "attraction", delta: 7 }, { character: "self", state: "guilt", delta: 6 }, { character: "self", state: "fearConsequences", delta: 3 }, { character: "secretaria", state: "hope", delta: 9 }], special: "medium_evidence"
    }),
    ceder: define("ceder", "pai", "Ceder à aproximação da secretária", {
      baseScore: 0, novelty: "emergent", stateWeights: { attraction: 56, frustration: 18, stress: 7, familyLove: -29, fearConsequences: -9 }, traitWeights: { impulsiveness: 27, loyalty: -23 },
      relationshipWeights: [{ target: "secretaria", field: "affection", weight: 15 }], memoryWeights: { flirt: 3.6, secretary_approach: 2.4, family_tension: 1.8 },
      factWeights: { affairKnown: -85 }, tags: ["affair", "betrayal", "secret", "flirt"], target: "secretaria",
      dialogues: ["Eu sei que deveria parar... mas não vou me afastar agora.", "Por um instante, ele abandona o limite que vinha tentando sustentar."],
      effects: [{ character: "self", state: "attraction", delta: 10 }, { character: "self", state: "guilt", delta: 24 }, { character: "self", state: "fearConsequences", delta: 20 }, { character: "secretaria", state: "hope", delta: 18 }, { character: "secretaria", state: "frustration", delta: -12 }],
      relationEffects: [{ character: "pai", target: "secretaria", field: "affection", delta: 14 }, { character: "secretaria", target: "pai", field: "affection", delta: 10 }], special: "affair"
    }),
    confrontar_secretaria: define("confrontar_secretaria", "pai", "Confrontar a insistência da secretária", {
      baseScore: 5, stateWeights: { frustration: 30, stress: 15, fearConsequences: 9 }, traitWeights: { honesty: 10, impulsiveness: 8 },
      memoryWeights: { rejection: 2, secretary_approach: 1.8 }, tags: ["confrontation", "boundary", "rejection"], target: "secretaria",
      dialogues: ["Eu já deixei meu limite claro. Você precisa respeitá-lo.", "Isso está interferindo no trabalho. Essa aproximação termina aqui."],
      effects: [{ character: "secretaria", state: "frustration", delta: 9 }, { character: "secretaria", state: "hope", delta: -8 }, { character: "self", state: "stress", delta: 3 }]
    }),

    aproximar_pai: define("aproximar_pai", "secretaria", "Criar aproximação com o pai", {
      baseScore: 12, goals: ["approachFather", "receiveAttention"], stateWeights: { interest: 18, hope: 14, persistence: 10 }, traitWeights: { persistence: 15 },
      relationshipWeights: [{ target: "pai", field: "affection", weight: 10 }], memoryWeights: { conversation: 1.2, connection: 1.2 },
      tags: ["secretary_approach", "connection"], target: "pai", dialogues: ["Você parece tenso hoje. Quer tomar um café e conversar?", "Guardei um café para você. Pensei que pudesse precisar."],
      effects: [{ character: "pai", state: "attraction", delta: 1.5 }, { character: "self", state: "hope", delta: 0.8 }], special: "small_evidence"
    }),
    conversa_profissional: define("conversa_profissional", "secretaria", "Manter a conversa profissional", {
      baseScore: 8, goals: ["preserveDignity"], stateWeights: { frustration: 13, hope: -13 }, traitWeights: { empathy: 12, conscientiousness: 14 },
      memoryWeights: { rejection: 2.2, confrontation: 2.3 }, tags: ["professional", "boundary"], target: "pai",
      dialogues: ["A agenda da tarde está pronta. Enviei os documentos por e-mail.", "Vamos nos concentrar na reunião. Aqui está o resumo."],
      effects: [{ character: "pai", state: "attraction", delta: -0.5 }, { character: "self", state: "frustration", delta: -1 }]
    }),
    insistir: define("insistir", "secretaria", "Insistir apesar das rejeições", {
      baseScore: 2, novelty: "emergent", goals: ["approachFather"], stateWeights: { frustration: 39, persistence: 26, jealousy: 14, hope: 8, encouragement: 42 }, traitWeights: { persistence: 20, impulsiveness: 8 },
      memoryWeights: { rejection: 3.4, confrontation: 2.4, secretary_approach: 1 }, factWeights: { affairKnown: -16 }, available: (state, actor) => actor.states.encouragement >= 30 || actor.states.frustration >= 65, tags: ["secretary_approach", "insistence", "flirt"], target: "pai",
      dialogues: ["Você diz que não, mas continua prestando atenção em mim.", "Não vou fingir que não existe algo entre nós só porque é mais fácil."],
      effects: [{ character: "pai", state: "attraction", delta: 4 }, { character: "pai", state: "stress", delta: 2 }, { character: "self", state: "hope", delta: 3 }, { character: "self", state: "frustration", delta: 2 }], special: "medium_evidence"
    }),
    flertar_abertamente: define("flertar_abertamente", "secretaria", "Flertar abertamente", {
      baseScore: 3, novelty: "emergent", goals: ["approachFather"], stateWeights: { interest: 29, hope: 20, jealousy: 12 }, traitWeights: { impulsiveness: 23, persistence: 9 },
      relationshipWeights: [{ target: "pai", field: "affection", weight: 12 }], memoryWeights: { flirt: 3.1, conversation: 2, connection: 1.8 }, factWeights: { affairKnown: -28 }, tags: ["flirt", "secretary_approach", "secret"], target: "pai",
      dialogues: ["Se você não fosse casado, eu não deixaria esta conversa terminar aqui.", "Eu penso em você fora daqui. Agora você sabe."],
      effects: [{ character: "pai", state: "attraction", delta: 7 }, { character: "pai", state: "guilt", delta: 3 }, { character: "self", state: "hope", delta: 6 }], special: "medium_evidence"
    }),
    recuar: define("recuar", "secretaria", "Recuar da aproximação", {
      baseScore: 3, stateWeights: { frustration: 19, hope: -23 }, traitWeights: { empathy: 12, resilience: 10 },
      memoryWeights: { rejection: 3, confrontation: 3.2 }, tags: ["withdrawal", "boundary", "rejection"], target: "pai",
      dialogues: ["Entendi. Daqui em diante, apenas trabalho.", "Não vou insistir hoje. Preciso me afastar um pouco."],
      effects: [{ character: "pai", state: "stress", delta: -2 }, { character: "self", state: "frustration", delta: -3 }, { character: "self", state: "hope", delta: -4 }]
    }),

    participar_aula: define("participar_aula", "filha", "Participar da aula", {
      baseScore: 13, goals: ["keepRoutine"], stateWeights: { happiness: 8, concern: -7 }, traitWeights: { conscientiousness: 15 },
      memoryWeights: { school_safe: 1 }, expressionType: "NARRATION", tags: ["school", "routine", "school_safe"], dialogues: ["A filha se oferece para ler a próxima parte da atividade.", "Ela termina o exercício e ajuda o restante do grupo."],
      effects: [{ character: "self", state: "happiness", delta: 1 }, { character: "self", state: "concern", delta: -1 }]
    }),
    distrair_preocupada: define("distrair_preocupada", "filha", "Distrair-se com preocupações", {
      baseScore: 7, stateWeights: { concern: 29, insecurity: 24, sadness: 13 }, traitWeights: { sensitivity: 14 }, memoryWeights: { family_tension: 2.4, distance: 1.5 },
      eventWeights: { school_stress: 7 }, factWeights: { affairKnown: 8 }, tags: ["school", "concern", "family_tension"],
      dialogues: ["Desculpa, professora. Eu não ouvi a pergunta.", "Ela olha para a mesma linha do caderno sem conseguir avançar."],
      effects: [{ character: "self", state: "concern", delta: 2 }, { character: "self", state: "happiness", delta: -1 }]
    }),
    procurar_orientadora: define("procurar_orientadora", "filha", "Procurar ajuda na escola", {
      baseScore: 2, novelty: "emergent", goals: ["feelSafe"], stateWeights: { concern: 34, insecurity: 28, sadness: 20 }, traitWeights: { resilience: 10, autonomy: 8 },
      memoryWeights: { family_tension: 2.7, school_problem: 2.1, betrayal: 1.5 }, factWeights: { affairKnown: 11 }, tags: ["school", "help", "insecurity"],
      dialogues: ["Posso falar com a orientadora? As coisas em casa estão estranhas.", "Eu não sei explicar direito, mas preciso conversar com um adulto."],
      effects: [{ character: "self", state: "concern", delta: -3 }, { character: "self", state: "insecurity", delta: -2 }]
    }),

    cuidar_casa: define("cuidar_casa", "mae", "Cuidar da casa", {
      baseScore: 13, goals: ["preserveFamily"], stateWeights: { energy: 13, happiness: 4 }, traitWeights: { conscientiousness: 17 }, memoryWeights: { routine: .5 },
      expressionType: "NARRATION", tags: ["home", "routine"], dialogues: ["A casa fica silenciosa. Ela organiza a manhã cômodo por cômodo.", "Ela abre as janelas e segue a lista habitual de tarefas."],
      effects: [{ character: "self", state: "energy", delta: -1 }]
    }),
    ruminar_preocupacao: define("ruminar_preocupacao", "mae", "Ruminar as próprias preocupações", {
      baseScore: 6, stateWeights: { concern: 30, sadness: 25, anger: 13, energy: -10 }, traitWeights: { resilience: -11 }, memoryWeights: { suspicion: 2.8, family_tension: 2, betrayal: 2.7 },
      factWeights: { suspicionActive: 15, affairKnown: 14 }, expressionType: "THOUGHT", tags: ["rumination", "concern", "suspicion"],
      dialogues: ["Por que ele parece tão distante? Preciso entender o que mudou.", "Quanto mais silêncio há nesta casa, mais altas ficam as minhas perguntas."],
      effects: [{ character: "self", state: "concern", delta: 3 }, { character: "self", state: "sadness", delta: 2 }, { character: "self", state: "energy", delta: -2 }]
    }),
    buscar_apoio: define("buscar_apoio", "mae", "Buscar apoio fora de casa", {
      baseScore: 4, novelty: "emergent", stateWeights: { concern: 27, sadness: 28, energy: 6 }, traitWeights: { honesty: 14, resilience: 10 },
      memoryWeights: { family_tension: 2.5, betrayal: 2.8 }, factWeights: { affairKnown: 12 }, expressionType: "NARRATION", tags: ["help", "honesty", "family_tension"],
      dialogues: ["Ela liga para uma amiga: ‘Você tem alguns minutos para me ouvir?’", "Em vez de guardar tudo, ela decide contar a alguém como se sente."],
      effects: [{ character: "self", state: "sadness", delta: -3 }, { character: "self", state: "concern", delta: -2 }, { character: "self", state: "energy", delta: 2 }]
    }),
    descansar: define("descansar", "mae", "Interromper as tarefas para descansar", {
      baseScore: 7, stateWeights: { energy: -28, sadness: 12, concern: 10 }, traitWeights: { resilience: 7 }, memoryWeights: { exhaustion: 2 },
      expressionType: "NARRATION", tags: ["rest", "exhaustion"], dialogues: ["As tarefas podem esperar. Ela se senta e respira por alguns minutos.", "Ela deixa a lista de lado e tenta recuperar a disposição."],
      effects: [{ character: "self", state: "energy", delta: 5 }, { character: "self", state: "concern", delta: -1 }]
    }),

    voltar_casa_escola: define("voltar_casa_escola", "filha", "Voltar para casa", {
      baseScore: 14, goals: ["keepRoutine", "feelSafe"], stateWeights: { trustParents: 9 }, traitWeights: { conscientiousness: 13 }, memoryWeights: { family_warmth: 1 },
      tags: ["home", "routine"], target: "mae", dialogues: ["Cheguei! Deixei os sapatos na entrada.", "Mãe, voltei. Tenho uma coisa da escola para mostrar."], effects: [{ character: "self", state: "happiness", delta: 0.5 }]
    }),
    demorar_volta: define("demorar_volta", "filha", "Demorar para voltar para casa", {
      baseScore: 4, stateWeights: { insecurity: 22, concern: 20, sadness: 13 }, traitWeights: { autonomy: 12 }, memoryWeights: { family_tension: 2.4, school_problem: 1.2 },
      factWeights: { affairKnown: 9 }, expressionType: "NARRATION", tags: ["avoidance", "home", "insecurity"], dialogues: ["Ela dá uma volta maior no quarteirão antes de seguir para casa.", "Ela permanece alguns minutos no portão, adiando a volta."],
      effects: [{ character: "mae", state: "concern", delta: 4 }, { character: "self", state: "insecurity", delta: 1 }]
    }),
    ligar_para_mae: define("ligar_para_mae", "filha", "Ligar para a mãe antes de voltar", {
      baseScore: 7, goals: ["feelSafe", "receiveAttention"], stateWeights: { insecurity: 26, concern: 18 }, traitWeights: { sensitivity: 10 }, memoryWeights: { distance: 2, family_tension: 1.5 },
      tags: ["attention", "mother", "daughter_need"], target: "mae", dialogues: ["Mãe, estou saindo. Você vai estar em casa quando eu chegar?", "Eu só queria ouvir sua voz antes de voltar."],
      effects: [{ character: "mae", state: "concern", delta: 1 }, { character: "self", state: "insecurity", delta: -1 }]
    }),

    receber_filha: define("receber_filha", "mae", "Receber a filha", {
      baseScore: 14, goals: ["careDaughter"], stateWeights: { energy: 11, happiness: 8 }, traitWeights: { empathy: 17 }, relationshipWeights: [{ target: "filha", field: "affection", weight: 10 }],
      memoryWeights: { daughter_need: 1.4, family_warmth: 1 }, tags: ["care", "daughter", "family_warmth"], target: "filha",
      dialogues: ["Como foi seu dia? Vem me contar enquanto preparo o lanche.", "Que bom que você chegou. Eu estava esperando por você."],
      effects: [{ character: "filha", state: "happiness", delta: 2 }, { character: "filha", state: "insecurity", delta: -1 }], special: "mother_receives_grade"
    }),
    conversar_filha: define("conversar_filha", "mae", "Conversar francamente com a filha", {
      baseScore: 7, goals: ["careDaughter"], stateWeights: { concern: 24, sadness: 12 }, traitWeights: { empathy: 18, honesty: 12 }, memoryWeights: { daughter_need: 2.5, family_tension: 1.8 },
      factWeights: { affairKnown: 7 }, tags: ["daughter", "honesty", "attention"], target: "filha", dialogues: ["Percebi que você está preocupada. Vamos conversar sem pressa?", "Se as coisas parecerem estranhas, você pode me perguntar. Eu estou aqui."],
      effects: [{ character: "filha", state: "insecurity", delta: -3 }, { character: "filha", state: "trustParents", delta: 1 }, { character: "self", state: "concern", delta: -1 }], special: "mother_receives_grade"
    }),
    receber_distante: define("receber_distante", "mae", "Receber a filha de forma distante", {
      baseScore: 5, stateWeights: { sadness: 27, anger: 16, concern: 10, energy: -14 }, memoryWeights: { betrayal: 2.4, family_tension: 1.5 }, factWeights: { affairKnown: 13 },
      tags: ["distance", "daughter", "family_tension"], target: "filha", dialogues: ["Oi, filha. O lanche está na cozinha.", "Ela responde ao cumprimento, mas não consegue sustentar a conversa."],
      effects: [{ character: "filha", state: "insecurity", delta: 3 }, { character: "filha", state: "sadness", delta: 2 }], special: "mother_receives_grade"
    }),
    pedir_espaco_filha: define("pedir_espaco_filha", "mae", "Pedir espaço à filha", {
      baseScore: 1, novelty: "emergent", stateWeights: { sadness: 36, anger: 24, energy: -25 }, traitWeights: { resilience: -14 }, memoryWeights: { betrayal: 3, family_tension: 2 },
      factWeights: { affairKnown: 18 }, tags: ["withdrawal", "daughter", "family_tension"], target: "filha", dialogues: ["Eu amo você, mas agora preciso ficar sozinha.", "Não é culpa sua. Só não consigo conversar neste momento."],
      effects: [{ character: "filha", state: "insecurity", delta: 6 }, { character: "filha", state: "sadness", delta: 4 }, { character: "self", state: "energy", delta: 1 }], special: "mother_receives_grade"
    }),

    encerrar_expediente: define("encerrar_expediente", "secretaria", "Encerrar o expediente", {
      baseScore: 14, stateWeights: { frustration: 5 }, traitWeights: { conscientiousness: 18 }, memoryWeights: { professional: 1 }, tags: ["work", "routine"],
      expressionType: "NARRATION", dialogues: ["Ela fecha o computador e deixa o escritório no horário habitual.", "O expediente termina. Ela reúne as coisas e vai embora."], effects: [{ character: "self", state: "frustration", delta: -0.5 }]
    }),
    prolongar_expediente: define("prolongar_expediente", "secretaria", "Prolongar o expediente", {
      baseScore: 6, stateWeights: { hope: 23, interest: 18, persistence: 12 }, traitWeights: { persistence: 13 }, memoryWeights: { flirt: 2.2, connection: 1.7 },
      tags: ["secretary_approach", "work", "waiting"], target: "pai", dialogues: [{ type: "DIALOGUE", text: "Ainda tenho algo para terminar. Posso ficar mais um pouco." }, { type: "NARRATION", text: "Ela espera o corredor esvaziar antes de pensar em ir embora." }],
      effects: [{ character: "self", state: "frustration", delta: 1 }, { character: "pai", state: "stress", delta: 0.5 }], special: "small_evidence"
    }),
    enviar_mensagem: define("enviar_mensagem", "secretaria", "Enviar uma mensagem pessoal ao pai", {
      baseScore: 0, novelty: "emergent", stateWeights: { hope: 15, interest: 16, jealousy: 6 }, traitWeights: { impulsiveness: 12, persistence: 7 }, memoryWeights: { flirt: 3.2, connection: 1.8, rejection: .6 }, factWeights: { affairKnown: -22 },
      tags: ["message", "secretary_approach", "secret"], target: "pai", dialogues: ["‘Ainda estou pensando na nossa conversa.’ Ela envia antes de mudar de ideia.", "A mensagem não fala de trabalho: ‘Chegou bem?’"],
      effects: [{ character: "pai", state: "guilt", delta: 3 }, { character: "pai", state: "attraction", delta: 2 }, { character: "self", state: "hope", delta: 3 }], special: "medium_evidence"
    }),
    silenciar_contato: define("silenciar_contato", "secretaria", "Silenciar o contato do pai", {
      baseScore: 2, novelty: "emergent", stateWeights: { frustration: 28, hope: -25 }, traitWeights: { resilience: 16 }, memoryWeights: { rejection: 3, confrontation: 2.7 },
      expressionType: "NARRATION", tags: ["withdrawal", "boundary"], target: "pai", dialogues: ["Ela silencia o contato e guarda o telefone no fundo da bolsa.", "Hoje, ela decide não esperar por uma mensagem."],
      effects: [{ character: "self", state: "hope", delta: -4 }, { character: "self", state: "frustration", delta: -2 }]
    }),

    voltar_casa: define("voltar_casa", "pai", "Voltar para casa", {
      baseScore: 15, goals: ["preserveFamily", "stability"], stateWeights: { familyLove: 18, satisfaction: 4 }, traitWeights: { conscientiousness: 15, loyalty: 8 },
      relationshipWeights: [{ target: "filha", field: "affection", weight: 7 }], memoryWeights: { family_warmth: 1, routine: .5 }, tags: ["home", "family", "routine"], target: "filha",
      dialogues: ["Cheguei. Quem quer me contar como foi o dia?", "Boa noite, família. Consegui voltar para o jantar."], effects: [{ character: "filha", state: "happiness", delta: 1 }]
    }),
    demonstrar_afeto_familia: define("demonstrar_afeto_familia", "pai", "Buscar proximidade com a família", {
      baseScore: 8, goals: ["preserveFamily"], stateWeights: { familyLove: 20, guilt: 28, fearConsequences: 8 }, traitWeights: { empathy: 15 }, memoryWeights: { guilt: 2.1, affair: 1.8, family_tension: 1.2 },
      tags: ["family_warmth", "guilt", "family"], target: "mae", dialogues: ["Senti falta de vocês hoje. Podemos jantar juntos, sem telefones?", "Ele se aproxima da família com uma atenção quase cuidadosa demais."],
      effects: [{ character: "mae", state: "trustHusband", delta: 0.5 }, { character: "filha", state: "happiness", delta: 2 }, { character: "self", state: "guilt", delta: 1 }]
    }),
    adiar_volta: define("adiar_volta", "pai", "Adiar a volta para casa", {
      baseScore: 5, stateWeights: { stress: 21, guilt: 24, fearConsequences: 13, frustration: 11 }, traitWeights: { honesty: -9 }, memoryWeights: { affair: 2.8, family_tension: 1.8, confrontation: 1 },
      factWeights: { affairOccurred: 12 }, expressionType: "NARRATION", tags: ["avoidance", "home", "secret", "suspicion"], target: "mae", dialogues: ["Ele permanece no carro por mais alguns minutos antes de entrar.", "Ele escreve que vai se atrasar, embora o expediente já tenha terminado."],
      effects: [{ character: "mae", state: "concern", delta: 4 }, { character: "filha", state: "insecurity", delta: 2 }, { character: "self", state: "stress", delta: 1 }], special: "raise_suspicion"
    }),
    confessar_esposa: define("confessar_esposa", "pai", "Contar à esposa o que aconteceu", {
      baseScore: 0, novelty: "emergent", goals: ["preserveFamily"], stateWeights: { guilt: 46, fearConsequences: 20, familyLove: 9 }, traitWeights: { honesty: 25, empathy: 10 }, memoryWeights: { affair: 3.5, betrayal: 2.6, guilt: 2.8 },
      factWeights: { affairOccurred: 36, affairKnown: -90 }, available: (state) => state.facts.affairOccurred && !state.facts.affairKnown,
      tags: ["confession", "betrayal", "honesty"], target: "mae", dialogues: ["Eu preciso contar uma coisa, mesmo sem saber o que vai acontecer depois.", "Eu rompi um limite. Você merece ouvir de mim, sem desculpas."],
      effects: [{ character: "self", state: "guilt", delta: -8 }, { character: "self", state: "fearConsequences", delta: 12 }], special: "confession"
    }),

    acolher_marido: define("acolher_marido", "mae", "Receber o marido", {
      baseScore: 14, goals: ["nurtureMarriage", "preserveFamily"], stateWeights: { happiness: 8, trustHusband: 13 }, traitWeights: { empathy: 14 },
      relationshipWeights: [{ target: "pai", field: "affection", weight: 13 }, { target: "pai", field: "trust", weight: 12 }], memoryWeights: { family_warmth: 1.2 },
      tags: ["family_warmth", "marriage", "home"], target: "pai", dialogues: ["Oi. O jantar está quase pronto. Como foi o trabalho?", "Que bom que chegou. Sua filha esperou para jantar com você."],
      effects: [{ character: "pai", state: "stress", delta: -2 }, { character: "self", state: "happiness", delta: 1 }]
    }),
    questionar_marido: define("questionar_marido", "mae", "Questionar o marido", {
      baseScore: 6, goals: ["nurtureMarriage"], stateWeights: { concern: 31, anger: 18, trustHusband: -27 }, traitWeights: { honesty: 14 },
      relationshipWeights: [{ target: "pai", field: "tension", weight: 19 }, { target: "pai", field: "trust", weight: -19 }], memoryWeights: { suspicion: 3.1, distance: 1.6, secret: 2.5 },
      factWeights: { suspicionActive: 21, affairOccurred: 7, scentDetectedToday: 34 }, tags: ["question", "suspicion", "marriage"], target: "pai", dialogues: ["Você anda diferente. O que está acontecendo no trabalho?", "Olhe para mim e diga: existe algo que eu deveria saber?"],
      effects: [{ character: "pai", state: "guilt", delta: 4 }, { character: "pai", state: "fearConsequences", delta: 4 }, { character: "self", state: "concern", delta: -3 }], special: "question"
    }),
    afastar_marido: define("afastar_marido", "mae", "Afastar-se do marido", {
      baseScore: 1, novelty: "emergent", stateWeights: { sadness: 36, anger: 31, trustHusband: -34, energy: -8 }, traitWeights: { resilience: -8 },
      relationshipWeights: [{ target: "pai", field: "resentment", weight: 25 }, { target: "pai", field: "trust", weight: -18 }], memoryWeights: { betrayal: 3.8, affair: 2.6, family_tension: 2 },
      factWeights: { affairKnown: 28 }, tags: ["withdrawal", "marriage", "betrayal"], target: "pai", dialogues: ["Eu não consigo agir como se nada tivesse mudado. Preciso que você se afaste.", "Hoje eu não quero conversar. Preciso de distância para pensar."],
      effects: [{ character: "pai", state: "guilt", delta: 7 }, { character: "self", state: "sadness", delta: 2 }], relationEffects: [{ character: "mae", target: "pai", field: "tension", delta: 6 }]
    }),
    elogiar_marido: define("elogiar_marido", "mae", "Elogiar o marido", {
      baseScore: 8, goals: ["nurtureMarriage"], stateWeights: { happiness: 17, trustHusband: 17 }, traitWeights: { empathy: 10 }, eventWeights: { family_warmth: 16 },
      relationshipWeights: [{ target: "pai", field: "affection", weight: 12 }], memoryWeights: { work_success: 1.4, family_warmth: 1.5 }, tags: ["praise", "family_warmth", "marriage"], target: "pai",
      dialogues: ["Eu admiro como você continua cuidando de tanta coisa no trabalho.", "Obrigada por ter voltado cedo. Isso importa para nós."],
      effects: [{ character: "pai", state: "familyLove", delta: 3 }, { character: "pai", state: "guilt", delta: 2 }, { character: "self", state: "happiness", delta: 2 }], relationEffects: [{ character: "pai", target: "mae", field: "affection", delta: 2 }]
    }),

    interagir_pais: define("interagir_pais", "filha", "Interagir com os pais", {
      baseScore: 14, goals: ["feelSafe", "receiveAttention"], stateWeights: { happiness: 9, trustParents: 12 }, traitWeights: { empathy: 8 },
      relationshipWeights: [{ target: "mae", field: "affection", weight: 6 }, { target: "pai", field: "affection", weight: 6 }], memoryWeights: { family_warmth: 1.3 },
      tags: ["family_warmth", "family", "safety"], dialogues: ["Posso contar uma coisa engraçada que aconteceu na escola?", "Vamos ver um episódio juntos depois do jantar?"], effects: [{ character: "self", state: "happiness", delta: 2 }, { character: "self", state: "insecurity", delta: -1 }]
    }),
    buscar_seguranca: define("buscar_seguranca", "filha", "Pedir segurança aos pais", {
      baseScore: 7, goals: ["feelSafe", "receiveAttention"], stateWeights: { insecurity: 31, concern: 26, sadness: 15 }, traitWeights: { sensitivity: 15 },
      memoryWeights: { family_tension: 2.8, distance: 1.8, betrayal: 1.5 }, factWeights: { affairKnown: 12 }, tags: ["daughter_need", "insecurity", "family"], target: "mae",
      dialogues: ["Vocês estão brigados? A nossa família vai ficar bem?", "Eu preciso que vocês me digam que nada disso é culpa minha."],
      effects: [{ character: "mae", state: "concern", delta: 3 }, { character: "pai", state: "guilt", delta: 3 }, { character: "self", state: "insecurity", delta: -5 }, { character: "self", state: "concern", delta: -2 }]
    }),
    evitar_conflito: define("evitar_conflito", "filha", "Tentar evitar o conflito dos pais", {
      baseScore: 4, stateWeights: { concern: 27, insecurity: 24, sadness: 14 }, traitWeights: { empathy: 18 }, memoryWeights: { family_tension: 3, question: 1.6 },
      factWeights: { affairKnown: 8 }, tags: ["avoidance", "family_tension", "daughter"], dialogues: ["A gente pode falar de outra coisa durante o jantar?", "Ela muda de assunto toda vez que as vozes ficam mais tensas."],
      effects: [{ character: "self", state: "concern", delta: 1 }, { character: "mae", state: "anger", delta: -1 }, { character: "pai", state: "stress", delta: -1 }]
    }),
    isolar_quarto: define("isolar_quarto", "filha", "Isolar-se no quarto", {
      baseScore: 1, novelty: "emergent", stateWeights: { insecurity: 34, sadness: 31, concern: 22, happiness: -15 }, traitWeights: { resilience: -14 },
      memoryWeights: { family_tension: 3.2, betrayal: 1.8, distance: 1.8 }, factWeights: { affairKnown: 15 }, tags: ["withdrawal", "family_tension", "insecurity"],
      dialogues: ["Eu não estou com fome. Vou ficar no meu quarto.", "Ela fecha a porta para não ouvir a conversa dos pais."],
      effects: [{ character: "self", state: "sadness", delta: 2 }, { character: "self", state: "insecurity", delta: 2 }, { character: "mae", state: "concern", delta: 3 }]
    })
  };

  const EXTERNAL_EVENTS = [
    {
      id: "quiet_day", weight: 48, title: "Condições externas estáveis", description: "Nenhuma alteração externa relevante foi registrada para este ciclo.", tags: ["stable"], effects: []
    },
    {
      id: "work_pressure", weight: 14, title: "Pressão inesperada no trabalho", description: "Uma demanda urgente aumenta a carga do escritório, sem determinar como os agentes responderão.", tags: ["work_stress"],
      effects: [{ character: "pai", state: "stress", delta: 8 }, { character: "pai", state: "frustration", delta: 4 }, { character: "secretaria", state: "frustration", delta: 2 }]
    },
    {
      id: "school_problem", weight: 10, title: "Problema na escola", description: "A filha enfrenta um atrito com colegas. O acontecimento altera seu contexto emocional.", tags: ["school_stress"],
      effects: [{ character: "filha", state: "insecurity", delta: 7 }, { character: "filha", state: "concern", delta: 5 }, { character: "mae", state: "concern", delta: 3 }]
    },
    {
      id: "wife_praise", weight: 10, title: "Reconhecimento em família", description: "A mãe reconhece um esforço recente do marido antes do início da rotina.", tags: ["family_warmth"],
      effects: [{ character: "pai", state: "familyLove", delta: 4 }, { character: "pai", state: "satisfaction", delta: 3 }, { character: "mae", state: "happiness", delta: 2 }],
      relationEffects: [{ character: "pai", target: "mae", field: "affection", delta: 2 }, { character: "mae", target: "pai", field: "affection", delta: 2 }]
    },
    {
      id: "family_tension", weight: 9, title: "Tensão doméstica", description: "Uma conversa pequena termina mal e deixa resíduos emocionais na casa.", tags: ["family_tension"],
      effects: [{ character: "mae", state: "anger", delta: 5 }, { character: "mae", state: "sadness", delta: 3 }, { character: "pai", state: "frustration", delta: 5 }, { character: "filha", state: "insecurity", delta: 4 }],
      relationEffects: [{ character: "mae", target: "pai", field: "tension", delta: 4 }, { character: "pai", target: "mae", field: "tension", delta: 4 }]
    },
    {
      id: "unexpected_call", weight: 5, title: "Telefonema inesperado", description: "Uma ligação ambígua interrompe a rotina e deixa a mãe mais atenta ao comportamento do marido.", tags: ["uncertainty"],
      effects: [{ character: "mae", state: "concern", delta: 5 }, { character: "pai", state: "stress", delta: 3 }], special: "raise_suspicion"
    },
    {
      id: "restless_night", weight: 4, title: "Noite mal dormida", description: "O cansaço reduz a disposição da casa e amplifica pequenas tensões.", tags: ["exhaustion"],
      effects: [{ character: "mae", state: "energy", delta: -8 }, { character: "pai", state: "stress", delta: 4 }, { character: "filha", state: "happiness", delta: -3 }]
    }
  ];

  const REACTION_RULES = {
    resistir_secretaria: (state) => ({
      character: "secretaria",
      expressionType: "THOUGHT",
      texts: state.characters.secretaria.states.frustration > 55
        ? ["Ele recuou outra vez. Cada rejeição me frustra mais — e ainda assim eu não consigo desistir."]
        : ["Ele impôs o limite de novo. Preciso decidir se respeito isso ou se tento me aproximar de outra forma."]
    }),
    conversar_secretaria: () => ({
      character: "secretaria",
      expressionType: "THOUGHT",
      texts: ["Ele ficou. Talvez essa conversa signifique mais do que ele está disposto a admitir."]
    }),
    evitar_secretaria: () => ({
      character: "secretaria",
      expressionType: "THOUGHT",
      texts: ["Ele está me evitando. Não sei se é rejeição ou medo do que sente."]
    }),
    flertar: () => ({
      character: "secretaria",
      expressionType: "DIALOGUE",
      texts: ["Então eu não estava imaginando. Você também sente essa aproximação."]
    }),
    ceder: () => ({
      character: "secretaria",
      expressionType: "THOUGHT",
      texts: ["O limite finalmente cedeu. Agora tudo ficou mais real — e muito mais perigoso."]
    }),
    confrontar_secretaria: () => ({
      character: "secretaria",
      expressionType: "DIALOGUE",
      texts: ["Entendi. Não vou continuar esta conversa agora."]
    }),
    aproximar_pai: (state) => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: state.characters.pai.states.attraction >= 55
        ? ["Eu deveria encerrar a conversa, mas uma parte de mim quer saber até onde ela iria."]
        : ["Ela está tentando se aproximar de novo. Preciso manter isso no campo profissional."]
    }),
    conversa_profissional: () => ({
      character: "pai",
      expressionType: "DIALOGUE",
      texts: ["Obrigado. Vamos revisar os documentos antes da reunião."]
    }),
    insistir: (state) => ({
      character: "pai",
      expressionType: state.characters.pai.states.attraction >= 58 ? "THOUGHT" : "DIALOGUE",
      texts: state.characters.pai.states.attraction >= 58
        ? ["Ela sente algo a mais. Eu preciso responder, mas já não confio completamente na minha própria resposta."]
        : ["Eu ouvi o que você sente, mas não posso corresponder a isso."]
    }),
    flertar_abertamente: (state) => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: state.characters.pai.states.guilt >= 45
        ? ["Ouvir isso desperta algo em mim, mas a culpa chega antes que eu consiga responder."]
        : ["Ela finalmente disse em voz alta. Preciso escolher minhas próximas palavras com cuidado."]
    }),
    recuar: () => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: ["O afastamento deveria me aliviar. Por que ainda estou pensando nessa conversa?"]
    }),
    prolongar_expediente: () => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: ["Ela ainda está aqui. Posso ir embora agora ou transformar o fim do expediente em mais uma conversa."]
    }),
    enviar_mensagem: () => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: ["Não é uma mensagem de trabalho. Responder seria uma decisão, mas ignorar também é."]
    }),
    silenciar_contato: () => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: ["O silêncio dela deveria tornar tudo mais simples. Em vez disso, eu percebo que notei a ausência."]
    }),
    questionar_marido: (state) => {
      if (state.facts.affairKnown) {
        return { character: "pai", expressionType: "DIALOGUE", texts: ["Eu sei que minhas palavras não consertam o que aconteceu. Vou responder ao que você quiser perguntar."] };
      }
      if (state.facts.affairOccurred) {
        return { character: "pai", expressionType: "THOUGHT", texts: ["Ela percebeu. Posso continuar escondendo ou contar tudo agora."] };
      }
      return { character: "pai", expressionType: "DIALOGUE", texts: ["O trabalho tem me deixado estranho, mas eu quero conversar com você sobre isso."] };
    },
    confessar_esposa: () => ({
      character: "mae",
      expressionType: "THOUGHT",
      texts: ["Eu queria uma explicação. Agora que ela chegou, preciso entender o que ainda existe entre nós."]
    }),
    afastar_marido: () => ({
      character: "pai",
      expressionType: "THOUGHT",
      texts: ["Quero me aproximar, mas insistir agora seria desrespeitar a dor que causei."]
    }),
    elogiar_marido: () => ({
      character: "pai",
      expressionType: "DIALOGUE",
      texts: ["Obrigado. Ouvir isso de você importa mais do que eu consigo demonstrar."]
    }),
    pedir_atencao: () => ({
      character: "mae",
      expressionType: "DIALOGUE",
      texts: ["Estou olhando para você agora. Pode me contar o que está sentindo."]
    }),
    conversar_filha: () => ({
      character: "filha",
      expressionType: "DIALOGUE",
      texts: ["Eu quero conversar. Só preciso saber que você vai me contar a verdade."]
    }),
    pedir_espaco_filha: () => ({
      character: "filha",
      expressionType: "THOUGHT",
      texts: ["Ela disse que não é culpa minha, mas ainda parece que estou perdendo alguma coisa."]
    }),
    buscar_seguranca: () => ({
      character: "mae",
      expressionType: "DIALOGUE",
      texts: ["Nada disso é culpa sua. Os adultos vão cuidar das decisões dos adultos, e nós continuamos cuidando de você."]
    }),
    permanecer_cama: () => ({
      character: "filha",
      expressionType: "THOUGHT",
      texts: ["Se ela não consegue levantar, então alguma coisa está realmente errada. Preciso me arrumar sozinha."]
    })
  };

  class World {
    constructor(savedState, options) {
      if (savedState) {
        this.state = savedState;
        this.normalizeLoadedState();
        this.rng = new Experiment.SeededRandom(savedState.seed, savedState.rngState);
        this.normalizeLoadedHistory();
      } else {
        const seed = Experiment.SeededRandom.normalizeSeed(options && options.seed);
        this.rng = new Experiment.SeededRandom(seed);
        this.state = this.createBaseState(seed);
        this.beginDay();
      }
      this.engine = new Experiment.DecisionEngine();
    }

    normalizeLoadedState() {
      const templates = Experiment.Characters.templates;
      Object.entries(templates).forEach(([characterId, template]) => {
        const character = this.state.characters[characterId];
        if (!character) return;
        Object.entries(template.states).forEach(([stateName, value]) => {
          if (character.states[stateName] == null) character.states[stateName] = value;
        });
        character.displayStates = [...template.displayStates];
      });
      this.state.schemaVersion = 2;
      this.state.facts = Object.assign({
        affairOccurred: false,
        affairKnown: false,
        suspicionActive: false,
        evidenceLevel: 0,
        motherSuspicion: 0
      }, this.state.facts || {});
      if (!this.state.dailyContext) {
        this.state.dailyContext = { day: this.state.day, externalEvent: { id: "quiet_day", title: "Condições externas estáveis", description: "Contexto restaurado.", tags: ["stable"] } };
      }
      if (!this.state.dailyContext.routine) this.state.dailyContext.routine = this.createDailyRoutine();
      this.ensureDailyFacts();
    }

    normalizeLoadedHistory() {
      this.state.history.forEach((entry) => {
        if (entry.kind !== "ACTION" || entry.expressionType) return;
        const definition = ACTIONS[entry.chosenAction];
        const looksNarrated = /^(Ela|Ele|A casa|O expediente|O silêncio|As tarefas|Por um instante|Hoje, ela|Em vez de guardar)/.test(entry.dialogue || "");
        entry.expressionType = (definition && definition.expressionType) || (looksNarrated ? "NARRATION" : "DIALOGUE");
      });
    }

    createBaseState(seed) {
      return {
        schemaVersion: 2,
        seed,
        rngState: seed,
        day: 1,
        currentStep: 0,
        characters: Experiment.Characters.createInitialCharacters(),
        facts: {
          affairOccurred: false,
          affairKnown: false,
          suspicionActive: false,
          evidenceLevel: 0,
          motherSuspicion: 0,
          lastSchoolGrade: null
        },
        dailyContext: null,
        history: [],
        meta: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actionCount: 0,
          nextMemoryId: 0,
          nextLogId: 0
        }
      };
    }

    createDailyRoutine() {
      return {
        motherWake: "PENDENTE",
        daughterReady: "PENDENTE",
        breakfast: "PENDENTE",
        daughterBreakfast: "PENDENTE",
        fatherBreakfast: "PENDENTE",
        schoolArrival: "PENDENTE",
        schoolClimate: "PENDENTE",
        presentation: "PENDENTE",
        schoolGrade: null,
        fatherCoffeeAtWork: "PENDENTE",
        secretaryProximity: 0,
        scentTrace: 0,
        scentDetected: false
      };
    }

    ensureDailyFacts(reset) {
      const defaults = {
        motherAwakeEarly: false,
        motherAwakeOnTime: false,
        motherAwakeLate: false,
        daughterReadyOnTime: false,
        daughterReadyLate: false,
        breakfastAvailable: false,
        breakfastUnavailable: false,
        quickBreakfast: false,
        daughterAteBreakfast: false,
        daughterSkippedBreakfast: false,
        fatherAteBreakfast: false,
        fatherSkippedBreakfast: false,
        schoolArrivalOnTime: false,
        schoolArrivalLate: false,
        schoolMorningCalm: false,
        schoolConflict: false,
        goodGrade: false,
        lowGrade: false,
        scentDetectedToday: false
      };
      Object.entries(defaults).forEach(([key, value]) => {
        if (reset || this.state.facts[key] == null) this.state.facts[key] = value;
      });
    }

    setDecisionProvider(provider) {
      this.engine.setProvider(provider);
    }

    get currentPlanItem() {
      return DAILY_PLAN[this.state.currentStep] || null;
    }

    get currentPeriod() {
      return this.currentPlanItem ? this.currentPlanItem.period : "FIM_DIA";
    }

    beginDay() {
      this.ensureDailyFacts(true);
      const event = this.weightedEvent();
      const consequences = this.applyEffects(event.effects || [], event.relationEffects || []);
      if (event.special === "raise_suspicion") this.raiseSuspicion(1.2);

      this.state.dailyContext = {
        day: this.state.day,
        externalEvent: {
          id: event.id,
          title: event.title,
          description: event.description,
          tags: event.tags
        },
        routine: this.createDailyRoutine()
      };

      const affected = [...new Set((event.effects || []).map((effect) => effect.character))];
      if (event.id !== "quiet_day") {
        affected.forEach((ownerId) => {
          Experiment.MemoryStore.add(this.state, ownerId, {
            actor: "ambiente",
            target: ownerId,
            event: event.id,
            description: event.title,
            emotionalImpact: this.emotionalImpactFor(event.effects, ownerId),
            importance: 4.5,
            tags: [...event.tags, event.id]
          });
        });
      }

      const log = Experiment.Logger.event(this.state, {
        eventId: event.id,
        title: event.title,
        description: event.description,
        tags: event.tags,
        consequences
      });
      this.syncRng();
      return log;
    }

    weightedEvent() {
      const total = EXTERNAL_EVENTS.reduce((sum, event) => sum + event.weight, 0);
      let cursor = this.rng.between(0, total);
      for (const event of EXTERNAL_EVENTS) {
        cursor -= event.weight;
        if (cursor <= 0) return event;
      }
      return EXTERNAL_EVENTS[0];
    }

    step() {
      if (this.state.currentStep >= DAILY_PLAN.length) return this.finishDay();

      const planItem = DAILY_PLAN[this.state.currentStep];
      const actor = this.state.characters[planItem.character];
      const candidates = planItem.candidates
        .map((id) => ACTIONS[id])
        .filter((action) => action && (!action.available || action.available(this.state, actor)));
      const context = {
        day: this.state.day,
        period: planItem.period,
        tags: [planItem.period.toLowerCase(), actor.id],
        externalEvent: this.state.dailyContext.externalEvent,
        facts: this.state.facts,
        characters: this.state.characters
      };
      const stateBefore = this.captureActor(actor.id);
      const decision = this.engine.decide(actor, context, planItem.expectedAction, candidates, this.rng);
      const action = ACTIONS[decision.chosenAction];
      const applied = this.applyAction(action, actor, decision);
      const generatedEvents = this.resolveCascades(planItem, action);
      const stateAfter = this.captureActor(actor.id);
      const presentation = this.selectPresentation(action);
      const reaction = this.buildReaction(action, actor, planItem, presentation);

      this.state.meta.actionCount += 1;
      const entry = Experiment.Logger.action(this.state, {
        period: planItem.period,
        periodLabel: PERIODS[planItem.period],
        character: actor.id,
        decision,
        expectedActionLabel: ACTIONS[planItem.expectedAction].label,
        chosenActionLabel: action.label,
        dialogue: presentation.text,
        expressionType: presentation.expressionType,
        consequences: applied.consequences,
        memoriesCreated: applied.memories.map((memory) => memory.id),
        stateBefore,
        stateAfter,
        routineSnapshot: Experiment.deepClone(this.state.dailyContext.routine)
      });

      const reactionEntry = reaction ? Experiment.Logger.reaction(this.state, reaction) : null;

      this.state.currentStep += 1;
      this.state.meta.updatedAt = new Date().toISOString();

      generatedEvents.forEach((eventData) => Experiment.Logger.event(this.state, eventData));
      const loggedGenerated = generatedEvents.length ? this.state.history.slice(-generatedEvents.length) : [];
      this.syncRng();
      return { entries: [entry, ...(reactionEntry ? [reactionEntry] : []), ...loggedGenerated], dayEnded: false };
    }

    selectPresentation(action) {
      const selected = this.rng.pick(action.dialogues);
      if (selected && typeof selected === "object") {
        return { text: selected.text, expressionType: selected.type || action.expressionType || "DIALOGUE" };
      }
      const text = String(selected);
      const looksNarrated = /^(Ela|Ele|A casa|O expediente|O silêncio|As tarefas|Por um instante|Hoje, ela|Em vez de guardar)/.test(text);
      return {
        text,
        expressionType: action.expressionType || (looksNarrated ? "NARRATION" : "DIALOGUE")
      };
    }

    buildReaction(action, actor, planItem, presentation) {
      const rule = REACTION_RULES[action.id];
      let reaction = rule ? rule(this.state, actor) : null;
      const inferredTarget = action.target
        || (action.effects.find((effect) => effect.character !== "self" && this.state.characters[effect.character]) || {}).character
        || (action.relationshipWeights.find((driver) => this.state.characters[driver.target]) || {}).target;
      if (!reaction && presentation.expressionType === "DIALOGUE" && inferredTarget && this.state.characters[inferredTarget]) {
        const actorReference = { mae: "a mãe", pai: "o pai", filha: "a filha", secretaria: "a secretária" }[actor.id] || actor.name.toLowerCase();
        const genericThoughts = {
          mae: `Eu ouvi ${actorReference}. Antes de responder, preciso perceber o que essa fala revela.`,
          pai: `Preciso responder ao que ${actorReference} disse sem ignorar o que estou sentindo.`,
          filha: `Eu ouvi ${actorReference}. Pelo jeito como falou, tento entender se nossa rotina continua segura.`,
          secretaria: `O que ${actorReference} disse muda o tom desta conversa. Preciso escolher como reagir.`
        };
        reaction = {
          character: inferredTarget,
          expressionType: "THOUGHT",
          texts: [genericThoughts[inferredTarget]]
        };
      }
      if (!reaction) return null;
      const character = this.state.characters[reaction.character];
      if (!character || reaction.character === actor.id) return null;
      const dominantStates = character.displayStates
        .map((stateName) => ({ stateName, value: character.states[stateName] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 2)
        .map((item) => `${Experiment.STATE_LABELS[item.stateName]} ${Experiment.round(item.value)}`);

      return {
        period: planItem.period,
        periodLabel: PERIODS[planItem.period],
        character: reaction.character,
        sourceCharacter: actor.id,
        sourceAction: action.id,
        expressionType: reaction.expressionType,
        text: this.rng.pick(reaction.texts),
        reasons: dominantStates,
        stateSnapshot: Experiment.deepClone(character.states)
      };
    }

    applyAction(action, actor, decision) {
      const resolvedEffects = this.applyEffectsForActor(action.effects, actor.id);
      const consequences = this.applyEffects(resolvedEffects, action.relationEffects);
      this.applySpecial(action.special, action, actor, consequences);

      const targetId = action.target && this.state.characters[action.target] ? action.target : null;
      const owners = [actor.id];
      if (targetId && targetId !== actor.id) owners.push(targetId);
      const importanceBase = decision.decisionType === "EMERGENT" ? 8 : decision.decisionType === "ADAPTIVE" ? 5.5 : 2.6;
      const largestEffect = Math.max(0, ...resolvedEffects.map((effect) => Math.abs(effect.delta)));
      const memories = Experiment.MemoryStore.add(this.state, owners, {
        actor: actor.id,
        target: targetId,
        event: action.id,
        description: `${actor.name}: ${action.label.toLowerCase()}.`,
        emotionalImpact: this.emotionalImpactFor(resolvedEffects, actor.id),
        importance: Experiment.clamp(importanceBase + largestEffect * 0.08, 1, 10),
        tags: [...action.tags, action.id, decision.decisionType.toLowerCase()]
      });

      return { consequences, memories };
    }

    applySpecial(special, action, actor, consequences) {
      const facts = this.state.facts;
      const routine = this.state.dailyContext.routine;
      const setExclusive = (active, inactive) => {
        facts[active] = true;
        inactive.forEach((key) => { facts[key] = false; });
      };

      if (special === "mother_wake_early") {
        routine.motherWake = "CEDO";
        setExclusive("motherAwakeEarly", ["motherAwakeOnTime", "motherAwakeLate"]);
        consequences.push("Rotina: a casa ganhou tempo antes dos compromissos.");
      }
      if (special === "mother_wake_on_time") {
        routine.motherWake = "NO HORÁRIO";
        setExclusive("motherAwakeOnTime", ["motherAwakeEarly", "motherAwakeLate"]);
        consequences.push("Rotina: a manhã começou dentro do horário previsto.");
      }
      if (special === "mother_wake_late") {
        routine.motherWake = "ATRASADA";
        setExclusive("motherAwakeLate", ["motherAwakeEarly", "motherAwakeOnTime"]);
        consequences.push("Rotina: o atraso reduziu o tempo para arrumação e café.");
      }

      if (["prepare_daughter_supported", "daughter_ready_cooperative"].includes(special)) {
        const late = facts.motherAwakeLate;
        routine.daughterReady = late ? "ATRASADA" : "NO HORÁRIO";
        setExclusive(late ? "daughterReadyLate" : "daughterReadyOnTime", late ? ["daughterReadyOnTime"] : ["daughterReadyLate"]);
      }
      if (["prepare_daughter_distant", "prepare_daughter_autonomous", "prepare_daughter_absent", "daughter_ready_delayed", "daughter_ready_refusal"].includes(special)) {
        routine.daughterReady = "ATRASADA";
        setExclusive("daughterReadyLate", ["daughterReadyOnTime"]);
      }
      if (special === "daughter_ready_autonomous") {
        const late = facts.motherAwakeLate && this.state.characters.filha.states.insecurity >= 35;
        routine.daughterReady = late ? "ATRASADA" : "NO HORÁRIO";
        setExclusive(late ? "daughterReadyLate" : "daughterReadyOnTime", late ? ["daughterReadyOnTime"] : ["daughterReadyLate"]);
      }

      if (special === "breakfast_full" || special === "breakfast_quick") {
        routine.breakfast = special === "breakfast_full" ? "COMPLETO" : "RÁPIDO";
        facts.breakfastAvailable = true;
        facts.breakfastUnavailable = false;
        facts.quickBreakfast = special === "breakfast_quick";
      }
      if (special === "breakfast_none") {
        routine.breakfast = "NÃO PREPARADO";
        facts.breakfastAvailable = false;
        facts.breakfastUnavailable = true;
        facts.quickBreakfast = false;
      }

      if (["daughter_breakfast_full", "daughter_breakfast_quick"].includes(special)) {
        routine.daughterBreakfast = special === "daughter_breakfast_full" ? "COMEU" : "COMEU POUCO";
        facts.daughterAteBreakfast = true;
        facts.daughterSkippedBreakfast = false;
        this.adjustStateWithLog("filha", "hunger", special === "daughter_breakfast_full" ? -30 : -17, consequences);
        this.adjustStateWithLog("filha", "irritability", special === "daughter_breakfast_full" ? -8 : -3, consequences);
      }
      if (special === "daughter_skips_breakfast") {
        routine.daughterBreakfast = "SEM CAFÉ";
        facts.daughterAteBreakfast = false;
        facts.daughterSkippedBreakfast = true;
        this.adjustStateWithLog("filha", "hunger", 34, consequences);
        this.adjustStateWithLog("filha", "irritability", 16, consequences);
        this.adjustStateWithLog("filha", "schoolMotivation", -5, consequences);
      }

      if (["father_breakfast_full", "father_breakfast_quick"].includes(special)) {
        routine.fatherBreakfast = special === "father_breakfast_full" ? "COMEU EM CASA" : "CAFÉ RÁPIDO";
        facts.fatherAteBreakfast = true;
        facts.fatherSkippedBreakfast = false;
        this.adjustStateWithLog("pai", "hunger", special === "father_breakfast_full" ? -30 : -18, consequences);
      }
      if (special === "father_skips_breakfast") {
        routine.fatherBreakfast = "SAIU EM JEJUM";
        facts.fatherAteBreakfast = false;
        facts.fatherSkippedBreakfast = true;
        this.adjustStateWithLog("pai", "hunger", 32, consequences);
      }

      if (special === "daughter_goes_school") {
        const late = facts.motherAwakeLate || facts.daughterReadyLate;
        routine.schoolArrival = late ? "ATRASADA" : "NO HORÁRIO";
        setExclusive(late ? "schoolArrivalLate" : "schoolArrivalOnTime", late ? ["schoolArrivalOnTime"] : ["schoolArrivalLate"]);
        if (late) consequences.push("Escola: a filha chegou depois do horário por causa da cadeia da manhã.");
      }
      if (special === "daughter_delays_school") {
        routine.schoolArrival = "ATRASADA";
        setExclusive("schoolArrivalLate", ["schoolArrivalOnTime"]);
        consequences.push("Escola: a hesitação aumentou o atraso acumulado na manhã.");
      }
      if (["daughter_school_calm", "daughter_seeks_school_help"].includes(special)) {
        routine.schoolClimate = special === "daughter_school_calm" ? "TRANQUILO" : "PEDIU AJUDA";
        facts.schoolMorningCalm = true;
        facts.schoolConflict = false;
        this.adjustStateWithLog("filha", "irritability", special === "daughter_school_calm" ? -9 : -5, consequences);
      }
      if (special === "daughter_school_fight") {
        routine.schoolClimate = "BRIGA";
        facts.schoolMorningCalm = false;
        facts.schoolConflict = true;
        this.adjustStateWithLog("filha", "insecurity", 8, consequences);
        this.adjustStateWithLog("filha", "schoolMotivation", -12, consequences);
        consequences.push("Escola: fome e irritabilidade transbordaram em conflito com um colega.");
      }

      if (["presentation_good", "presentation_difficult", "presentation_missed"].includes(special)) {
        const daughter = this.state.characters.filha;
        let grade;
        if (special === "presentation_good") grade = 7.8 + daughter.states.academicConfidence * 0.018 + daughter.states.schoolMotivation * 0.008;
        if (special === "presentation_difficult") grade = 5.7 + daughter.states.academicConfidence * 0.014 - daughter.states.hunger * 0.018 - (facts.schoolConflict ? 0.8 : 0);
        if (special === "presentation_missed") grade = 1.5 + daughter.states.academicConfidence * 0.008;
        grade = Experiment.round(Experiment.clamp(grade, 0, 10), 1);
        routine.presentation = special === "presentation_good" ? "BOA" : special === "presentation_difficult" ? "COM DIFICULDADE" : "NÃO APRESENTOU";
        routine.schoolGrade = grade;
        facts.lastSchoolGrade = grade;
        facts.goodGrade = grade >= 7;
        facts.lowGrade = grade < 6;
        const motivationDelta = grade >= 7 ? 9 : grade < 6 ? -12 : -3;
        const confidenceDelta = grade >= 7 ? 7 : grade < 6 ? -10 : -3;
        this.adjustStateWithLog("filha", "schoolMotivation", motivationDelta, consequences);
        this.adjustStateWithLog("filha", "academicConfidence", confidenceDelta, consequences);
        consequences.push(`Escola: a apresentação resultou em nota ${grade.toFixed(1)}.`);
      }

      if (special === "mother_receives_grade" && Number.isFinite(routine.schoolGrade)) {
        if (routine.schoolGrade >= 7) {
          this.adjustStateWithLog("mae", "happiness", 7, consequences);
          this.adjustStateWithLog("mae", "concern", -4, consequences);
          consequences.push("Família: a mãe soube da boa nota e ficou feliz com a filha.");
        } else if (routine.schoolGrade < 6) {
          this.adjustStateWithLog("mae", "sadness", 5, consequences);
          this.adjustStateWithLog("mae", "concern", 8, consequences);
          consequences.push("Família: a mãe soube da nota baixa e percebeu a desmotivação da filha.");
        }
      }

      if (["secretary_coffee_offer", "secretary_coffee_offer_close"].includes(special)) {
        routine.secretaryProximity += special === "secretary_coffee_offer_close" ? 1.2 : 0.5;
      }
      if (special === "secretary_keeps_distance") this.adjustStateWithLog("secretaria", "encouragement", -4, consequences);
      if (special === "father_rejects_coffee") {
        routine.fatherCoffeeAtWork = "RECUSOU";
        this.adjustStateWithLog("secretaria", "encouragement", -8, consequences);
        this.adjustStateWithLog("secretaria", "hope", -4, consequences);
        this.adjustStateWithLog("pai", "attraction", -2, consequences);
      }
      if (["father_accepts_coffee", "father_accepts_coffee_and_talks"].includes(special)) {
        const prolonged = special === "father_accepts_coffee_and_talks";
        routine.fatherCoffeeAtWork = prolonged ? "ACEITOU E CONVERSOU" : "ACEITOU";
        routine.secretaryProximity += prolonged ? 1.6 : 0.9;
        routine.scentTrace += prolonged ? 1.5 : 0.7;
        this.adjustStateWithLog("pai", "hunger", prolonged ? -28 : -24, consequences);
        this.adjustStateWithLog("pai", "attraction", prolonged ? 6 : 4, consequences);
        this.adjustStateWithLog("secretaria", "encouragement", prolonged ? 16 : 9, consequences);
        this.adjustStateWithLog("secretaria", "hope", prolonged ? 8 : 4, consequences);
        consequences.push("Trabalho: a receptividade do pai aumentou o incentivo percebido pela secretária para o próximo dia.");
      }

      if (special === "father_rejects_secretary") {
        this.adjustStateWithLog("secretaria", "encouragement", -10, consequences);
        routine.scentTrace = routine.fatherCoffeeAtWork.startsWith("ACEITOU")
          ? Math.max(0.55, routine.scentTrace * 0.42)
          : routine.scentTrace * 0.12;
      }
      if (["conversar_secretaria", "flertar", "ceder"].includes(action.id)) {
        routine.secretaryProximity += action.id === "ceder" ? 3 : action.id === "flertar" ? 2 : 1.2;
        routine.scentTrace += action.id === "ceder" ? 3 : action.id === "flertar" ? 2 : 1.1;
        this.adjustStateWithLog("secretaria", "encouragement", action.id === "ceder" ? 20 : action.id === "flertar" ? 13 : 7, consequences);
      }
      if (["aproximar_pai", "insistir", "flertar_abertamente"].includes(action.id)) {
        routine.secretaryProximity += action.id === "aproximar_pai" ? 0.7 : 1.4;
        routine.scentTrace += action.id === "aproximar_pai" ? 0.5 : 1.2;
      }

      if (special === "small_evidence") this.raiseEvidence(0.35);
      if (special === "medium_evidence") this.raiseEvidence(0.9);
      if (special === "raise_suspicion") this.raiseSuspicion(1.6);
      if (special === "question") this.raiseSuspicion(2.4);

      if (special === "affair") {
        this.state.facts.affairOccurred = true;
        this.raiseEvidence(3.5);
        consequences.push("Mundo: surgiu uma aproximação íntima ainda não conhecida pela família.");
      }

      if (special === "confession" && this.state.facts.affairOccurred && !this.state.facts.affairKnown) {
        this.revealAffair("confissão espontânea");
        consequences.push("Mundo: a aproximação foi revelada pela confissão do pai.");
      }

      if (actor.id === "pai" && ["despedir_familia", "voltar_casa"].includes(action.id)) {
        this.state.facts.motherSuspicion = Experiment.clamp(this.state.facts.motherSuspicion - 0.25, 0, 20);
      }
    }

    adjustStateWithLog(characterId, stateName, delta, consequences) {
      const character = this.state.characters[characterId];
      if (!character || character.states[stateName] == null) return;
      const before = character.states[stateName];
      adjustState(character, stateName, delta);
      const after = character.states[stateName];
      if (after !== before) consequences.push(`${character.name}: ${Experiment.STATE_LABELS[stateName] || stateName} ${this.deltaText(after - before)} (${before} → ${after})`);
    }

    applyEffectsForActor(effects, actorId) {
      return (effects || []).map((effect) => effect.character === "self" ? Object.assign({}, effect, { character: actorId }) : effect);
    }

    resolveCascades(planItem, action) {
      const events = [];
      const routine = this.state.dailyContext.routine;
      if (planItem.character === "pai" && planItem.period === "NOITE" && !routine.scentDetected && routine.scentTrace > 0) {
        const mother = this.state.characters.mae;
        const scentPressure = routine.scentTrace * 0.11
          + mother.states.concern * 0.002
          + mother.states.anger * 0.002
          + this.state.facts.motherSuspicion * 0.012;
        const scentProbability = Experiment.clamp(scentPressure, 0.01, 0.68);
        if (this.rng.next() < scentProbability) {
          routine.scentDetected = true;
          this.state.facts.scentDetectedToday = true;
          this.raiseSuspicion(1.8);
          this.adjustStateWithLog("mae", "sadness", 9, []);
          this.adjustStateWithLog("mae", "anger", 12, []);
          this.adjustStateWithLog("mae", "trustHusband", -5, []);
          adjustRelationship(this.state.characters.mae, "pai", "tension", 7);
          Experiment.MemoryStore.add(this.state, "mae", {
            actor: "pai",
            target: "mae",
            event: "scent_detected",
            description: "A mãe percebeu no marido um perfume ligado à proximidade no escritório, sem prova de traição.",
            emotionalImpact: { sadness: 9, anger: 12, trustHusband: -5 },
            importance: 7.5,
            tags: ["scent", "suspicion", "family_tension", "secretary_approach"]
          });
          events.push({
            eventId: "scent_detected",
            period: "NOITE",
            title: "Um cheiro estranho chega em casa",
            description: "A proximidade no escritório deixou um vestígio de perfume na roupa do pai. Isso não prova uma traição, mas altera o estado emocional da mãe.",
            tags: ["scent", "suspicion", "family_tension"],
            consequences: ["Mãe: tristeza +9 e raiva +12.", "A suspeita e a tensão conjugal aumentaram antes da conversa da noite."]
          });
        }
      }

      if (planItem.character !== "mae" || planItem.period !== "NOITE" || this.state.facts.affairKnown || !this.state.facts.affairOccurred) return events;

      const mother = this.state.characters.mae;
      const father = this.state.characters.pai;
      const discoveryPressure = this.state.facts.evidenceLevel * 0.045
        + this.state.facts.motherSuspicion * 0.035
        + mother.states.concern * 0.002
        + father.states.guilt * 0.0015
        - mother.states.trustHusband * 0.0008;
      const probability = Experiment.clamp(discoveryPressure, 0.015, 0.55);

      if (this.rng.next() < probability) {
        this.revealAffair("indícios acumulados");
        events.push({
          eventId: "affair_discovered",
          period: "NOITE",
          title: "A confiança se rompe",
          description: "Indícios acumulados e o estado de alerta da mãe fizeram a aproximação vir à tona. Não havia dia predeterminado para isso.",
          tags: ["betrayal", "discovery", "family_tension"],
          consequences: ["A mãe tomou conhecimento da aproximação.", "Confiança, tristeza, raiva e vínculos familiares foram atualizados."]
        });
      }
      return events;
    }

    revealAffair(source) {
      if (this.state.facts.affairKnown) return;
      this.state.facts.affairKnown = true;
      this.state.facts.suspicionActive = true;
      adjustState(this.state.characters.mae, "sadness", 34);
      adjustState(this.state.characters.mae, "anger", 28);
      adjustState(this.state.characters.mae, "trustHusband", -52);
      adjustState(this.state.characters.mae, "energy", -22);
      adjustState(this.state.characters.mae, "concern", 20);
      adjustState(this.state.characters.pai, "guilt", 16);
      adjustState(this.state.characters.pai, "fearConsequences", 18);
      adjustState(this.state.characters.filha, "insecurity", 14);
      adjustState(this.state.characters.filha, "sadness", 9);
      adjustRelationship(this.state.characters.mae, "pai", "trust", -58);
      adjustRelationship(this.state.characters.mae, "pai", "resentment", 48);
      adjustRelationship(this.state.characters.mae, "pai", "tension", 42);
      adjustRelationship(this.state.characters.pai, "mae", "trust", -20);
      adjustRelationship(this.state.characters.pai, "mae", "tension", 30);

      Experiment.MemoryStore.add(this.state, ["mae", "pai", "filha"], {
        actor: "pai",
        target: "mae",
        event: "affair_discovered",
        description: `A aproximação do pai com a secretária foi revelada por ${source}.`,
        emotionalImpact: { sadness: 34, anger: 28, trustHusband: -52 },
        importance: 10,
        tags: ["betrayal", "affair", "discovery", "family_tension", "secret"]
      });
    }

    raiseEvidence(delta) {
      this.state.facts.evidenceLevel = Experiment.round(Experiment.clamp(this.state.facts.evidenceLevel + delta, 0, 20), 2);
      if (this.state.facts.evidenceLevel >= 2) this.state.facts.suspicionActive = true;
    }

    raiseSuspicion(delta) {
      this.state.facts.motherSuspicion = Experiment.round(Experiment.clamp(this.state.facts.motherSuspicion + delta, 0, 20), 2);
      if (this.state.facts.motherSuspicion >= 2) this.state.facts.suspicionActive = true;
    }

    finishDay() {
      const endingDay = this.state.day;
      const completedRoutine = this.state.dailyContext.routine;
      this.state.facts.previousDayGoodGrade = Number.isFinite(completedRoutine.schoolGrade) && completedRoutine.schoolGrade >= 7;
      this.state.facts.previousDayLowGrade = Number.isFinite(completedRoutine.schoolGrade) && completedRoutine.schoolGrade < 6;
      const consolidation = {};
      Object.values(this.state.characters).forEach((character) => {
        consolidation[character.id] = Experiment.MemoryStore.consolidate(character, this.state.day);
      });
      this.applyHomeostasis();

      const endEntry = Experiment.Logger.dayEnd(this.state, {
        description: "Estados emocionais foram regulados, relações preservaram suas alterações e memórias perderam ou consolidaram relevância.",
        memoryConsolidation: consolidation,
        stateSnapshot: this.captureWorldStates()
      });

      this.state.day += 1;
      this.state.currentStep = 0;
      this.state.facts.evidenceLevel = Experiment.round(Math.max(0, this.state.facts.evidenceLevel - 0.12), 2);
      this.state.facts.motherSuspicion = Experiment.round(Math.max(0, this.state.facts.motherSuspicion - 0.1), 2);
      this.state.meta.updatedAt = new Date().toISOString();
      const contextEntry = this.beginDay();
      this.syncRng();
      return { entries: [endEntry, contextEntry], dayEnded: true, endedDay: endingDay };
    }

    applyHomeostasis() {
      const drift = (characterId, state, target, rate) => {
        const character = this.state.characters[characterId];
        const delta = (target - character.states[state]) * rate;
        adjustState(character, state, delta);
      };

      drift("mae", "energy", this.state.facts.affairKnown ? 52 : 76, 0.08);
      drift("mae", "anger", this.state.facts.affairKnown ? 28 : 5, 0.05);
      drift("mae", "sadness", this.state.facts.affairKnown ? 38 : 12, 0.045);
      drift("filha", "happiness", this.state.facts.affairKnown ? 52 : 72, 0.06);
      drift("filha", "concern", this.state.facts.affairKnown ? 30 : 10, 0.05);
      drift("filha", "hunger", 10, 0.72);
      drift("filha", "irritability", 10, 0.22);
      drift("filha", "schoolMotivation", 72, 0.04);
      drift("filha", "academicConfidence", 70, 0.035);
      drift("pai", "stress", 25, 0.08);
      drift("pai", "frustration", 16, 0.045);
      drift("pai", "attraction", 22, this.state.facts.affairOccurred ? 0.015 : 0.035);
      drift("pai", "hunger", 10, 0.75);
      drift("secretaria", "frustration", 18, 0.035);
      drift("secretaria", "hope", this.state.facts.affairOccurred ? 78 : 62, 0.025);
      drift("secretaria", "encouragement", 15, 0.07);

      if (this.state.facts.affairOccurred && !this.state.facts.affairKnown) {
        adjustState(this.state.characters.pai, "guilt", 0.8);
        adjustState(this.state.characters.pai, "fearConsequences", 0.5);
      }
      if (this.state.facts.affairKnown) {
        adjustState(this.state.characters.mae, "sadness", 0.7);
        adjustState(this.state.characters.filha, "insecurity", 0.35);
      }
    }

    applyEffects(effects, relationEffects) {
      return this._applyResolvedEffects(effects || [], relationEffects || []);
    }

    _applyResolvedEffects(effects, relationEffects) {
      const consequences = [];
      effects.forEach((effect) => {
        if (effect.character === "self") return;
        const character = this.state.characters[effect.character];
        if (!character || character.states[effect.state] == null) return;
        const before = character.states[effect.state];
        adjustState(character, effect.state, effect.delta);
        const after = character.states[effect.state];
        consequences.push(`${character.name}: ${Experiment.STATE_LABELS[effect.state] || effect.state} ${this.deltaText(after - before)} (${before} → ${after})`);
      });
      relationEffects.forEach((effect) => {
        const character = this.state.characters[effect.character];
        const target = this.state.characters[effect.target];
        if (!character || !target || !character.relationships[effect.target]) return;
        const before = character.relationships[effect.target][effect.field];
        adjustRelationship(character, effect.target, effect.field, effect.delta);
        const after = character.relationships[effect.target][effect.field];
        consequences.push(`${character.name} → ${target.name}: ${Experiment.RELATION_LABELS[effect.field]} ${this.deltaText(after - before)} (${before} → ${after})`);
      });
      return consequences;
    }

    emotionalImpactFor(effects, ownerId) {
      return (effects || []).reduce((impact, effect) => {
        if (effect.character === ownerId) impact[effect.state] = (impact[effect.state] || 0) + effect.delta;
        return impact;
      }, {});
    }

    captureActor(actorId) {
      const character = this.state.characters[actorId];
      return {
        states: Experiment.deepClone(character.states),
        relationships: Experiment.deepClone(character.relationships),
        memoryCount: character.memories.length,
        worldFacts: Experiment.deepClone(this.state.facts)
      };
    }

    captureWorldStates() {
      return Object.fromEntries(Object.values(this.state.characters).map((character) => [character.id, Experiment.deepClone(character.states)]));
    }

    deltaText(delta) {
      if (delta > 0) return `+${Experiment.round(delta)}`;
      return String(Experiment.round(delta));
    }

    syncRng() {
      this.state.rngState = this.rng.state;
    }
  }

  Experiment.World = World;
  Experiment.PERIODS = PERIODS;
  Experiment.DAILY_PLAN = DAILY_PLAN;
  Experiment.ACTIONS = ACTIONS;
})(window);
