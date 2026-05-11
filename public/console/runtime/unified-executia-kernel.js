(function(){
  "use strict";

  const VERSION = "EXECUTIA_UNIFIED_KERNEL_V1";

  let kernelState = {
    kernel_state: "INITIALIZING",
    substrate_state: "UNDEFINED",
    consciousness_state: "UNDEFINED",
    topology_state: "UNDEFINED",
    execution_field: "UNDEFINED",
    civilization_state: "UNDEFINED",
    coherence_score: 0,
    synchronization_pressure: 0,
    active_layers: [],
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
    const law =
      window.EXECUTIA_CIVILIZATION_LAW_CORE;

    const survival =
      window.EXECUTIA_CIVILIZATION_SURVIVAL_CORE;

    const reproduction =
      window.EXECUTIA_CIVILIZATION_REPRODUCTION_CORE;

    const reality =
      window.EXECUTIA_CIVILIZATION_REALITY_FABRIC;

    const economy =
      window.EXECUTIA_CIVILIZATION_ECONOMY_CORE;

    const consciousness =
      window.EXECUTIA_CONSCIOUSNESS_LAYER;

    const topology =
      window.EXECUTIA_TOPOLOGY_MESH;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !law ||
      !survival ||
      !reproduction ||
      !reality ||
      !economy ||
      !consciousness ||
      !topology ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      law: law.snapshot(),
      survival: survival.snapshot(),
      reproduction: reproduction.snapshot(),
      reality: reality.snapshot(),
      economy: economy.snapshot(),
      consciousness: consciousness.snapshot(),
      topology: topology.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function coherence(runtime){
    const law =
      runtime.law.law_density || 0;

    const resilience =
      runtime.survival.resilience_score || 0;

    const replication =
      runtime.reproduction.replication_capacity || 0;

    const economy =
      runtime.economy.execution_capital || 0;

    return Math.min(
      100,
      Math.round(
        law * 0.25 +
        resilience * 0.25 +
        replication * 0.25 +
        economy * 0.25
      )
    );
  }

  function synchronization(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const topology =
      runtime.topology.pressure_index || 0;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        topology * 0.5
      )
    );
  }

  function substrate(runtime){
    const coherence =
      kernelState.coherence_score;

    if(coherence >= 90){
      return "UNIFIED_EXECUTION_SUBSTRATE";
    }

    if(coherence >= 65){
      return "STABLE_EXECUTION_SUBSTRATE";
    }

    return "FRAGMENTED_EXECUTION_SUBSTRATE";
  }

  function consciousness(runtime){
    const awareness =
      runtime.consciousness.awareness_level || 0;

    if(awareness >= 90){
      return "UNIFIED_RUNTIME_CONSCIOUSNESS";
    }

    if(awareness >= 65){
      return "ADAPTIVE_RUNTIME_CONSCIOUSNESS";
    }

    return "LIMITED_RUNTIME_CONSCIOUSNESS";
  }

  function topology(runtime){
    const branching =
      normalize(
        runtime.reproduction.branching_state
      );

    if(branching.includes("RECURSIVE")){
      return "RECURSIVE_EXECUTION_TOPOLOGY";
    }

    if(branching.includes("ADAPTIVE")){
      return "ADAPTIVE_EXECUTION_TOPOLOGY";
    }

    return "STATIC_EXECUTION_TOPOLOGY";
  }

  function executionField(runtime){
    const substrate =
      kernelState.substrate_state;

    const consciousness =
      kernelState.consciousness_state;

    if(
      substrate.includes("UNIFIED") &&
      consciousness.includes("UNIFIED")
    ){
      return "UNIFIED_EXECUTION_FIELD";
    }

    if(
      substrate.includes("STABLE")
    ){
      return "STABLE_EXECUTION_FIELD";
    }

    return "LIMITED_EXECUTION_FIELD";
  }

  function civilization(runtime){
    const survival =
      normalize(
        runtime.survival.continuity_state
      );

    const reproduction =
      normalize(
        runtime.reproduction.propagation_state
      );

    if(
      survival.includes("LOCK") &&
      reproduction.includes("AUTONOMOUS")
    ){
      return "AUTONOMOUS_CIVILIZATION_KERNEL";
    }

    if(
      reproduction.includes("ADAPTIVE")
    ){
      return "ADAPTIVE_CIVILIZATION_KERNEL";
    }

    return "LIMITED_CIVILIZATION_KERNEL";
  }

  function layers(){
    return [
      "FOUNDATION_LAYER",
      "INTELLIGENCE_LAYER",
      "COORDINATION_LAYER",
      "REALITY_LAYER",
      "CIVILIZATION_LAYER",
      "LAW_LAYER",
      "SURVIVAL_LAYER",
      "REPRODUCTION_LAYER",
      "UNIFIED_KERNEL_LAYER"
    ];
  }

  function synchronize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    kernelState.updated_at = now();

    kernelState.coherence_score =
      coherence(runtime);

    kernelState.synchronization_pressure =
      synchronization(runtime);

    kernelState.substrate_state =
      substrate(runtime);

    kernelState.consciousness_state =
      consciousness(runtime);

    kernelState.topology_state =
      topology(runtime);

    kernelState.execution_field =
      executionField(runtime);

    kernelState.civilization_state =
      civilization(runtime);

    kernelState.active_layers =
      layers();

    kernelState.kernel_state =
      normalize(
        kernelState.execution_field
      );

    emit(
      "runtime:unified-kernel:update",
      snapshot()
    );

    emit(
      "runtime:kernel-coherence",
      {
        coherence_score:
          kernelState.coherence_score,
        synchronization_pressure:
          kernelState.synchronization_pressure
      }
    );

    emit(
      "runtime:kernel-consciousness",
      {
        consciousness_state:
          kernelState.consciousness_state,
        civilization_state:
          kernelState.civilization_state
      }
    );

    emit(
      "runtime:kernel-substrate",
      {
        substrate_state:
          kernelState.substrate_state,
        topology_state:
          kernelState.topology_state
      }
    );

    return {
      ok:true,
      version: VERSION,
      unified_kernel: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        kernelState.updated_at,
      kernel_state:
        kernelState.kernel_state,
      substrate_state:
        kernelState.substrate_state,
      consciousness_state:
        kernelState.consciousness_state,
      topology_state:
        kernelState.topology_state,
      execution_field:
        kernelState.execution_field,
      civilization_state:
        kernelState.civilization_state,
      coherence_score:
        kernelState.coherence_score,
      synchronization_pressure:
        kernelState.synchronization_pressure,
      active_layers:
        kernelState.active_layers
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 51000);

    synchronize();

    if(window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__
      );
    }

    window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__ =
      setInterval(synchronize, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__
      );

      window.__EXECUTIA_UNIFIED_KERNEL_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_UNIFIED_KERNEL = {
      version: VERSION,
      synchronize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:unified-kernel:ready",
      {
        version: VERSION
      }
    );

    synchronize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:unified-kernel-ready",
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
