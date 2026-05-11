(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_EVOLUTION_CORE_V1";

  let evolutionState = {
    generation: 1,
    adaptation_mode: "INITIALIZING",
    orchestration_pattern: "STATIC",
    synchronization_strategy: "BALANCED",
    pressure_policy: "CONTROLLED",
    topology_behavior: "STABLE",
    evolution_score: 0,
    mutation_count: 0,
    updated_at: null
  };

  function now(){
    return new Date().toISOString();
  }

  function normalize(v){
    return String(v || "").trim().toUpperCase();
  }

  function emit(type, payload){
    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(type, payload);
    }
  }

  function analyzeHistory(){
    const memory = window.EXECUTIA_MEMORY_CORTEX;

    if(!memory){
      return {
        ok: false,
        reason: "MEMORY_CORTEX_NOT_READY"
      };
    }

    const recall = memory.recall();
    const lineage = Array.isArray(recall.lineage)
      ? recall.lineage.slice(-20)
      : [];

    let instability = 0;
    let evolution = 0;
    let containment = 0;

    lineage.forEach((entry) => {
      const risk = normalize(entry.risk);
      const topo = normalize(entry.topology);
      const response = normalize(entry.response);

      if(risk === "CRITICAL") instability += 5;
      else if(risk === "ELEVATED") instability += 3;

      if(topo.includes("EVOLV")) evolution += 4;
      if(response.includes("CONTAIN")) containment += 3;
    });

    return {
      ok: true,
      instability,
      evolution,
      containment,
      lineage_depth: lineage.length
    };
  }

  function mutate(history){
    if(!history.ok) return;

    evolutionState.updated_at = now();
    evolutionState.generation += 1;

    if(history.instability >= 28){

      evolutionState.adaptation_mode = "SURVIVAL";
      evolutionState.orchestration_pattern = "CONTAINMENT_SWARM";
      evolutionState.synchronization_strategy = "ISOLATED_SYNC";
      evolutionState.pressure_policy = "PRESSURE_SUPPRESSION";
      evolutionState.topology_behavior = "DEFENSIVE_RECONFIGURATION";
      evolutionState.evolution_score += 2;
      evolutionState.mutation_count += 1;

      emit("runtime:evolution:survival-mutation", {
        generation: evolutionState.generation,
        instability: history.instability
      });

      return;
    }

    if(history.evolution >= 24){

      evolutionState.adaptation_mode = "EXPANSION";
      evolutionState.orchestration_pattern = "ADAPTIVE_MESH";
      evolutionState.synchronization_strategy = "DYNAMIC_FLOW";
      evolutionState.pressure_policy = "PRESSURE_REDISTRIBUTION";
      evolutionState.topology_behavior = "SELF_EXPANDING_CLUSTER";
      evolutionState.evolution_score += 5;
      evolutionState.mutation_count += 2;

      emit("runtime:evolution:expansion-mutation", {
        generation: evolutionState.generation,
        evolution: history.evolution
      });

      return;
    }

    if(history.containment >= 12){

      evolutionState.adaptation_mode = "RECOVERY";
      evolutionState.orchestration_pattern = "STABILIZATION_GRID";
      evolutionState.synchronization_strategy = "PRESSURE_BALANCING";
      evolutionState.pressure_policy = "CONTAINMENT_BALANCE";
      evolutionState.topology_behavior = "CONTROLLED_RECOVERY";
      evolutionState.evolution_score += 3;
      evolutionState.mutation_count += 1;

      emit("runtime:evolution:recovery-mutation", {
        generation: evolutionState.generation,
        containment: history.containment
      });

      return;
    }

    evolutionState.adaptation_mode = "OPTIMIZATION";
    evolutionState.orchestration_pattern = "SYNCHRONIZED_RUNTIME";
    evolutionState.synchronization_strategy = "UNIFIED_FLOW";
    evolutionState.pressure_policy = "BALANCED_PRESSURE";
    evolutionState.topology_behavior = "SELF_BALANCING_FIELD";
    evolutionState.evolution_score += 1;

    emit("runtime:evolution:optimization-cycle", {
      generation: evolutionState.generation
    });
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at: evolutionState.updated_at,
      generation: evolutionState.generation,
      adaptation_mode: evolutionState.adaptation_mode,
      orchestration_pattern: evolutionState.orchestration_pattern,
      synchronization_strategy: evolutionState.synchronization_strategy,
      pressure_policy: evolutionState.pressure_policy,
      topology_behavior: evolutionState.topology_behavior,
      evolution_score: evolutionState.evolution_score,
      mutation_count: evolutionState.mutation_count
    };
  }

  function evolve(){
    const history = analyzeHistory();

    mutate(history);

    const state = snapshot();

    emit("runtime:evolution-core:update", state);

    emit("runtime:topology:mutation", {
      generation: state.generation,
      topology_behavior: state.topology_behavior,
      adaptation_mode: state.adaptation_mode
    });

    emit("runtime:orchestration:evolution", {
      orchestration_pattern: state.orchestration_pattern,
      synchronization_strategy: state.synchronization_strategy
    });

    return {
      ok: true,
      version: VERSION,
      history,
      state
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 12000);

    evolve();

    if(window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__){
      clearInterval(window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__);
    }

    window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__ =
      setInterval(evolve, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__){
      clearInterval(window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__);
      window.__EXECUTIA_EVOLUTION_CORE_INTERVAL__ = null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_EVOLUTION_CORE = {
      version: VERSION,
      evolve,
      snapshot,
      start,
      stop
    };

    emit("runtime:evolution-core:ready", {
      version: VERSION
    });

    evolve();

    window.dispatchEvent(
      new CustomEvent(
        "executia:evolution-core-ready",
        {
          detail: {
            version: VERSION
          }
        }
      )
    );
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, {
      once:true
    });
  } else {
    expose();
  }
})();
