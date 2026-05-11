(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_REALITY_ENGINE_V1";

  let realityState = {
    truth_density: 0,
    divergence_state: "UNKNOWN",
    execution_certainty: "UNDEFINED",
    causal_alignment: "UNDEFINED",
    drift_level: "NONE",
    validation_score: 0,
    synchronized_reality: "PENDING",
    updated_at: null
  };

  function now(){
    return new Date().toISOString();
  }

  function emit(type, payload){
    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(type, payload);
    }
  }

  function normalize(v){
    return String(v || "").trim().toUpperCase();
  }

  function collectState(){
    const cognition = window.EXECUTIA_COGNITION_CORE;
    const simulator = window.EXECUTIA_CIVILIZATION_SIMULATOR;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const topology = window.EXECUTIA_TOPOLOGY_MESH;
    const evolution = window.EXECUTIA_EVOLUTION_CORE;

    if(
      !cognition ||
      !simulator ||
      !consciousness ||
      !topology ||
      !evolution
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      cognition: cognition.buildCognition(),
      simulation: simulator.snapshot(),
      consciousness: consciousness.snapshot(),
      topology: topology.snapshot(),
      evolution: evolution.snapshot()
    };
  }

  function computeTruthDensity(state){
    const awareness =
      state.consciousness.awareness_score || 0;

    const evolution =
      state.evolution.evolution_score || 0;

    const projection =
      state.simulation.projection_depth || 0;

    return Math.min(
      100,
      Math.round(
        awareness / 2 +
        evolution * 2 +
        projection * 3
      )
    );
  }

  function computeDivergence(state){
    const instability =
      state.cognition.instability || 0;

    const projection =
      state.simulation.projection_depth || 0;

    if(instability >= 30){
      return "CRITICAL_REALITY_DRIFT";
    }

    if(instability >= 18){
      return "STRUCTURAL_DIVERGENCE";
    }

    if(projection >= 5){
      return "PREDICTIVE_ALIGNMENT";
    }

    return "SYNCHRONIZED_REALITY";
  }

  function computeCertainty(state){
    const truth =
      realityState.truth_density;

    const awareness =
      state.consciousness.awareness_score || 0;

    if(truth >= 90 && awareness >= 90){
      return "EXECUTION_TRUTH_LOCK";
    }

    if(truth >= 60){
      return "HIGH_CERTAINTY";
    }

    if(truth >= 35){
      return "PARTIAL_CERTAINTY";
    }

    return "LOW_CERTAINTY";
  }

  function computeCausalAlignment(state){
    const topology = normalize(
      state.topology.topology_state
    );

    const vector = normalize(
      state.simulation.civilization_vector
    );

    if(
      topology.includes("CONTAINMENT") &&
      vector.includes("SURVIVAL")
    ){
      return "SURVIVAL_ALIGNMENT";
    }

    if(
      topology.includes("EVOLV") &&
      vector.includes("EXPANSION")
    ){
      return "EVOLUTION_ALIGNMENT";
    }

    return "SYNCHRONIZED_ALIGNMENT";
  }

  function computeDrift(state){
    const divergence =
      normalize(
        realityState.divergence_state
      );

    if(divergence.includes("CRITICAL")){
      return "SEVERE";
    }

    if(divergence.includes("STRUCTURAL")){
      return "MODERATE";
    }

    return "MINIMAL";
  }

  function computeValidation(state){
    const truth =
      realityState.truth_density;

    const projection =
      state.simulation.projection_depth || 0;

    return Math.min(
      100,
      Math.round(
        truth * 0.6 +
        projection * 8
      )
    );
  }

  function synchronize(){
    const state = collectState();

    if(!state.ok){
      return state;
    }

    realityState.updated_at = now();

    realityState.truth_density =
      computeTruthDensity(state);

    realityState.divergence_state =
      computeDivergence(state);

    realityState.execution_certainty =
      computeCertainty(state);

    realityState.causal_alignment =
      computeCausalAlignment(state);

    realityState.drift_level =
      computeDrift(state);

    realityState.validation_score =
      computeValidation(state);

    realityState.synchronized_reality =
      realityState.validation_score >= 70
        ? "EXECUTION_REALITY_LOCKED"
        : realityState.validation_score >= 40
          ? "PARTIAL_REALITY_ALIGNMENT"
          : "REALITY_FRAGMENTATION";

    emit(
      "runtime:reality:update",
      snapshot()
    );

    emit(
      "runtime:reality-drift",
      {
        divergence_state:
          realityState.divergence_state,
        drift_level:
          realityState.drift_level
      }
    );

    emit(
      "runtime:truth-density",
      {
        truth_density:
          realityState.truth_density,
        certainty:
          realityState.execution_certainty
      }
    );

    emit(
      "runtime:causal-alignment",
      {
        causal_alignment:
          realityState.causal_alignment,
        synchronized_reality:
          realityState.synchronized_reality
      }
    );

    return {
      ok: true,
      version: VERSION,
      reality: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        realityState.updated_at,
      truth_density:
        realityState.truth_density,
      divergence_state:
        realityState.divergence_state,
      execution_certainty:
        realityState.execution_certainty,
      causal_alignment:
        realityState.causal_alignment,
      drift_level:
        realityState.drift_level,
      validation_score:
        realityState.validation_score,
      synchronized_reality:
        realityState.synchronized_reality
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 20000);

    synchronize();

    if(window.__EXECUTIA_REALITY_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_REALITY_INTERVAL__
      );
    }

    window.__EXECUTIA_REALITY_INTERVAL__ =
      setInterval(synchronize, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_REALITY_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_REALITY_INTERVAL__
      );

      window.__EXECUTIA_REALITY_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_REALITY_ENGINE = {
      version: VERSION,
      synchronize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:reality-engine:ready",
      {
        version: VERSION
      }
    );

    synchronize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:reality-engine-ready",
        {
          detail: {
            version: VERSION
          }
        }
      )
    );
  }

  if(document.readyState === "loading"){
    document.addEventListener(
      "DOMContentLoaded",
      expose,
      { once:true }
    );
  } else {
    expose();
  }
})();
