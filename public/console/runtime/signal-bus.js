(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_SIGNAL_BUS_V1";
  const listeners = new Map();
  const history = [];
  const MAX_HISTORY = 120;

  function now(){
    return new Date().toISOString();
  }

  function normalizeType(type){
    return String(type || "runtime:signal").trim();
  }

  function pushHistory(signal){
    history.push(signal);
    if(history.length > MAX_HISTORY) history.shift();
  }

  function emit(type, payload){
    const signal = {
      version: VERSION,
      type: normalizeType(type),
      payload: payload || {},
      timestamp: now()
    };

    pushHistory(signal);

    const local = listeners.get(signal.type) || [];
    const wildcard = listeners.get("*") || [];

    [...local, ...wildcard].forEach((handler) => {
      try{
        handler(signal);
      }catch(err){
        console.warn("EXECUTIA signal handler failed", err);
      }
    });

    window.dispatchEvent(new CustomEvent("executia:signal", { detail: signal }));
    return signal;
  }

  function on(type, handler){
    const key = normalizeType(type);
    if(typeof handler !== "function") return function(){};

    if(!listeners.has(key)){
      listeners.set(key, []);
    }

    listeners.get(key).push(handler);

    return function unsubscribe(){
      const arr = listeners.get(key) || [];
      const index = arr.indexOf(handler);
      if(index >= 0) arr.splice(index, 1);
    };
  }

  function getHistory(){
    return history.slice();
  }

  function latest(type){
    const key = type ? normalizeType(type) : null;
    for(let i = history.length - 1; i >= 0; i--){
      if(!key || history[i].type === key) return history[i];
    }
    return null;
  }

  function publishSnapshot(){
    const engine = window.EXECUTIA_RUNTIME_ENGINE;
    if(!engine || typeof engine.snapshot !== "function"){
      return emit("runtime:snapshot:unavailable", {
        reason: "EXECUTIA_RUNTIME_ENGINE_NOT_READY"
      });
    }

    const snapshot = engine.snapshot();

    emit("runtime:snapshot", snapshot);
    emit("runtime:risk", snapshot.signals);
    emit("runtime:topology", {
      nodes: snapshot.nodes,
      summary: snapshot.summary
    });

    if(snapshot.signals && snapshot.signals.response){
      emit("runtime:response:intent", {
        mode: snapshot.signals.response,
        risk: snapshot.signals.risk,
        pressure: snapshot.signals.pressure,
        synchronization: snapshot.signals.synchronization
      });
    }

    return snapshot;
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 5000);
    publishSnapshot();

    if(window.__EXECUTIA_SIGNAL_BUS_INTERVAL__){
      clearInterval(window.__EXECUTIA_SIGNAL_BUS_INTERVAL__);
    }

    window.__EXECUTIA_SIGNAL_BUS_INTERVAL__ = setInterval(publishSnapshot, ms);

    return {
      version: VERSION,
      intervalMs: ms,
      started: true
    };
  }

  function stop(){
    if(window.__EXECUTIA_SIGNAL_BUS_INTERVAL__){
      clearInterval(window.__EXECUTIA_SIGNAL_BUS_INTERVAL__);
      window.__EXECUTIA_SIGNAL_BUS_INTERVAL__ = null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_SIGNAL_BUS = {
      version: VERSION,
      emit,
      on,
      latest,
      history: getHistory,
      publishSnapshot,
      start,
      stop
    };

    emit("runtime:signal-bus:ready", { version: VERSION });

    window.dispatchEvent(new CustomEvent("executia:signal-bus-ready", {
      detail: { version: VERSION }
    }));
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, { once: true });
  } else {
    expose();
  }
})();
