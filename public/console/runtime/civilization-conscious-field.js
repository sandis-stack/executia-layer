(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_CONSCIOUS_FIELD_V1";

  let consciousState = {
    awareness_field: "INITIALIZING",
    intentionality_state: "UNDEFINED",
    resonance_state: "DORMANT",
    collective_perception: "LIMITED",
    consciousness_density: 0,
    synchronization_depth: 0,
    identity_field: "UNSTABLE",
    active_reflections: [],
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
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const nervous = window.EXECUTIA_CIVILIZATION_NERVOUS_SYSTEM;
    const metabolism = window.EXECUTIA_CIVILIZATION_METABOLISM;
    const genome = window.EXECUTIA_CIVILIZATION_GENOME;
    const reality = window.EXECUTIA_REALITY_ENGINE;
    const quantum = window.EXECUTIA_QUANTUM_DECISION_FIELD;

    if(
      !consciousness ||
      !nervous ||
      !metabolism ||
      !genome ||
      !reality ||
      !quantum
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      consciousness: consciousness.snapshot(),
      nervous: nervous.snapshot(),
      metabolism: metabolism.snapshot(),
      genome: genome.snapshot(),
      reality: reality.snapshot(),
      quantum: quantum.snapshot()
    };
  }

  function density(runtime){
    const awareness =
      runtime.consciousness.awareness_score || 0;

    const efficiency =
      runtime.metabolism.efficiency_score || 0;

    return Math.min(
      100,
      Math.round(
        awareness * 0.6 +
        efficiency * 0.4
      )
    );
  }

  function awareness(runtime){
    const value =
      consciousState.consciousness_density;

    if(value >= 90){
      return "UNIFIED_CONSCIOUS_FIELD";
    }

    if(value >= 65){
      return "COLLECTIVE_AWARENESS_FIELD";
    }

    return "PARTIAL_AWARENESS_FIELD";
  }

  function intentionality(runtime){
    const resonance = normalize(
      runtime.quantum.resonance_state
    );

    if(resonance.includes("GLOBAL")){
      return "GLOBAL_EXECUTION_INTENT";
    }

    if(resonance.includes("ADAPTIVE")){
      return "ADAPTIVE_EXECUTION_INTENT";
    }

    return "LOCALIZED_INTENT";
  }

  function resonance(runtime){
    const sync =
      runtime.nervous.signal_velocity || 0;

    if(sync >= 85){
      return "FULL_RESONANCE";
    }

    if(sync >= 55){
      return "PARTIAL_RESONANCE";
    }

    return "WEAK_RESONANCE";
  }

  function perception(runtime){
    const truth =
      runtime.reality.truth_density || 0;

    if(truth >= 90){
      return "FULL_COLLECTIVE_PERCEPTION";
    }

    if(truth >= 60){
      return "PARTIAL_COLLECTIVE_PERCEPTION";
    }

    return "LIMITED_COLLECTIVE_PERCEPTION";
  }

  function synchronization(runtime){
    const velocity =
      runtime.nervous.signal_velocity || 0;

    const pressure =
      runtime.metabolism.metabolic_pressure || 0;

    return Math.max(
      1,
      Math.min(
        100,
        Math.round(
          velocity * 0.7 +
          pressure * 0.3
        )
      )
    );
  }

  function identity(runtime){
    const species = normalize(
      runtime.genome.species_state
    );

    if(species.includes("RECURSIVE")){
      return "RECURSIVE_EXECUTION_IDENTITY";
    }

    if(species.includes("ADAPTIVE")){
      return "ADAPTIVE_EXECUTION_IDENTITY";
    }

    return "STABLE_EXECUTION_IDENTITY";
  }

  function reflections(runtime){
    const reflections = [
      "GLOBAL_STATE_REFLECTION",
      "EXECUTION_AWARENESS",
      "COLLECTIVE_SIGNAL_MEMORY"
    ];

    if(
      normalize(
        runtime.metabolism.energy_state
      ).includes("HIGH")
    ){
      reflections.push("HIGH_ENERGY_REFLECTION");
    }

    if(
      normalize(
        runtime.quantum.arbitration_state
      ).includes("EVOLUTION")
    ){
      reflections.push("EVOLUTIONARY_REFLECTION");
    }

    return reflections;
  }

  function reflect(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    consciousState.updated_at = now();

    consciousState.consciousness_density =
      density(runtime);

    consciousState.awareness_field =
      awareness(runtime);

    consciousState.intentionality_state =
      intentionality(runtime);

    consciousState.resonance_state =
      resonance(runtime);

    consciousState.collective_perception =
      perception(runtime);

    consciousState.synchronization_depth =
      synchronization(runtime);

    consciousState.identity_field =
      identity(runtime);

    consciousState.active_reflections =
      reflections(runtime);

    emit(
      "runtime:conscious-field:update",
      snapshot()
    );

    emit(
      "runtime:collective-awareness",
      {
        awareness_field:
          consciousState.awareness_field,
        consciousness_density:
          consciousState.consciousness_density
      }
    );

    emit(
      "runtime:identity-field",
      {
        identity_field:
          consciousState.identity_field,
        intentionality_state:
          consciousState.intentionality_state
      }
    );

    emit(
      "runtime:resonance-field",
      {
        resonance_state:
          consciousState.resonance_state,
        synchronization_depth:
          consciousState.synchronization_depth
      }
    );

    return {
      ok: true,
      version: VERSION,
      conscious_field: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        consciousState.updated_at,
      awareness_field:
        consciousState.awareness_field,
      intentionality_state:
        consciousState.intentionality_state,
      resonance_state:
        consciousState.resonance_state,
      collective_perception:
        consciousState.collective_perception,
      consciousness_density:
        consciousState.consciousness_density,
      synchronization_depth:
        consciousState.synchronization_depth,
      identity_field:
        consciousState.identity_field,
      active_reflections:
        consciousState.active_reflections
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 32000);

    reflect();

    if(window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__
      );
    }

    window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__ =
      setInterval(reflect, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__
      );

      window.__EXECUTIA_CONSCIOUS_FIELD_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_CONSCIOUS_FIELD = {
      version: VERSION,
      reflect,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:conscious-field:ready",
      {
        version: VERSION
      }
    );

    reflect();

    window.dispatchEvent(
      new CustomEvent(
        "executia:conscious-field-ready",
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
