(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_NERVOUS_SYSTEM_V1";

  let nervousState = {
    reflex_state: "INITIALIZING",
    synchronization_field: "UNDEFINED",
    impulse_pressure: 0,
    stress_response: "DORMANT",
    sensory_field: "OFFLINE",
    coordination_state: "UNSTABLE",
    signal_velocity: 0,
    active_reflexes: [],
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
    const topology = window.EXECUTIA_TOPOLOGY_MESH;
    const immune = window.EXECUTIA_CIVILIZATION_IMMUNE_SYSTEM;
    const quantum = window.EXECUTIA_QUANTUM_DECISION_FIELD;
    const reality = window.EXECUTIA_REALITY_ENGINE;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const orchestrator = window.EXECUTIA_AUTONOMOUS_ORCHESTRATOR;

    if(
      !topology ||
      !immune ||
      !quantum ||
      !reality ||
      !consciousness ||
      !orchestrator
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      topology: topology.snapshot(),
      immune: immune.snapshot(),
      quantum: quantum.snapshot(),
      reality: reality.snapshot(),
      consciousness: consciousness.snapshot(),
      orchestrator: orchestrator.snapshot
        ? orchestrator.snapshot()
        : {}
    };
  }

  function impulsePressure(runtime){
    const anomaly =
      runtime.immune.anomaly_density || 0;

    const truth =
      runtime.reality.truth_density || 0;

    return Math.min(
      100,
      Math.round(
        anomaly * 0.6 +
        truth * 0.4
      )
    );
  }

  function reflex(runtime){
    const threat = normalize(
      runtime.immune.threat_level
    );

    if(threat.includes("SYSTEMIC")){
      return "FULL_ORGANISM_REFLEX";
    }

    if(threat.includes("STRUCTURAL")){
      return "DEFENSIVE_REFLEX";
    }

    return "STABLE_REFLEX";
  }

  function synchronization(runtime){
    const sync = normalize(
      runtime.quantum.synchronization_state
    );

    if(sync.includes("LOCK")){
      return "FULL_SYNCHRONIZATION";
    }

    if(sync.includes("ADAPTIVE")){
      return "ADAPTIVE_SYNCHRONIZATION";
    }

    return "PARTIAL_SYNCHRONIZATION";
  }

  function stress(runtime){
    const pressure =
      nervousState.impulse_pressure;

    if(pressure >= 80){
      return "CRITICAL_STRESS_RESPONSE";
    }

    if(pressure >= 45){
      return "ELEVATED_STRESS_RESPONSE";
    }

    return "CONTROLLED_RESPONSE";
  }

  function sensory(runtime){
    const awareness =
      runtime.consciousness.awareness_score || 0;

    if(awareness >= 90){
      return "FULL_SENSORY_FIELD";
    }

    if(awareness >= 60){
      return "PARTIAL_SENSORY_FIELD";
    }

    return "LIMITED_SENSORY_FIELD";
  }

  function coordination(runtime){
    const topology = normalize(
      runtime.topology.topology_state
    );

    if(topology.includes("EVOLV")){
      return "ADAPTIVE_COORDINATION";
    }

    if(topology.includes("CONTAINMENT")){
      return "DEFENSIVE_COORDINATION";
    }

    return "STABLE_COORDINATION";
  }

  function velocity(runtime){
    const pressure =
      nervousState.impulse_pressure;

    const awareness =
      runtime.consciousness.awareness_score || 0;

    return Math.min(
      100,
      Math.round(
        pressure * 0.5 +
        awareness * 0.5
      )
    );
  }

  function reflexes(runtime){
    const reflexes = [
      "SIGNAL_ROUTING",
      "TOPOLOGY_SYNC",
      "EXECUTION_REFLEX"
    ];

    if(
      normalize(
        runtime.immune.containment_state
      ).includes("FULL")
    ){
      reflexes.push("CONTAINMENT_REFLEX");
    }

    if(
      normalize(
        runtime.quantum.arbitration_state
      ).includes("EVOLUTIONARY")
    ){
      reflexes.push("EVOLUTION_REFLEX");
    }

    return reflexes;
  }

  function synchronize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    nervousState.updated_at = now();

    nervousState.impulse_pressure =
      impulsePressure(runtime);

    nervousState.reflex_state =
      reflex(runtime);

    nervousState.synchronization_field =
      synchronization(runtime);

    nervousState.stress_response =
      stress(runtime);

    nervousState.sensory_field =
      sensory(runtime);

    nervousState.coordination_state =
      coordination(runtime);

    nervousState.signal_velocity =
      velocity(runtime);

    nervousState.active_reflexes =
      reflexes(runtime);

    emit(
      "runtime:nervous-system:update",
      snapshot()
    );

    emit(
      "runtime:reflex-response",
      {
        reflex_state:
          nervousState.reflex_state,
        signal_velocity:
          nervousState.signal_velocity
      }
    );

    emit(
      "runtime:sensory-field",
      {
        sensory_field:
          nervousState.sensory_field,
        synchronization_field:
          nervousState.synchronization_field
      }
    );

    emit(
      "runtime:stress-propagation",
      {
        stress_response:
          nervousState.stress_response,
        impulse_pressure:
          nervousState.impulse_pressure
      }
    );

    return {
      ok: true,
      version: VERSION,
      nervous: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        nervousState.updated_at,
      reflex_state:
        nervousState.reflex_state,
      synchronization_field:
        nervousState.synchronization_field,
      impulse_pressure:
        nervousState.impulse_pressure,
      stress_response:
        nervousState.stress_response,
      sensory_field:
        nervousState.sensory_field,
      coordination_state:
        nervousState.coordination_state,
      signal_velocity:
        nervousState.signal_velocity,
      active_reflexes:
        nervousState.active_reflexes
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 28000);

    synchronize();

    if(window.__EXECUTIA_NERVOUS_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_NERVOUS_INTERVAL__
      );
    }

    window.__EXECUTIA_NERVOUS_INTERVAL__ =
      setInterval(synchronize, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_NERVOUS_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_NERVOUS_INTERVAL__
      );

      window.__EXECUTIA_NERVOUS_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_NERVOUS_SYSTEM = {
      version: VERSION,
      synchronize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:nervous-system:ready",
      {
        version: VERSION
      }
    );

    synchronize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:nervous-system-ready",
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
