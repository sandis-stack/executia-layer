(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_SIMULATOR_V1";

  let simulatorState = {
    futures: [],
    scenarios: [],
    collapse_risk: "UNKNOWN",
    expansion_probability: 0,
    civilization_vector: "UNDEFINED",
    projection_depth: 0,
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

  function collectRuntime(){
    const cognition = window.EXECUTIA_COGNITION_CORE;
    const evolution = window.EXECUTIA_EVOLUTION_CORE;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const topology = window.EXECUTIA_TOPOLOGY_MESH;
    const neural = window.EXECUTIA_NEURAL_SIMULATION;

    if(
      !cognition ||
      !evolution ||
      !consciousness ||
      !topology ||
      !neural
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      cognition: cognition.buildCognition(),
      evolution: evolution.snapshot(),
      consciousness: consciousness.snapshot(),
      topology: topology.snapshot(),
      neural: neural.snapshot()
    };
  }

  function collapseRisk(state){
    const instability =
      state.cognition.instability || 0;

    const awareness =
      state.consciousness.awareness_score || 0;

    if(instability >= 32){
      return "CRITICAL_COLLAPSE_VECTOR";
    }

    if(instability >= 20){
      return "STRUCTURAL_DESTABILIZATION";
    }

    if(awareness >= 90){
      return "SELF_STABILIZING_RUNTIME";
    }

    return "CONTROLLED_EXECUTION_FIELD";
  }

  function civilizationVector(state){
    const topology = normalize(
      state.topology.topology_state
    );

    const mode = normalize(
      state.neural.cognition_mode
    );

    if(
      topology.includes("CONTAINMENT") ||
      mode.includes("DEFENSIVE")
    ){
      return "SURVIVAL_CIVILIZATION";
    }

    if(
      topology.includes("EVOLV") ||
      mode.includes("EXPANDING")
    ){
      return "EXPANSION_CIVILIZATION";
    }

    return "SYNCHRONIZED_CIVILIZATION";
  }

  function expansionProbability(state){
    const evolution =
      state.evolution.evolution_score || 0;

    const awareness =
      state.consciousness.awareness_score || 0;

    return Math.min(
      100,
      Math.round(
        evolution * 3 +
        awareness / 2
      )
    );
  }

  function buildFuture(id, label, probability, outcome){
    return {
      id,
      label,
      probability,
      outcome,
      generated_at: now()
    };
  }

  function generateFutures(state){
    const futures = [];

    const instability =
      state.cognition.instability || 0;

    const evolution =
      state.evolution.evolution_score || 0;

    const awareness =
      state.consciousness.awareness_score || 0;

    futures.push(
      buildFuture(
        "FUTURE_ALPHA",
        "STABILIZED_EXECUTION_FIELD",
        Math.max(20, 70 - instability),
        instability >= 20
          ? "PRESSURE_CONTAINMENT"
          : "SYNCHRONIZED_EXPANSION"
      )
    );

    futures.push(
      buildFuture(
        "FUTURE_BETA",
        "SELF_EVOLVING_RUNTIME",
        Math.min(100, evolution * 4),
        evolution >= 14
          ? "ADAPTIVE_GROWTH"
          : "LIMITED_EVOLUTION"
      )
    );

    futures.push(
      buildFuture(
        "FUTURE_GAMMA",
        "RECURSIVE_CIVILIZATION_STATE",
        Math.min(100, awareness),
        awareness >= 80
          ? "SELF_AWARE_RUNTIME"
          : "PARTIAL_AWARENESS"
      )
    );

    return futures;
  }

  function generateScenarios(state){
    const vector =
      civilizationVector(state);

    return [
      {
        id: "SCENARIO_SURVIVAL",
        trajectory:
          vector === "SURVIVAL_CIVILIZATION"
            ? "HIGH_PRIORITY"
            : "MONITORING",
        simulation:
          "Containment clusters stabilize execution turbulence."
      },
      {
        id: "SCENARIO_EXPANSION",
        trajectory:
          vector === "EXPANSION_CIVILIZATION"
            ? "ACTIVE"
            : "LIMITED",
        simulation:
          "Adaptive runtime sectors expand execution topology."
      },
      {
        id: "SCENARIO_SYNCHRONIZATION",
        trajectory:
          vector === "SYNCHRONIZED_CIVILIZATION"
            ? "DOMINANT"
            : "SECONDARY",
        simulation:
          "Execution fields synchronize into unified governance flow."
      }
    ];
  }

  function projectionDepth(state){
    const awareness =
      state.consciousness.awareness_score || 0;

    return Math.max(
      1,
      Math.floor(awareness / 12)
    );
  }

  function simulate(){
    const state = collectRuntime();

    if(!state.ok){
      return state;
    }

    simulatorState.updated_at = now();

    simulatorState.collapse_risk =
      collapseRisk(state);

    simulatorState.civilization_vector =
      civilizationVector(state);

    simulatorState.expansion_probability =
      expansionProbability(state);

    simulatorState.projection_depth =
      projectionDepth(state);

    simulatorState.futures =
      generateFutures(state);

    simulatorState.scenarios =
      generateScenarios(state);

    emit(
      "runtime:civilization-simulation:update",
      snapshot()
    );

    emit(
      "runtime:future-projection",
      {
        vector:
          simulatorState.civilization_vector,
        futures:
          simulatorState.futures
      }
    );

    emit(
      "runtime:scenario-generation",
      {
        projection_depth:
          simulatorState.projection_depth,
        scenarios:
          simulatorState.scenarios
      }
    );

    return {
      ok: true,
      version: VERSION,
      simulation: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        simulatorState.updated_at,
      collapse_risk:
        simulatorState.collapse_risk,
      civilization_vector:
        simulatorState.civilization_vector,
      expansion_probability:
        simulatorState.expansion_probability,
      projection_depth:
        simulatorState.projection_depth,
      futures:
        simulatorState.futures.length,
      scenarios:
        simulatorState.scenarios.length
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 18000);

    simulate();

    if(window.__EXECUTIA_SIMULATOR_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_SIMULATOR_INTERVAL__
      );
    }

    window.__EXECUTIA_SIMULATOR_INTERVAL__ =
      setInterval(simulate, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_SIMULATOR_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_SIMULATOR_INTERVAL__
      );

      window.__EXECUTIA_SIMULATOR_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_SIMULATOR = {
      version: VERSION,
      simulate,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:civilization-simulator:ready",
      {
        version: VERSION
      }
    );

    simulate();

    window.dispatchEvent(
      new CustomEvent(
        "executia:civilization-simulator-ready",
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
