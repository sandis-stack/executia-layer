(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_QUANTUM_DECISION_FIELD_V1";

  let quantumState = {
    branches: [],
    arbitration_state: "INITIALIZING",
    uncertainty_field: "UNKNOWN",
    dominant_path: "UNDEFINED",
    collapse_state: "PENDING",
    probability_density: 0,
    synchronization_state: "UNSTABLE",
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
    const simulator = window.EXECUTIA_CIVILIZATION_SIMULATOR;
    const reality = window.EXECUTIA_REALITY_ENGINE;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const neural = window.EXECUTIA_NEURAL_SIMULATION;

    if(
      !cognition ||
      !simulator ||
      !reality ||
      !consciousness ||
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
      simulation: simulator.snapshot(),
      reality: reality.snapshot(),
      consciousness: consciousness.snapshot(),
      neural: neural.snapshot()
    };
  }

  function createBranch(id, label, probability, state){
    return {
      id,
      label,
      probability,
      state,
      generated_at: now()
    };
  }

  function generateBranches(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const truth =
      runtime.reality.truth_density || 0;

    const awareness =
      runtime.consciousness.awareness_score || 0;

    const branches = [];

    branches.push(
      createBranch(
        "BRANCH_ALPHA",
        "SURVIVAL_PATH",
        Math.max(15, instability * 2),
        instability >= 25
          ? "CRITICAL_DEFENSE"
          : "CONTAINED"
      )
    );

    branches.push(
      createBranch(
        "BRANCH_BETA",
        "EXPANSION_PATH",
        Math.min(100, awareness),
        awareness >= 80
          ? "SELF_EXPANDING"
          : "LIMITED_EXPANSION"
      )
    );

    branches.push(
      createBranch(
        "BRANCH_GAMMA",
        "SYNCHRONIZATION_PATH",
        Math.min(100, truth),
        truth >= 70
          ? "ALIGNED_REALITY"
          : "PARTIAL_ALIGNMENT"
      )
    );

    return branches;
  }

  function dominantBranch(branches){
    return branches
      .slice()
      .sort(
        (a, b) =>
          Number(b.probability) -
          Number(a.probability)
      )[0];
  }

  function uncertainty(runtime){
    const instability =
      runtime.cognition.instability || 0;

    if(instability >= 30){
      return "HIGH_UNCERTAINTY";
    }

    if(instability >= 18){
      return "MODERATE_UNCERTAINTY";
    }

    return "LOW_UNCERTAINTY";
  }

  function arbitration(branch){
    const label = normalize(branch.label);

    if(label.includes("SURVIVAL")){
      return "DEFENSIVE_ARBITRATION";
    }

    if(label.includes("EXPANSION")){
      return "EVOLUTIONARY_ARBITRATION";
    }

    return "SYNCHRONIZED_ARBITRATION";
  }

  function collapse(branch){
    const state = normalize(branch.state);

    if(state.includes("CRITICAL")){
      return "FORCED_COLLAPSE";
    }

    if(state.includes("SELF")){
      return "SELF_EXPANDING_COLLAPSE";
    }

    return "STABILIZED_COLLAPSE";
  }

  function synchronization(branch){
    const label = normalize(branch.label);

    if(label.includes("SYNCHRONIZATION")){
      return "REALITY_LOCKED";
    }

    if(label.includes("EXPANSION")){
      return "ADAPTIVE_SYNC";
    }

    return "CONTAINMENT_SYNC";
  }

  function density(branches){
    const total = branches.reduce(
      (sum, branch) =>
        sum + Number(branch.probability || 0),
      0
    );

    return Math.min(
      100,
      Math.round(total / branches.length)
    );
  }

  function arbitrate(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    quantumState.updated_at = now();

    quantumState.branches =
      generateBranches(runtime);

    const dominant =
      dominantBranch(
        quantumState.branches
      );

    quantumState.dominant_path =
      dominant.label;

    quantumState.arbitration_state =
      arbitration(dominant);

    quantumState.collapse_state =
      collapse(dominant);

    quantumState.synchronization_state =
      synchronization(dominant);

    quantumState.uncertainty_field =
      uncertainty(runtime);

    quantumState.probability_density =
      density(
        quantumState.branches
      );

    emit(
      "runtime:quantum-field:update",
      snapshot()
    );

    emit(
      "runtime:probability-branches",
      {
        dominant_path:
          quantumState.dominant_path,
        branches:
          quantumState.branches
      }
    );

    emit(
      "runtime:decision-collapse",
      {
        collapse_state:
          quantumState.collapse_state,
        arbitration_state:
          quantumState.arbitration_state
      }
    );

    emit(
      "runtime:uncertainty-field",
      {
        uncertainty_field:
          quantumState.uncertainty_field,
        probability_density:
          quantumState.probability_density
      }
    );

    return {
      ok: true,
      version: VERSION,
      quantum: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        quantumState.updated_at,
      arbitration_state:
        quantumState.arbitration_state,
      uncertainty_field:
        quantumState.uncertainty_field,
      dominant_path:
        quantumState.dominant_path,
      collapse_state:
        quantumState.collapse_state,
      probability_density:
        quantumState.probability_density,
      synchronization_state:
        quantumState.synchronization_state,
      branches:
        quantumState.branches.length
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 22000);

    arbitrate();

    if(window.__EXECUTIA_QUANTUM_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_QUANTUM_INTERVAL__
      );
    }

    window.__EXECUTIA_QUANTUM_INTERVAL__ =
      setInterval(arbitrate, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_QUANTUM_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_QUANTUM_INTERVAL__
      );

      window.__EXECUTIA_QUANTUM_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_QUANTUM_DECISION_FIELD = {
      version: VERSION,
      arbitrate,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:quantum-field:ready",
      {
        version: VERSION
      }
    );

    arbitrate();

    window.dispatchEvent(
      new CustomEvent(
        "executia:quantum-field-ready",
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
