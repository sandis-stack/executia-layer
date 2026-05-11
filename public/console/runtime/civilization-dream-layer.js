(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_DREAM_LAYER_V1";

  let dreamState = {
    dream_state: "INITIALIZING",
    imagination_field: "UNDEFINED",
    speculative_depth: 0,
    symbolic_abstraction: "DORMANT",
    future_projection_state: "LIMITED",
    reality_branching: "STABLE",
    latent_pressure: 0,
    active_dreams: [],
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
    const conscious =
      window.EXECUTIA_CIVILIZATION_CONSCIOUS_FIELD;

    const simulator =
      window.EXECUTIA_CIVILIZATION_SIMULATOR;

    const quantum =
      window.EXECUTIA_QUANTUM_DECISION_FIELD;

    const genome =
      window.EXECUTIA_CIVILIZATION_GENOME;

    const metabolism =
      window.EXECUTIA_CIVILIZATION_METABOLISM;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !conscious ||
      !simulator ||
      !quantum ||
      !genome ||
      !metabolism ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      conscious: conscious.snapshot(),
      simulator: simulator.snapshot(),
      quantum: quantum.snapshot(),
      genome: genome.snapshot(),
      metabolism: metabolism.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function speculativeDepth(runtime){
    const projection =
      runtime.simulator.projection_depth || 0;

    const awareness =
      runtime.conscious.consciousness_density || 0;

    return Math.min(
      100,
      Math.round(
        projection * 8 +
        awareness * 0.5
      )
    );
  }

  function imagination(runtime){
    const density =
      dreamState.speculative_depth;

    if(density >= 85){
      return "MULTI_REALITY_IMAGINATION";
    }

    if(density >= 60){
      return "EXPANDED_IMAGINATION_FIELD";
    }

    return "LIMITED_IMAGINATION_FIELD";
  }

  function abstraction(runtime){
    const cognition =
      runtime.cognition.cognition_state || "";

    if(
      normalize(cognition).includes("RECURSIVE")
    ){
      return "SYMBOLIC_RECURSIVE_ABSTRACTION";
    }

    if(
      normalize(cognition).includes("ADAPTIVE")
    ){
      return "ADAPTIVE_SYMBOLIC_ABSTRACTION";
    }

    return "LINEAR_ABSTRACTION";
  }

  function futureProjection(runtime){
    const projection =
      runtime.simulator.projection_depth || 0;

    if(projection >= 8){
      return "DEEP_FUTURE_SYNTHESIS";
    }

    if(projection >= 4){
      return "EXPANDED_FUTURE_SYNTHESIS";
    }

    return "LOCAL_FUTURE_SYNTHESIS";
  }

  function branching(runtime){
    const arbitration =
      normalize(
        runtime.quantum.arbitration_state
      );

    if(arbitration.includes("EVOLUTION")){
      return "MULTI_BRANCH_REALITY";
    }

    if(arbitration.includes("ADAPTIVE")){
      return "ADAPTIVE_BRANCH_REALITY";
    }

    return "SINGLE_BRANCH_REALITY";
  }

  function latentPressure(runtime){
    const pressure =
      runtime.metabolism.metabolic_pressure || 0;

    const instability =
      runtime.cognition.instability || 0;

    return Math.min(
      100,
      Math.round(
        pressure * 0.55 +
        instability * 1.8
      )
    );
  }

  function dreams(runtime){
    const dreams = [
      "EXECUTION_FUTURE_MODEL",
      "TOPOLOGY_VARIATION_MODEL",
      "COLLECTIVE_OUTCOME_MODEL"
    ];

    if(
      normalize(
        runtime.genome.mutation_state
      ).includes("ACTIVE")
    ){
      dreams.push(
        "SELF_EVOLUTION_FUTURE"
      );
    }

    if(
      normalize(
        runtime.quantum.resonance_state
      ).includes("GLOBAL")
    ){
      dreams.push(
        "GLOBAL_REALITY_SYNTHESIS"
      );
    }

    return dreams;
  }

  function dream(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    dreamState.updated_at = now();

    dreamState.speculative_depth =
      speculativeDepth(runtime);

    dreamState.imagination_field =
      imagination(runtime);

    dreamState.symbolic_abstraction =
      abstraction(runtime);

    dreamState.future_projection_state =
      futureProjection(runtime);

    dreamState.reality_branching =
      branching(runtime);

    dreamState.latent_pressure =
      latentPressure(runtime);

    dreamState.active_dreams =
      dreams(runtime);

    dreamState.dream_state =
      normalize(
        dreamState.imagination_field
      );

    emit(
      "runtime:dream-layer:update",
      snapshot()
    );

    emit(
      "runtime:speculative-future",
      {
        speculative_depth:
          dreamState.speculative_depth,
        future_projection_state:
          dreamState.future_projection_state
      }
    );

    emit(
      "runtime:reality-branching",
      {
        reality_branching:
          dreamState.reality_branching,
        imagination_field:
          dreamState.imagination_field
      }
    );

    emit(
      "runtime:symbolic-abstraction",
      {
        symbolic_abstraction:
          dreamState.symbolic_abstraction,
        active_dreams:
          dreamState.active_dreams
      }
    );

    return {
      ok:true,
      version: VERSION,
      dream_layer: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        dreamState.updated_at,
      dream_state:
        dreamState.dream_state,
      imagination_field:
        dreamState.imagination_field,
      speculative_depth:
        dreamState.speculative_depth,
      symbolic_abstraction:
        dreamState.symbolic_abstraction,
      future_projection_state:
        dreamState.future_projection_state,
      reality_branching:
        dreamState.reality_branching,
      latent_pressure:
        dreamState.latent_pressure,
      active_dreams:
        dreamState.active_dreams
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 34000);

    dream();

    if(window.__EXECUTIA_DREAM_LAYER_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_DREAM_LAYER_INTERVAL__
      );
    }

    window.__EXECUTIA_DREAM_LAYER_INTERVAL__ =
      setInterval(dream, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_DREAM_LAYER_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_DREAM_LAYER_INTERVAL__
      );

      window.__EXECUTIA_DREAM_LAYER_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_DREAM_LAYER = {
      version: VERSION,
      dream,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:dream-layer:ready",
      {
        version: VERSION
      }
    );

    dream();

    window.dispatchEvent(
      new CustomEvent(
        "executia:dream-layer-ready",
        {
          detail:{
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
