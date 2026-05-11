(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_ECONOMY_CORE_V1";

  let economyState = {
    economy_state: "INITIALIZING",
    value_circulation: "UNDEFINED",
    execution_capital: 0,
    allocation_state: "UNBALANCED",
    market_balance: "VOLATILE",
    optimization_state: "LIMITED",
    resource_pressure: 0,
    active_markets: [],
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
    const gravity =
      window.EXECUTIA_CIVILIZATION_GRAVITY_CORE;

    const metabolism =
      window.EXECUTIA_CIVILIZATION_METABOLISM;

    const fabric =
      window.EXECUTIA_CIVILIZATION_REALITY_FABRIC;

    const topology =
      window.EXECUTIA_TOPOLOGY_MESH;

    const conscious =
      window.EXECUTIA_CIVILIZATION_CONSCIOUS_FIELD;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !gravity ||
      !metabolism ||
      !fabric ||
      !topology ||
      !conscious ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      gravity: gravity.snapshot(),
      metabolism: metabolism.snapshot(),
      fabric: fabric.snapshot(),
      topology: topology.snapshot(),
      conscious: conscious.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function capital(runtime){
    const force =
      runtime.gravity.attraction_force || 0;

    const harmony =
      runtime.fabric.harmonization_score || 0;

    return Math.min(
      100,
      Math.round(
        force * 0.5 +
        harmony * 0.5
      )
    );
  }

  function circulation(runtime){
    const capital =
      economyState.execution_capital;

    if(capital >= 90){
      return "AUTONOMOUS_VALUE_CIRCULATION";
    }

    if(capital >= 65){
      return "ADAPTIVE_VALUE_CIRCULATION";
    }

    return "LIMITED_VALUE_CIRCULATION";
  }

  function allocation(runtime){
    const pressure =
      runtime.metabolism.metabolic_pressure || 0;

    if(pressure <= 30){
      return "OPTIMAL_ALLOCATION";
    }

    if(pressure <= 65){
      return "ADAPTIVE_ALLOCATION";
    }

    return "FRAGMENTED_ALLOCATION";
  }

  function balance(runtime){
    const topology =
      runtime.topology.pressure_index || 0;

    const instability =
      runtime.cognition.instability || 0;

    const total =
      Math.round(
        topology * 0.5 +
        instability * 2
      );

    if(total >= 85){
      return "CRITICAL_MARKET_VOLATILITY";
    }

    if(total >= 55){
      return "ADAPTIVE_MARKET_BALANCE";
    }

    return "STABLE_MARKET_BALANCE";
  }

  function optimization(runtime){
    const awareness =
      runtime.conscious.consciousness_density || 0;

    if(awareness >= 90){
      return "SELF_OPTIMIZING_ECONOMY";
    }

    if(awareness >= 65){
      return "ADAPTIVE_OPTIMIZATION";
    }

    return "LIMITED_OPTIMIZATION";
  }

  function pressure(runtime){
    const metabolic =
      runtime.metabolism.metabolic_pressure || 0;

    const topology =
      runtime.topology.pressure_index || 0;

    return Math.min(
      100,
      Math.round(
        metabolic * 0.55 +
        topology * 0.45
      )
    );
  }

  function markets(runtime){
    const markets = [
      "EXECUTION_RESOURCE_MARKET",
      "TOPOLOGY_BALANCE_MARKET",
      "ENERGY_CIRCULATION_MARKET"
    ];

    if(
      normalize(
        runtime.gravity.authority_density
      ).includes("GRAVITATIONAL")
    ){
      markets.push(
        "AUTHORITY_GRAVITY_MARKET"
      );
    }

    if(
      normalize(
        runtime.fabric.coherence_field
      ).includes("UNIFIED")
    ){
      markets.push(
        "UNIFIED_REALITY_MARKET"
      );
    }

    return markets;
  }

  function circulate(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    economyState.updated_at = now();

    economyState.execution_capital =
      capital(runtime);

    economyState.value_circulation =
      circulation(runtime);

    economyState.allocation_state =
      allocation(runtime);

    economyState.market_balance =
      balance(runtime);

    economyState.optimization_state =
      optimization(runtime);

    economyState.resource_pressure =
      pressure(runtime);

    economyState.active_markets =
      markets(runtime);

    economyState.economy_state =
      normalize(
        economyState.value_circulation
      );

    emit(
      "runtime:economy-core:update",
      snapshot()
    );

    emit(
      "runtime:value-circulation",
      {
        execution_capital:
          economyState.execution_capital,
        value_circulation:
          economyState.value_circulation
      }
    );

    emit(
      "runtime:resource-allocation",
      {
        allocation_state:
          economyState.allocation_state,
        resource_pressure:
          economyState.resource_pressure
      }
    );

    emit(
      "runtime:market-balance",
      {
        market_balance:
          economyState.market_balance,
        active_markets:
          economyState.active_markets
      }
    );

    return {
      ok:true,
      version: VERSION,
      economy_core: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        economyState.updated_at,
      economy_state:
        economyState.economy_state,
      value_circulation:
        economyState.value_circulation,
      execution_capital:
        economyState.execution_capital,
      allocation_state:
        economyState.allocation_state,
      market_balance:
        economyState.market_balance,
      optimization_state:
        economyState.optimization_state,
      resource_pressure:
        economyState.resource_pressure,
      active_markets:
        economyState.active_markets
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 42000);

    circulate();

    if(window.__EXECUTIA_ECONOMY_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_ECONOMY_CORE_INTERVAL__
      );
    }

    window.__EXECUTIA_ECONOMY_CORE_INTERVAL__ =
      setInterval(circulate, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_ECONOMY_CORE_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_ECONOMY_CORE_INTERVAL__
      );

      window.__EXECUTIA_ECONOMY_CORE_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_ECONOMY_CORE = {
      version: VERSION,
      circulate,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:economy-core:ready",
      {
        version: VERSION
      }
    );

    circulate();

    window.dispatchEvent(
      new CustomEvent(
        "executia:economy-core-ready",
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
