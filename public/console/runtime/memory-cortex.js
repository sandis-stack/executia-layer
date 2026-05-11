(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_MEMORY_CORTEX_V1";
  const STORAGE_KEY = "EXECUTIA_RUNTIME_MEMORY_CORTEX_V1";
  const MAX_SNAPSHOTS = 80;
  const MAX_SIGNALS = 180;

  function now(){
    return new Date().toISOString();
  }

  function safeParse(value, fallback){
    try{
      return JSON.parse(value);
    }catch(_){
      return fallback;
    }
  }

  function load(){
    const base = {
      version: VERSION,
      created_at: now(),
      updated_at: now(),
      snapshots: [],
      signals: [],
      lineage: [],
      anchors: []
    };

    const stored = safeParse(localStorage.getItem(STORAGE_KEY), null);
    if(!stored || typeof stored !== "object") return base;

    return {
      ...base,
      ...stored,
      version: VERSION,
      snapshots: Array.isArray(stored.snapshots) ? stored.snapshots : [],
      signals: Array.isArray(stored.signals) ? stored.signals : [],
      lineage: Array.isArray(stored.lineage) ? stored.lineage : [],
      anchors: Array.isArray(stored.anchors) ? stored.anchors : []
    };
  }

  function save(memory){
    memory.updated_at = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    return memory;
  }

  function compactSnapshot(snapshot){
    const summary = snapshot && snapshot.summary ? snapshot.summary : {};
    const signals = snapshot && snapshot.signals ? snapshot.signals : {};

    return {
      timestamp: snapshot?.timestamp || now(),
      version: snapshot?.version || "UNKNOWN",
      layers: summary.layers || snapshot?.layers?.length || 0,
      risk: signals.risk || summary.risk || "UNKNOWN",
      pressure: signals.pressure || "UNKNOWN",
      synchronization: signals.synchronization || "UNKNOWN",
      response: signals.response || summary.response || "UNKNOWN",
      topology: signals.topology || summary.topology || "UNKNOWN",
      evolution: signals.evolution || summary.evolution || "UNKNOWN"
    };
  }

  function rememberSnapshot(snapshot){
    const memory = load();
    const compact = compactSnapshot(snapshot);

    memory.snapshots.push(compact);
    if(memory.snapshots.length > MAX_SNAPSHOTS){
      memory.snapshots = memory.snapshots.slice(memory.snapshots.length - MAX_SNAPSHOTS);
    }

    memory.lineage.push({
      timestamp: compact.timestamp,
      topology: compact.topology,
      response: compact.response,
      risk: compact.risk,
      evolution: compact.evolution
    });

    if(memory.lineage.length > MAX_SNAPSHOTS){
      memory.lineage = memory.lineage.slice(memory.lineage.length - MAX_SNAPSHOTS);
    }

    if(compact.risk === "CRITICAL" || compact.response === "CONTAIN_AND_REROUTE"){
      memory.anchors.push({
        timestamp: compact.timestamp,
        type: "TRUTH_INSTABILITY_ANCHOR",
        risk: compact.risk,
        response: compact.response,
        topology: compact.topology
      });
    }

    if(memory.anchors.length > 40){
      memory.anchors = memory.anchors.slice(memory.anchors.length - 40);
    }

    return save(memory);
  }

  function rememberSignal(signal){
    const memory = load();

    memory.signals.push({
      timestamp: signal?.timestamp || now(),
      type: signal?.type || "runtime:signal",
      payload: signal?.payload || {}
    });

    if(memory.signals.length > MAX_SIGNALS){
      memory.signals = memory.signals.slice(memory.signals.length - MAX_SIGNALS);
    }

    return save(memory);
  }

  function recall(){
    return load();
  }

  function clear(){
    localStorage.removeItem(STORAGE_KEY);
    return load();
  }

  function summarize(){
    const memory = load();
    const last = memory.snapshots[memory.snapshots.length - 1] || null;
    const critical = memory.snapshots.filter((x) => x.risk === "CRITICAL").length;
    const protectedCount = memory.snapshots.filter((x) => x.topology === "PROTECTED").length;
    const evolving = memory.snapshots.filter((x) => x.evolution === "ACTIVE" || x.topology === "EVOLVING").length;

    return {
      version: VERSION,
      snapshots: memory.snapshots.length,
      signals: memory.signals.length,
      lineage: memory.lineage.length,
      anchors: memory.anchors.length,
      critical_events: critical,
      protected_events: protectedCount,
      evolving_events: evolving,
      last
    };
  }

  function expose(){
    window.EXECUTIA_MEMORY_CORTEX = {
      version: VERSION,
      rememberSnapshot,
      rememberSignal,
      recall,
      clear,
      summarize
    };

    if(window.EXECUTIA_SIGNAL_BUS && typeof window.EXECUTIA_SIGNAL_BUS.on === "function"){
      window.EXECUTIA_SIGNAL_BUS.on("runtime:snapshot", (signal) => {
        rememberSnapshot(signal.payload);
      });

      window.EXECUTIA_SIGNAL_BUS.on("*", (signal) => {
        if(signal.type !== "runtime:snapshot"){
          rememberSignal(signal);
        }
      });

      window.EXECUTIA_SIGNAL_BUS.emit("runtime:memory-cortex:ready", {
        version: VERSION,
        summary: summarize()
      });
    }

    window.dispatchEvent(new CustomEvent("executia:memory-cortex-ready", {
      detail: {
        version: VERSION,
        summary: summarize()
      }
    }));
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, { once: true });
  } else {
    expose();
  }
})();
