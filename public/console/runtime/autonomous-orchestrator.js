(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_AUTONOMOUS_ORCHESTRATOR_V1";

  let runtimeState = {
    containment: "STANDBY",
    synchronization: "STABLE",
    routing: "NORMAL",
    topology: "SYNCHRONIZED",
    pressure: "CONTROLLED",
    lastDirective: null,
    lastForecast: null,
    lastActionAt: null
  };

  function now(){
    return new Date().toISOString();
  }

  function clone(v){
    return JSON.parse(JSON.stringify(v));
  }

  function emit(type, payload){
    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(type, payload);
    }
  }

  function applyDirective(directive){
    if(!directive) return;

    runtimeState.lastDirective = directive;
    runtimeState.lastActionAt = now();

    switch(String(directive.mode || "").toUpperCase()){

      case "AUTONOMOUS_CONTAINMENT":
        runtimeState.containment = "ACTIVE";
        runtimeState.routing = "REROUTED";
        runtimeState.pressure = "SUPPRESSED";
        runtimeState.topology = "CONTAINMENT_FIELD";
        runtimeState.synchronization = "PROTECTED";

        emit("runtime:containment:activated", {
          mode: directive.mode,
          priority: directive.priority,
          intent: directive.intent
        });

        emit("runtime:topology:reroute", {
          routing: runtimeState.routing,
          topology: runtimeState.topology
        });

        break;

      case "PREDICTIVE_STABILIZATION":
        runtimeState.containment = "READY";
        runtimeState.routing = "BALANCED";
        runtimeState.pressure = "BALANCING";
        runtimeState.topology = "STABILIZING";
        runtimeState.synchronization = "RECOVERING";

        emit("runtime:stabilization:engaged", {
          mode: directive.mode,
          priority: directive.priority,
          intent: directive.intent
        });

        break;

      case "SELF_EVOLUTION":
        runtimeState.containment = "ADAPTIVE";
        runtimeState.routing = "EVOLVING";
        runtimeState.pressure = "OPTIMIZING";
        runtimeState.topology = "SELF_EVOLVING";
        runtimeState.synchronization = "EXPANDING";

        emit("runtime:evolution:activated", {
          mode: directive.mode,
          priority: directive.priority,
          intent: directive.intent
        });

        break;

      default:
        runtimeState.containment = "STABLE";
        runtimeState.routing = "NORMAL";
        runtimeState.pressure = "CONTROLLED";
        runtimeState.topology = "SYNCHRONIZED";
        runtimeState.synchronization = "STABLE";

        emit("runtime:steady-state", {
          mode: directive.mode,
          priority: directive.priority,
          intent: directive.intent
        });

        break;
    }

    emit("runtime:orchestrator:state", snapshot());
  }

  function applyForecast(forecast){
    if(!forecast) return;

    runtimeState.lastForecast = forecast;

    const type = String(forecast.forecast || "").toUpperCase();

    if(type.includes("DESTABILIZATION")){
      runtimeState.pressure = "CRITICAL";
    }

    if(type.includes("ADAPTIVE")){
      runtimeState.topology = "EXPANDING";
    }

    emit("runtime:forecast:applied", {
      forecast: type,
      topology: runtimeState.topology,
      pressure: runtimeState.pressure
    });
  }

  function snapshot(){
    return {
      version: VERSION,
      timestamp: now(),
      state: clone(runtimeState)
    };
  }

  function start(){
    if(window.EXECUTIA_SIGNAL_BUS){

      window.EXECUTIA_SIGNAL_BUS.on(
        "runtime:directive",
        (signal) => {
          applyDirective(signal.payload);
        }
      );

      window.EXECUTIA_SIGNAL_BUS.on(
        "runtime:forecast",
        (signal) => {
          applyForecast(signal.payload);
        }
      );

      emit("runtime:autonomous-orchestrator:ready", {
        version: VERSION
      });

      emit("runtime:orchestrator:state", snapshot());
    }

    return {
      version: VERSION,
      started: true
    };
  }

  function expose(){
    window.EXECUTIA_AUTONOMOUS_ORCHESTRATOR = {
      version: VERSION,
      snapshot,
      applyDirective,
      applyForecast,
      start
    };

    start();

    window.dispatchEvent(
      new CustomEvent(
        "executia:autonomous-orchestrator-ready",
        {
          detail: {
            version: VERSION
          }
        }
      )
    );
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, {
      once:true
    });
  } else {
    expose();
  }
})();
