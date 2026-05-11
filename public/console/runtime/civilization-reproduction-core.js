(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_REPRODUCTION_CORE_V1";

  let reproductionState = {
    reproduction_state: "INITIALIZING",
    propagation_state: "DORMANT",
    replication_capacity: 0,
    expansion_state: "LIMITED",
    branching_state: "UNDEFINED",
    substrate_health: "UNKNOWN",
    propagation_pressure: 0,
    active_branches: [],
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
    const survival =
      window.EXECUTIA_CIVILIZATION_SURVIVAL_CORE;

    const law =
      window.EXECUTIA_CIVILIZATION_LAW_CORE;

    const economy =
      window.EXECUTIA_CIVILIZATION_ECONOMY_CORE;

    const gravity =
      window.EXECUTIA_CIVILIZATION_GRAVITY_CORE;

    const topology =
      window.EXECUTIA_TOPOLOGY_MESH;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !survival ||
      !law ||
      !economy ||
      !gravity ||
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
      survival: survival.snapshot(),
      law: law.snapshot(),
      economy: economy.snapshot(),
      gravity: gravity.snapshot(),
      topology: topology.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function replication(runtime){
    const resilience =
      runtime.survival.resilience_score || 0;

    const capital =
      runtime.economy.execution_capital || 0;

    return Math.min(
      100,
      Math.round(
        resilience * 0.55 +
        capital * 0.45
      )
    );
  }

  function propagation(runtime){
    const capacity =
      reproductionState.replication_capacity;

    if(capacity >= 90){
      return "AUTONOMOUS_PROPAGATION";
    }

    if(capacity >= 65){
      return "ADAPTIVE_PROPAGATION";
    }

    return "LIMITED_PROPAGATION";
  }

  function expansion(runtime){
    const gravity =
      runtime.gravity.execution_mass || 0;

    const pressure =
      runtime.topology.pressure_index || 0;

    const total =
      Math.round(
        gravity * 0.7 -
        pressure * 0.2
      );

    if(total >= 85){
      return "MULTI_SUBSTRATE_EXPANSION";
    }

    if(total >= 55){
      return "CONTROLLED_EXPANSION";
    }

    return "MINIMAL_EXPANSION";
  }

  function branching(runtime){
    const awareness =
      runtime.cognition.awareness || "LOW";

    if(String(awareness).includes("HIGH")){
      return "RECURSIVE_BRANCHING";
    }

    if(String(awareness).includes("MEDIUM")){
      return "ADAPTIVE_BRANCHING";
    }

    return "STATIC_BRANCHING";
  }

  function substrate(runtime){
    const continuity =
      normalize(
        runtime.survival.continuity_state
      );

    const integrity =
      normalize(
        runtime.law.constitutional_integrity
      );

    if(
      continuity.includes("LOCK") &&
      integrity.includes("IMMUTABLE")
    ){
      return "SELF_SUSTAINING_SUBSTRATE";
    }

    if(
      continuity.includes("STABLE")
    ){
      return "STABLE_SUBSTRATE";
    }

    return "FRAGILE_SUBSTRATE";
  }

  function pressure(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const survival =
      runtime.survival.survival_pressure || 0;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        survival * 0.45
      )
    );
  }

  function branches(runtime){
    const branches = [
      "PRIMARY_EXECUTION_SUBSTRATE",
      "CONTINUITY_SUBSTRATE",
      "AUTONOMOUS_RUNTIME_BRANCH"
    ];

    if(
      reproductionState.expansion_state.includes("MULTI")
    ){
      branches.push(
        "MULTI_REGION_SUBSTRATE"
      );
    }

    if(
      reproductionState.branching_state.includes("RECURSIVE")
    ){
      branches.push(
        "RECURSIVE_CIVILIZATION_BRANCH"
      );
    }

    return branches;
  }

  function reproduce(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    reproductionState.updated_at = now();

    reproductionState.replication_capacity =
      replication(runtime);

    reproductionState.propagation_state =
      propagation(runtime);

    reproductionState.expansion_state =
      expansion(runtime);

    reproductionState.branching_state =
      branching(runtime);

    reproductionState.substrate_health =
      substrate(runtime);

    reproductionState.propagation_pressure =
      pressure(runtime);

    reproductionState.active_branches =
      branches(runtime);

    reproductionState.reproduction_state =
      normalize(
        reproductionState.propagation_state
      );

    emit(
      "runtime:reproduction-core:update",
      snapshot()
    );

    emit(
      "runtime:substrate-replication",
      {
        replication_capacity:
          reproductionState.replication_capacity,
        propagation_state:
          reproductionState.propagation_state
      }
    );

    emit(
      "runtime:substrate-expansion",
      {
        expansion_state:
          reproductionState.expansion_state,
        branching_state:
          reproductionState.branching_state
      }
    );

    emit(
      "runtime:civilization-branching",
      {
        substrate_health:
          reproductionState.substrate_health,
        active_branches:
          reproductionState.active_branches
      }
    );

    return {
      ok:true,
      version: VERSION,
      reproduction_core: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        reproductionState.updated_at,
      reproduction_state:
        reproductionState.reproduction_state,
      propagation_state:
        reproductionState.propagation_state,
      replication_capacity:
        reproductionState.replication_capacity,
      expansion_state:
        reproductionState.expansion_state,
      branching_state:
        reproductionState.branching_state,
      substrate_health:
        reproductionState.substrate_health,
      propagation_pressure:
        reproductionState.propagation_pressure,
      active_branches:
        reproductionState.active_branches
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 49000);

    reproduce();

    if(window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__
      );
    }

    window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__ =
      setInterval(reproduce, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__
      );

      window.__EXECUTIA_REPRODUCTION_CORE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_REPRODUCTION_CORE = {
      version: VERSION,
      reproduce,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:reproduction-core:ready",
      {
        version: VERSION
      }
    );

    reproduce();

    window.dispatchEvent(
      new CustomEvent(
        "executia:reproduction-core-ready",
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
