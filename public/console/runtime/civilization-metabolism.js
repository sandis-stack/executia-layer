(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_METABOLISM_V1";

  let metabolismState = {
    energy_state: "INITIALIZING",
    circulation_state: "UNDEFINED",
    digestion_mode: "DORMANT",
    thermal_balance: "UNSTABLE",
    metabolic_pressure: 0,
    efficiency_score: 0,
    load_distribution: "UNBALANCED",
    active_streams: [],
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
    const nervous = window.EXECUTIA_CIVILIZATION_NERVOUS_SYSTEM;
    const immune = window.EXECUTIA_CIVILIZATION_IMMUNE_SYSTEM;
    const genome = window.EXECUTIA_CIVILIZATION_GENOME;
    const reality = window.EXECUTIA_REALITY_ENGINE;
    const topology = window.EXECUTIA_TOPOLOGY_MESH;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;

    if(
      !nervous ||
      !immune ||
      !genome ||
      !reality ||
      !topology ||
      !consciousness
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      nervous: nervous.snapshot(),
      immune: immune.snapshot(),
      genome: genome.snapshot(),
      reality: reality.snapshot(),
      topology: topology.snapshot(),
      consciousness: consciousness.snapshot()
    };
  }

  function metabolicPressure(runtime){
    const impulse =
      runtime.nervous.impulse_pressure || 0;

    const anomaly =
      runtime.immune.anomaly_density || 0;

    return Math.min(
      100,
      Math.round(
        impulse * 0.55 +
        anomaly * 0.45
      )
    );
  }

  function energy(runtime){
    const truth =
      runtime.reality.truth_density || 0;

    const awareness =
      runtime.consciousness.awareness_score || 0;

    if(truth >= 85 && awareness >= 85){
      return "HIGH_ENERGY_FLOW";
    }

    if(truth >= 55){
      return "STABLE_ENERGY_FLOW";
    }

    return "LIMITED_ENERGY_FLOW";
  }

  function circulation(runtime){
    const coordination = normalize(
      runtime.nervous.coordination_state
    );

    if(coordination.includes("ADAPTIVE")){
      return "ADAPTIVE_CIRCULATION";
    }

    if(coordination.includes("DEFENSIVE")){
      return "CONTAINMENT_CIRCULATION";
    }

    return "STABLE_CIRCULATION";
  }

  function digestion(runtime){
    const mutation = normalize(
      runtime.genome.mutation_state
    );

    if(mutation.includes("ACTIVE")){
      return "RECURSIVE_DIGESTION";
    }

    if(mutation.includes("CONTROLLED")){
      return "ADAPTIVE_DIGESTION";
    }

    return "BASELINE_DIGESTION";
  }

  function thermal(runtime){
    const pressure =
      metabolismState.metabolic_pressure;

    if(pressure >= 80){
      return "THERMAL_OVERLOAD";
    }

    if(pressure >= 45){
      return "ELEVATED_THERMAL_STATE";
    }

    return "BALANCED_THERMAL_FIELD";
  }

  function efficiency(runtime){
    const truth =
      runtime.reality.truth_density || 0;

    const awareness =
      runtime.consciousness.awareness_score || 0;

    const pressure =
      metabolismState.metabolic_pressure;

    return Math.max(
      1,
      Math.min(
        100,
        Math.round(
          truth * 0.5 +
          awareness * 0.4 -
          pressure * 0.15
        )
      )
    );
  }

  function distribution(runtime){
    const efficiency =
      metabolismState.efficiency_score;

    if(efficiency >= 80){
      return "OPTIMAL_DISTRIBUTION";
    }

    if(efficiency >= 50){
      return "ADAPTIVE_DISTRIBUTION";
    }

    return "FRAGMENTED_DISTRIBUTION";
  }

  function streams(runtime){
    const streams = [
      "EXECUTION_FLOW",
      "SIGNAL_FLOW",
      "MEMORY_FLOW"
    ];

    if(
      normalize(
        runtime.nervous.synchronization_field
      ).includes("FULL")
    ){
      streams.push("SYNCHRONIZATION_FLOW");
    }

    if(
      normalize(
        runtime.genome.inheritance_mode
      ).includes("DEEP")
    ){
      streams.push("LINEAGE_FLOW");
    }

    return streams;
  }

  function metabolize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    metabolismState.updated_at = now();

    metabolismState.metabolic_pressure =
      metabolicPressure(runtime);

    metabolismState.energy_state =
      energy(runtime);

    metabolismState.circulation_state =
      circulation(runtime);

    metabolismState.digestion_mode =
      digestion(runtime);

    metabolismState.thermal_balance =
      thermal(runtime);

    metabolismState.efficiency_score =
      efficiency(runtime);

    metabolismState.load_distribution =
      distribution(runtime);

    metabolismState.active_streams =
      streams(runtime);

    emit(
      "runtime:metabolism:update",
      snapshot()
    );

    emit(
      "runtime:energy-flow",
      {
        energy_state:
          metabolismState.energy_state,
        efficiency_score:
          metabolismState.efficiency_score
      }
    );

    emit(
      "runtime:thermal-balance",
      {
        thermal_balance:
          metabolismState.thermal_balance,
        metabolic_pressure:
          metabolismState.metabolic_pressure
      }
    );

    emit(
      "runtime:resource-circulation",
      {
        circulation_state:
          metabolismState.circulation_state,
        active_streams:
          metabolismState.active_streams
      }
    );

    return {
      ok: true,
      version: VERSION,
      metabolism: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        metabolismState.updated_at,
      energy_state:
        metabolismState.energy_state,
      circulation_state:
        metabolismState.circulation_state,
      digestion_mode:
        metabolismState.digestion_mode,
      thermal_balance:
        metabolismState.thermal_balance,
      metabolic_pressure:
        metabolismState.metabolic_pressure,
      efficiency_score:
        metabolismState.efficiency_score,
      load_distribution:
        metabolismState.load_distribution,
      active_streams:
        metabolismState.active_streams
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 30000);

    metabolize();

    if(window.__EXECUTIA_METABOLISM_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_METABOLISM_INTERVAL__
      );
    }

    window.__EXECUTIA_METABOLISM_INTERVAL__ =
      setInterval(metabolize, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_METABOLISM_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_METABOLISM_INTERVAL__
      );

      window.__EXECUTIA_METABOLISM_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_METABOLISM = {
      version: VERSION,
      metabolize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:metabolism:ready",
      {
        version: VERSION
      }
    );

    metabolize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:metabolism-ready",
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
