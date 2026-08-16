(function (global) {
  "use strict";

  const Experiment = global.Experiment;
  const STORAGE_KEY = "entrelinhas-experiment-v1";
  const DATABASE_NAME = "entrelinhas-laboratory";
  const STORE_NAME = "experiments";
  const RECORD_KEY = "active";
  let databasePromise = null;
  let pendingState = null;
  let savePromise = null;

  function openDatabase() {
    if (!global.indexedDB) return Promise.reject(new Error("IndexedDB indisponível."));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return databasePromise;
  }

  async function writeIndexedState(state) {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(state, RECORD_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("Gravação abortada."));
    });
  }

  async function flushPendingSaves() {
    let stateBeingSaved = null;
    try {
      while (pendingState) {
        const state = pendingState;
        stateBeingSaved = state;
        pendingState = null;
        await writeIndexedState(state);
      }
      global.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn("IndexedDB indisponível; usando persistência local de compatibilidade.", error);
      const state = pendingState || stateBeingSaved;
      pendingState = null;
      if (!state) return false;
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch (fallbackError) {
        console.warn("Não foi possível persistir o experimento.", fallbackError);
        return false;
      }
    } finally {
      savePromise = null;
      if (pendingState) savePromise = flushPendingSaves();
    }
  }

  const Storage = {
    save(state) {
      pendingState = state;
      if (!savePromise) savePromise = flushPendingSaves();
      return savePromise;
    },

    async load() {
      try {
        const database = await openDatabase();
        const saved = await new Promise((resolve, reject) => {
          const transaction = database.transaction(STORE_NAME, "readonly");
          const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
        if (saved && (![1, 2].includes(saved.schemaVersion) || !saved.characters || !Array.isArray(saved.history))) {
          throw new Error("Formato de persistência incompatível.");
        }
        if (saved) return saved;
      } catch (error) {
        console.warn("Leitura do IndexedDB indisponível; verificando armazenamento de compatibilidade.", error);
      }

      try {
        const raw = global.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (![1, 2].includes(parsed.schemaVersion) || !parsed.characters || !Array.isArray(parsed.history)) throw new Error("Formato incompatível.");
        this.save(parsed);
        return parsed;
      } catch (fallbackError) {
        console.warn("O estado salvo foi ignorado.", fallbackError);
        return null;
      }
    },

    async clear() {
      pendingState = null;
      global.localStorage.removeItem(STORAGE_KEY);
      try {
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
          const transaction = database.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        console.warn("Não foi possível limpar o IndexedDB.", error);
      }
    },

    export(state) {
      const payload = {
        format: "entrelinhas-experiment",
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        reproducibility: {
          seed: state.seed,
          rngState: state.rngState,
          day: state.day,
          currentStep: state.currentStep
        },
        experiment: state
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `entrelinhas-seed-${state.seed}-dia-${state.day}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    },

    key: STORAGE_KEY,
    databaseName: DATABASE_NAME
  };

  Experiment.Storage = Storage;
})(window);
