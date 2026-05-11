(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_LAW_CORE_V1";

  let lawState = {
    law_state: "INITIALIZING",
    constitutional_integrity: "UNDEFINED",
    enforcement_state: "LIMITED",
    violation_pressure: 0,
    correction_state: "DORMANT",
    law_density: 0,
    hierarchy_state: "UNDEFINED",
    active_laws: [],
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
    const reality =
      window.EXECUTIA_CIVILIZATION_REALITY_FABRIC;

    const gravity =
      window.EXECUTIA_CIVILIZATION_GRAVITY_CORE;

    const economy =
      window.EXECUTIA_CIVILIZATION_ECONOMY_CORE;

    const immune =
      window.EXECUTIA_CIVILIZATION_IMMUNE_SYSTEM;

    const consciousness =
      window.EXECUTIA_CONSCIOUSNESS_LAYER;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !reality ||
      !gravity ||
      !economy ||
      !immune ||
      !consciousness ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      reality: reality.snapshot(),
      gravity: gravity.snapshot(),
      economy: economy.snapshot(),
      immune: immune.snapshot(),
      consciousness: consciousness.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function lawDensity(runtime){
    const coherence =
      runtime.reality.harmonization_score || 0;

    const gravity =
      runtime.gravity.execution_mass || 0;

    return Math.min(
      100,
      Math.round(
        coherence * 0.5 +
        gravity * 0.5
      )
    );
  }

  function constitutionalIntegrity(runtime){
    const density =
      lawState.law_density;

    if(density >= 90){
      return "IMMUTABLE_CONSTITUTIONAL_STATE";
    }

    if(density >= 65){
      return "STABLE_CONSTITUTIONAL_STATE";
    }

    return "FRAGMENTED_CONSTITUTIONAL_STATE";
  }

  function enforcement(runtime){
    const immune =
      normalize(
        runtime.immune.immunity_state
      );

    if(immune.includes("ACTIVE")){
      return "ACTIVE_ENFORCEMENT";
    }

    if(immune.includes("ADAPTIVE")){
      return "ADAPTIVE_ENFORCEMENT";
    }

    return "LIMITED_ENFORCEMENT";
  }

  function violation(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const pressure =
      runtime.economy.resource_pressure || 0;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        pressure * 0.45
      )
    );
  }

  function correction(runtime){
    const pressure =
      lawState.violation_pressure;

    if(pressure >= 85){
      return "CRITICAL_STRUCTURAL_CORRECTION";
    }

    if(pressure >= 55){
      return "ADAPTIVE_STRUCTURAL_CORRECTION";
    }

    return "PASSIVE_CORRECTION_STATE";
  }

  function hierarchy(runtime){
    const awareness =
      runtime.consciousness.awareness_level || 0;

    if(awareness >= 90){
      return "SELF_EVOLVING_LAW_HIERARCHY";
    }

    if(awareness >= 65){
      return "ADAPTIVE_LAW_HIERARCHY";
    }

    return "STATIC_LAW_HIERARCHY";
  }

  function laws(runtime){
    const laws = [
      "EXECUTION_INTEGRITY_LAW",
      "REALITY_COHERENCE_LAW",
      "STRUCTURAL_CONTINUITY_LAW"
    ];

    if(
      normalize(
        runtime.gravity.singularity_state
      ).includes("ACTIVE")
    ){
      laws.push(
        "SINGULARITY_STABILIZATION_LAW"
      );
    }

    if(
      normalize(
        runtime.economy.optimization_state
      ).includes("SELF")
    ){
      laws.push(
        "AUTONOMOUS_RESOURCE_LAW"
      );
    }

    return laws;
  }

  function enforce(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    lawState.updated_at = now();

    lawState.law_density =
      lawDensity(runtime);

    lawState.constitutional_integrity =
      constitutionalIntegrity(runtime);

    lawState.enforcement_state =
      enforcement(runtime);

    lawState.violation_pressure =
      violation(runtime);

    lawState.correction_state =
      correction(runtime);

    lawState.hierarchy_state =
      hierarchy(runtime);

    lawState.active_laws =
      laws(runtime);

    lawState.law_state =
      normalize(
        lawState.constitutional_integrity
      );

    emit(
      "runtime:law-core:update",
      snapshot()
    );

    emit(
      "runtime:constitutional-integrity",
      {
        constitutional_integrity:
          lawState.constitutional_integrity,
        law_density:
          lawState.law_density
      }
    );

    emit(
      "runtime:law-enforcement",
      {
        enforcement_state:
          lawState.enforcement_state,
        correction_state:
          lawState.correction_state
      }
    );

    emit(
      "runtime:law-hierarchy",
      {
        hierarchy_state:
          lawState.hierarchy_state,
        active_laws:
          lawState.active_laws
      }
    );

    return {
      ok:true,
      version: VERSION,
      law_core: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        lawState.updated_at,
      law_state:
        lawState.law_state,
      constitutional_integrity:
        lawState.constitutional_integrity,
      enforcement_state:
        lawState.enforcement_state,
      violation_pressure:
        lawState.violation_pressure,
      correction_state:
        lawState.correction_state,
      law_density:
        lawState.law_density,
      hierarchy_state:
        lawState.hierarchy_state,
      active_laws:
        lawState.active_laws
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 45000);

    enforce();

    if(window.__EXECUTIA_LAW_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_LAW_CORE_INTERVAL__
      );
    }

    window.__EXECUTIA_LAW_CORE_INTERVAL__ =
      setInterval(enforce, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_LAW_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_LAW_CORE_INTERVAL__
      );

      window.__EXECUTIA_LAW_CORE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_LAW_CORE = {
      version: VERSION,
      enforce,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:law-core:ready",
      {
        version: VERSION
      }
    );

    enforce();

    window.dispatchEvent(
      new CustomEvent(
        "executia:law-core-ready",
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
