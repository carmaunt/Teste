(function (global) {
  "use strict";

  const Experiment = global.Experiment;

  const MemoryStore = {
    add(state, owners, data) {
      const ownerIds = Array.isArray(owners) ? owners : [owners];
      const created = [];

      ownerIds.forEach((ownerId) => {
        const owner = state.characters[ownerId];
        if (!owner) return;

        state.meta.nextMemoryId += 1;
        const memory = {
          id: `mem-${String(state.meta.nextMemoryId).padStart(6, "0")}`,
          day: state.day,
          owner: ownerId,
          actor: data.actor,
          target: data.target || null,
          event: data.event,
          description: data.description,
          emotionalImpact: Experiment.deepClone(data.emotionalImpact || {}),
          importance: Experiment.clamp(data.importance || 5, 1, 10),
          salience: Experiment.clamp(data.importance || 5, 1, 10),
          tags: [...new Set(data.tags || [])],
          sourceAction: state.meta.actionCount
        };
        owner.memories.push(memory);
        created.push(memory);
      });

      return created;
    },

    strength(memory, currentDay) {
      const age = Math.max(0, currentDay - memory.day);
      const halfLife = 2 + memory.importance * 2.7;
      const decay = Math.pow(0.5, age / halfLife);
      return Experiment.round(memory.salience * decay, 3);
    },

    recall(character, context, actionDefinition, limit = 4) {
      const tagWeights = actionDefinition.memoryWeights || {};
      const relevantTags = new Set([
        ...(context.tags || []),
        ...Object.keys(tagWeights),
        actionDefinition.target || ""
      ]);

      return character.memories
        .map((memory) => {
          const strength = this.strength(memory, context.day);
          const overlaps = memory.tags.filter((tag) => relevantTags.has(tag));
          const tagContribution = overlaps.reduce((sum, tag) => sum + (tagWeights[tag] || 0.45), 0);
          const recencyBonus = memory.day === context.day ? 0.75 : 0;
          return {
            memory,
            strength,
            overlaps,
            influence: Experiment.round(strength * tagContribution * 0.42 + recencyBonus, 3)
          };
        })
        .filter((item) => item.overlaps.length && item.influence > 0.45)
        .sort((a, b) => b.influence - a.influence)
        .slice(0, limit);
    },

    consolidate(character, currentDay) {
      const before = character.memories.length;
      character.memories.forEach((memory) => {
        const age = Math.max(0, currentDay - memory.day);
        const dailyDecay = 0.08 + (10 - memory.importance) * 0.025;
        memory.salience = Experiment.round(Experiment.clamp(memory.salience - dailyDecay), 3);
        if (age === 0 && memory.importance >= 7) {
          memory.salience = Experiment.round(Experiment.clamp(memory.salience + 0.3, 1, 10), 3);
        }
      });

      character.memories = character.memories.filter((memory) => {
        const strength = this.strength(memory, currentDay);
        return memory.importance >= 9.7 || strength >= 0.7 || currentDay - memory.day <= 2;
      });

      return { before, after: character.memories.length };
    }
  };

  Experiment.MemoryStore = MemoryStore;
})(window);
