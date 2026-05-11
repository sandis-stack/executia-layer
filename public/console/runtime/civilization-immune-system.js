(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_IMMUNE_SYSTEM_V1";

  let immuneState = {
    integrity_state: "INITIALIZING",
    threat_level: "UNKNOWN",
    anomaly_density: 0,
    containment_state: "DORMANT",
    antibody_response: "INACTIVE",
    mutation_defense: "DISABLED",
    immune_pressure: 0,
    protected_layers: [],
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
    const topology = window.EXECUTIA_TOPOLOGY_MESH;
    const reality = window.EXECUTIA_REALITY_ENGINE;
    const quantum = window.EXECUTIA_QUANTUM_DECISION_FIELD;
    const genome = window.EXECUTIA_CIVILIZATION_GENOME;
    const orchestrator = window.EXECUTIA_AUTONOMOUS_ORCHESTRATOR;

    if(
      !cognition ||
      !topology ||
      !reality ||
      !quantum ||
      !genome ||
      !orchestrator
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      cognition: cognition.buildCognition(),
      topology: topology.snapshot(),
      reality: reality.snapshot(),
      quantum: quantum.snapshot(),
      genome: genome.snapshot(),
      orchestrator: orchestrator.snapshot
        ? orchestrator.snapshot()
        : {}
    };
  }

  function calculateThreat(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const divergence = normalize(
      runtime.reality.divergence_state
    );

    if(
      instability >= 30 ||
      divergence.includes("CRITICAL")
    ){
      return "SYSTEMIC_THREAT";
    }

    if(instability >= 18){
      return "STRUCTURAL_THREAT";
    }

    return "CONTROLLED_ENVIRONMENT";
  }

  function calculateAnomalyDensity(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const density =
      runtime.quantum.probability_density || 0;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        density * 0.35
      )
    );
  }

  function containment(threat){
    if(threat === "SYSTEMIC_THREAT"){
      return "FULL_CONTAINMENT";
    }

    if(threat === "STRUCTURAL_THREAT"){
      return "ACTIVE_ISOLATION";
    }

    return "STABLE_FIELD";
  }

  function antibodies(runtime){
    const mutation = normalize(
      runtime.genome.mutation_state
    );

    if(mutation.includes("ACTIVE")){
      return "ADAPTIVE_ANTIBODIES";
    }

    if(mutation.includes("CONTROLLED")){
      return "PARTIAL_ANTIBODIES";
    }

    return "PASSIVE_ANTIBODIES";
  }

  function mutationDefense(runtime){
    const stability = normalize(
      runtime.genome.genome_stability
    );

    if(stability.includes("HIGH")){
      return "SELF_REPAIR_ENABLED";
    }

    if(stability.includes("ADAPTIVE")){
      return "DEFENSIVE_MUTATION_ENABLED";
    }

    return "LIMITED_DEFENSE";
  }

  function immunePressure(runtime){
    const threat =
      immuneState.threat_level;

    const density =
      immuneState.anomaly_density;

    if(threat === "SYSTEMIC_THREAT"){
      return Math.min(100, density + 30);
    }

    if(threat === "STRUCTURAL_THREAT"){
      return Math.min(100, density + 10);
    }

    return Math.max(5, density - 20);
  }

  function protectedLayers(runtime){
    const layers = [
      "RUNTIME_ENGINE",
      "SIGNAL_BUS",
      "MEMORY_CORTEX",
      "COGNITION_CORE",
      "REALITY_ENGINE"
    ];

    const topology = normalize(
      runtime.topology.topology_state
    );

    if(topology.includes("EVOLV")){
      layers.push("EVOLUTION_CORE");
    }

    if(
      normalize(
        runtime.quantum.synchronization_state
      ).includes("LOCK")
    ){
      layers.push("QUANTUM_FIELD");
    }

    return layers;
  }

  function integrity(){
    const pressure =
      immuneState.immune_pressure;

    if(pressure >= 80){
      return "CRITICAL_DEFENSE_MODE";
    }

    if(pressure >= 45){
      return "ADAPTIVE_DEFENSE_MODE";
    }

    return "STABLE_INTEGRITY";
  }

  function defend(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    immuneState.updated_at = now();

    immuneState.threat_level =
      calculateThreat(runtime);

    immuneState.anomaly_density =
      calculateAnomalyDensity(runtime);

    immuneState.containment_state =
      containment(
        immuneState.threat_level
      );

    immuneState.antibody_response =
      antibodies(runtime);

    immuneState.mutation_defense =
      mutationDefense(runtime);

    immuneState.immune_pressure =
      immunePressure(runtime);

    immuneState.protected_layers =
      protectedLayers(runtime);

    immuneState.integrity_state =
      integrity();

    emit(
      "runtime:immune-system:update",
      snapshot()
    );

    emit(
      "runtime:threat-detection",
      {
        threat_level:
          immuneState.threat_level,
        anomaly_density:
          immuneState.anomaly_density
      }
    );

    emit(
      "runtime:containment-response",
      {
        containment_state:
          immuneState.containment_state,
        immune_pressure:
          immuneState.immune_pressure
      }
    );

    emit(
      "runtime:antibody-response",
      {
        antibody_response:
          immuneState.antibody_response,
        mutation_defense:
          immuneState.mutation_defense
      }
    );

    return {
      ok: true,
      version: VERSION,
      immune: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        immuneState.updated_at,
      integrity_state:
        immuneState.integrity_state,
      threat_level:
        immuneState.threat_level,
      anomaly_density:
        immuneState.anomaly_density,
      containment_state:
        immuneState.containment_state,
      antibody_response:
        immuneState.antibody_response,
      mutation_defense:
        immuneState.mutation_defense,
      immune_pressure:
        immuneState.immune_pressure,
      protected_layers:
        immuneState.protected_layers
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 26000);

    defend();

    if(window.__EXECUTIA_IMMUNE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_IMMUNE_INTERVAL__
      );
    }

    window.__EXECUTIA_IMMUNE_INTERVAL__ =
      setInterval(defend, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_IMMUNE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_IMMUNE_INTERVAL__
      );

      window.__EXECUTIA_IMMUNE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_IMMUNE_SYSTEM = {
      version: VERSION,
      defend,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:immune-system:ready",
      {
        version: VERSION
      }
    );

    defend();

    window.dispatchEvent(
      new CustomEvent(
        "executia:immune-system-ready",
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
