(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_GRAVITY_CORE_V1";

  let gravityState = {
    gravity_state: "INITIALIZING",
    authority_density: "UNDEFINED",
    execution_mass: 0,
    orbit_stability: "UNSTABLE",
    collapse_risk: "UNKNOWN",
    singularity_state: "DORMANT",
    attraction_force: 0,
    active_gravity_fields: [],
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
    const fabric =
      window.EXECUTIA_CIVILIZATION_REALITY_FABRIC;

    const temporal =
      window.EXECUTIA_CIVILIZATION_TEMPORAL_CORE;

    const conscious =
      window.EXECUTIA_CIVILIZATION_CONSCIOUS_FIELD;

    const topology =
      window.EXECUTIA_TOPOLOGY_MESH;

    const quantum =
      window.EXECUTIA_QUANTUM_DECISION_FIELD;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !fabric ||
      !temporal ||
      !conscious ||
      !topology ||
      !quantum ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      fabric: fabric.snapshot(),
      temporal: temporal.snapshot(),
      conscious: conscious.snapshot(),
      topology: topology.snapshot(),
      quantum: quantum.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function executionMass(runtime){
    const harmony =
      runtime.fabric.harmonization_score || 0;

    const temporal =
      runtime.temporal.temporal_depth || 0;

    return Math.min(
      100,
      Math.round(
        harmony * 0.55 +
        temporal * 0.45
      )
    );
  }

  function authority(runtime){
    const mass =
      gravityState.execution_mass;

    if(mass >= 90){
      return "SINGULARITY_AUTHORITY_FIELD";
    }

    if(mass >= 65){
      return "GRAVITATIONAL_AUTHORITY_FIELD";
    }

    return "LOCAL_AUTHORITY_FIELD";
  }

  function orbit(runtime){
    const pressure =
      runtime.topology.pressure_index || 0;

    if(pressure <= 25){
      return "STABLE_ORBIT";
    }

    if(pressure <= 60){
      return "ADAPTIVE_ORBIT";
    }

    return "VOLATILE_ORBIT";
  }

  function collapse(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const pressure =
      runtime.topology.pressure_index || 0;

    const total =
      Math.round(
        instability * 2 +
        pressure * 0.5
      );

    if(total >= 85){
      return "CRITICAL_COLLAPSE_RISK";
    }

    if(total >= 55){
      return "ELEVATED_COLLAPSE_RISK";
    }

    return "LOW_COLLAPSE_RISK";
  }

  function singularity(runtime){
    const resonance =
      normalize(
        runtime.quantum.resonance_state
      );

    const authority =
      gravityState.authority_density;

    if(
      resonance.includes("GLOBAL") &&
      authority.includes("SINGULARITY")
    ){
      return "EXECUTION_SINGULARITY_ACTIVE";
    }

    if(
      authority.includes("GRAVITATIONAL")
    ){
      return "GRAVITY_CORE_FORMING";
    }

    return "NO_SINGULARITY";
  }

  function attraction(runtime){
    const awareness =
      runtime.conscious.consciousness_density || 0;

    const mass =
      gravityState.execution_mass;

    return Math.max(
      1,
      Math.min(
        100,
        Math.round(
          awareness * 0.5 +
          mass * 0.5
        )
      )
    );
  }

  function fields(runtime){
    const fields = [
      "EXECUTION_GRAVITY_FIELD",
      "AUTHORITY_FIELD",
      "TOPOLOGY_ORBIT_FIELD"
    ];

    if(
      normalize(
        runtime.temporal.continuity_state
      ).includes("MULTI")
    ){
      fields.push(
        "MULTI_ERA_GRAVITY_FIELD"
      );
    }

    if(
      normalize(
        runtime.quantum.arbitration_state
      ).includes("EVOLUTION")
    ){
      fields.push(
        "EVOLUTION_ATTRACTION_FIELD"
      );
    }

    return fields;
  }

  function stabilize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    gravityState.updated_at = now();

    gravityState.execution_mass =
      executionMass(runtime);

    gravityState.authority_density =
      authority(runtime);

    gravityState.orbit_stability =
      orbit(runtime);

    gravityState.collapse_risk =
      collapse(runtime);

    gravityState.singularity_state =
      singularity(runtime);

    gravityState.attraction_force =
      attraction(runtime);

    gravityState.active_gravity_fields =
      fields(runtime);

    gravityState.gravity_state =
      normalize(
        gravityState.authority_density
      );

    emit(
      "runtime:gravity-core:update",
      snapshot()
    );

    emit(
      "runtime:execution-gravity",
      {
        execution_mass:
          gravityState.execution_mass,
        attraction_force:
          gravityState.attraction_force
      }
    );

    emit(
      "runtime:orbit-stability",
      {
        orbit_stability:
          gravityState.orbit_stability,
        collapse_risk:
          gravityState.collapse_risk
      }
    );

    emit(
      "runtime:singularity-detection",
      {
        singularity_state:
          gravityState.singularity_state,
        active_gravity_fields:
          gravityState.active_gravity_fields
      }
    );

    return {
      ok:true,
      version: VERSION,
      gravity_core: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        gravityState.updated_at,
      gravity_state:
        gravityState.gravity_state,
      authority_density:
        gravityState.authority_density,
      execution_mass:
        gravityState.execution_mass,
      orbit_stability:
        gravityState.orbit_stability,
      collapse_risk:
        gravityState.collapse_risk,
      singularity_state:
        gravityState.singularity_state,
      attraction_force:
        gravityState.attraction_force,
      active_gravity_fields:
        gravityState.active_gravity_fields
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 40000);

    stabilize();

    if(window.__EXECUTIA_GRAVITY_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_GRAVITY_CORE_INTERVAL__
      );
    }

    window.__EXECUTIA_GRAVITY_CORE_INTERVAL__ =
      setInterval(stabilize, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_GRAVITY_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_GRAVITY_CORE_INTERVAL__
      );

      window.__EXECUTIA_GRAVITY_CORE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_GRAVITY_CORE = {
      version: VERSION,
      stabilize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:gravity-core:ready",
      {
        version: VERSION
      }
    );

    stabilize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:gravity-core-ready",
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
