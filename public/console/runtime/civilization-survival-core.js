(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_SURVIVAL_CORE_V1";

  let survivalState = {
    survival_state: "INITIALIZING",
    extinction_risk: "UNKNOWN",
    resilience_score: 0,
    continuity_state: "UNDEFINED",
    collapse_forecast: "UNDEFINED",
    recovery_mode: "DORMANT",
    survival_pressure: 0,
    active_protocols: [],
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
    const law = window.EXECUTIA_CIVILIZATION_LAW_CORE;
    const immune = window.EXECUTIA_CIVILIZATION_IMMUNE_SYSTEM;
    const reality = window.EXECUTIA_CIVILIZATION_REALITY_FABRIC;
    const temporal = window.EXECUTIA_CIVILIZATION_TEMPORAL_CORE;
    const economy = window.EXECUTIA_CIVILIZATION_ECONOMY_CORE;
    const cognition = window.EXECUTIA_COGNITION_CORE;

    if(!law || !immune || !reality || !temporal || !economy || !cognition){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      law: law.snapshot(),
      immune: immune.snapshot(),
      reality: reality.snapshot(),
      temporal: temporal.snapshot(),
      economy: economy.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function survivalPressure(runtime){
    const instability = runtime.cognition.instability || 0;
    const violation = runtime.law.violation_pressure || 0;
    const anomaly = runtime.immune.anomaly_density || 0;

    return Math.min(
      100,
      Math.round(
        instability * 1.8 +
        violation * 0.35 +
        anomaly * 0.35
      )
    );
  }

  function extinction(runtime){
    const pressure = survivalState.survival_pressure;
    const collapse = normalize(runtime.reality.tension_balance);
    const fracture = normalize(runtime.temporal.fracture_state);

    if(
      pressure >= 85 ||
      collapse.includes("CRITICAL") ||
      fracture.includes("FRACTURE")
    ){
      return "CRITICAL_EXTINCTION_VECTOR";
    }

    if(pressure >= 55){
      return "ELEVATED_EXTINCTION_RISK";
    }

    return "LOW_EXTINCTION_RISK";
  }

  function resilience(runtime){
    const lawDensity = runtime.law.law_density || 0;
    const harmony = runtime.reality.harmonization_score || 0;
    const capital = runtime.economy.execution_capital || 0;
    const pressure = survivalState.survival_pressure;

    return Math.max(
      1,
      Math.min(
        100,
        Math.round(
          lawDensity * 0.3 +
          harmony * 0.3 +
          capital * 0.3 -
          pressure * 0.2
        )
      )
    );
  }

  function continuity(runtime){
    const temporal = normalize(runtime.temporal.continuity_state);
    const integrity = normalize(runtime.law.constitutional_integrity);

    if(temporal.includes("MULTI") && integrity.includes("IMMUTABLE")){
      return "LONG_RANGE_CONTINUITY_LOCK";
    }

    if(temporal.includes("STABLE")){
      return "STABLE_CONTINUITY";
    }

    return "FRAGILE_CONTINUITY";
  }

  function collapseForecast(runtime){
    const extinction = survivalState.extinction_risk;
    const resilience = survivalState.resilience_score;

    if(extinction.includes("CRITICAL")){
      return "COLLAPSE_IMMINENT";
    }

    if(extinction.includes("ELEVATED") && resilience < 55){
      return "COLLAPSE_POSSIBLE";
    }

    return "COLLAPSE_CONTAINED";
  }

  function recovery(runtime){
    const forecast = survivalState.collapse_forecast;

    if(forecast === "COLLAPSE_IMMINENT"){
      return "EMERGENCY_RECOVERY";
    }

    if(forecast === "COLLAPSE_POSSIBLE"){
      return "ADAPTIVE_RECOVERY";
    }

    return "PASSIVE_RESILIENCE";
  }

  function protocols(runtime){
    const protocols = [
      "CONTINUITY_PRESERVATION",
      "LAW_STABILIZATION",
      "REALITY_COHERENCE_PROTECTION"
    ];

    if(survivalState.extinction_risk.includes("CRITICAL")){
      protocols.push("EXTINCTION_PREVENTION");
    }

    if(survivalState.recovery_mode.includes("EMERGENCY")){
      protocols.push("EMERGENCY_RECONSTRUCTION");
    }

    if(normalize(runtime.economy.optimization_state).includes("SELF")){
      protocols.push("ECONOMIC_SURVIVAL_OPTIMIZATION");
    }

    return protocols;
  }

  function protect(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    survivalState.updated_at = now();

    survivalState.survival_pressure =
      survivalPressure(runtime);

    survivalState.extinction_risk =
      extinction(runtime);

    survivalState.resilience_score =
      resilience(runtime);

    survivalState.continuity_state =
      continuity(runtime);

    survivalState.collapse_forecast =
      collapseForecast(runtime);

    survivalState.recovery_mode =
      recovery(runtime);

    survivalState.active_protocols =
      protocols(runtime);

    survivalState.survival_state =
      normalize(
        survivalState.recovery_mode
      );

    emit(
      "runtime:survival-core:update",
      snapshot()
    );

    emit(
      "runtime:extinction-risk",
      {
        extinction_risk:
          survivalState.extinction_risk,
        survival_pressure:
          survivalState.survival_pressure
      }
    );

    emit(
      "runtime:resilience-state",
      {
        resilience_score:
          survivalState.resilience_score,
        continuity_state:
          survivalState.continuity_state
      }
    );

    emit(
      "runtime:survival-protocols",
      {
        recovery_mode:
          survivalState.recovery_mode,
        active_protocols:
          survivalState.active_protocols
      }
    );

    return {
      ok:true,
      version: VERSION,
      survival_core: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        survivalState.updated_at,
      survival_state:
        survivalState.survival_state,
      extinction_risk:
        survivalState.extinction_risk,
      resilience_score:
        survivalState.resilience_score,
      continuity_state:
        survivalState.continuity_state,
      collapse_forecast:
        survivalState.collapse_forecast,
      recovery_mode:
        survivalState.recovery_mode,
      survival_pressure:
        survivalState.survival_pressure,
      active_protocols:
        survivalState.active_protocols
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 47000);

    protect();

    if(window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__
      );
    }

    window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__ =
      setInterval(protect, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__
      );

      window.__EXECUTIA_SURVIVAL_CORE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_SURVIVAL_CORE = {
      version: VERSION,
      protect,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:survival-core:ready",
      {
        version: VERSION
      }
    );

    protect();

    window.dispatchEvent(
      new CustomEvent(
        "executia:survival-core-ready",
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
