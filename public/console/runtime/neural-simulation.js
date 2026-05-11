(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_NEURAL_SIMULATION_V1";

  let neuralState = {
    clusters: [],
    resonances: [],
    weights: [],
    signals: [],
    cognition_mode: "INITIALIZING",
    updated_at: null
  };

  function now(){
    return new Date().toISOString();
  }

  function normalize(v){
    return String(v || "").trim().toUpperCase();
  }

  function emit(type, payload){
    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(type, payload);
    }
  }

  function randomWeight(seed){
    return (
      ((seed * 9301 + 49297) % 233280) / 233280
    ).toFixed(3);
  }

  function buildClusters(mesh){
    const sectors = Array.isArray(mesh?.sectors)
      ? mesh.sectors
      : [];

    return sectors.map((sector, index) => ({
      id: "NEURAL_CLUSTER_" + index,
      sector: sector.id,
      node: sector.node,
      cognition:
        sector.pressure === "CRITICAL"
          ? "SURVIVAL"
          : sector.density === "EXPANDING"
            ? "EXPANSION"
            : "BALANCE",
      resonance:
        sector.topology === "CONTAINMENT_ZONE"
          ? "HIGH_ALERT"
          : sector.topology === "ADAPTIVE_CLUSTER"
            ? "EVOLUTION"
            : "SYNC",
      activity:
        sector.pressure === "CRITICAL"
          ? 98
          : sector.pressure === "ELEVATED"
            ? 74
            : 42 + index
    }));
  }

  function buildResonances(clusters){
    const arr = [];

    for(let i = 0; i < clusters.length - 1; i++){
      const a = clusters[i];
      const b = clusters[i + 1];

      arr.push({
        from: a.id,
        to: b.id,
        resonance:
          a.cognition === "SURVIVAL" ||
          b.cognition === "SURVIVAL"
            ? "ALERT_RESONANCE"
            : a.cognition === "EXPANSION" ||
              b.cognition === "EXPANSION"
                ? "EVOLUTION_RESONANCE"
                : "SYNC_RESONANCE",
        strength:
          a.activity > 80 ||
          b.activity > 80
            ? "HIGH"
            : "NORMAL"
      });
    }

    return arr;
  }

  function buildWeights(clusters){
    return clusters.map((cluster, index) => ({
      cluster: cluster.id,
      adaptive_weight:
        Number(randomWeight(index + 2)),
      signal_priority:
        cluster.activity > 80
          ? "CRITICAL"
          : cluster.activity > 60
            ? "HIGH"
            : "NORMAL"
    }));
  }

  function buildSignals(clusters){
    return clusters.map((cluster, index) => ({
      cluster: cluster.id,
      propagation:
        cluster.cognition === "SURVIVAL"
          ? "CONTAINMENT_SIGNAL"
          : cluster.cognition === "EXPANSION"
            ? "EVOLUTION_SIGNAL"
            : "SYNC_SIGNAL",
      direction:
        index % 2 === 0
          ? "OUTBOUND"
          : "INBOUND",
      intensity:
        cluster.activity
    }));
  }

  function determineMode(clusters){
    const survival = clusters.filter(
      (x) => x.cognition === "SURVIVAL"
    ).length;

    const expansion = clusters.filter(
      (x) => x.cognition === "EXPANSION"
    ).length;

    if(survival >= 3){
      return "DEFENSIVE_NEURAL_FIELD";
    }

    if(expansion >= 4){
      return "SELF_EXPANDING_NEURAL_RUNTIME";
    }

    return "SYNCHRONIZED_NEURAL_EXECUTION";
  }

  function rebuild(){
    const topology = window.EXECUTIA_TOPOLOGY_MESH;

    if(!topology){
      return {
        ok: false,
        reason: "TOPOLOGY_MESH_NOT_READY"
      };
    }

    const mesh = topology.rebuild().mesh;

    const clusters = buildClusters(mesh);

    neuralState = {
      clusters,
      resonances: buildResonances(clusters),
      weights: buildWeights(clusters),
      signals: buildSignals(clusters),
      cognition_mode: determineMode(clusters),
      updated_at: now()
    };

    emit("runtime:neural:update", neuralState);

    emit("runtime:neural:resonance", {
      cognition_mode: neuralState.cognition_mode,
      resonances: neuralState.resonances
    });

    emit("runtime:neural:signals", {
      cognition_mode: neuralState.cognition_mode,
      signals: neuralState.signals
    });

    return {
      ok: true,
      version: VERSION,
      state: neuralState
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at: neuralState.updated_at,
      cognition_mode: neuralState.cognition_mode,
      clusters: neuralState.clusters.length,
      resonances: neuralState.resonances.length,
      weights: neuralState.weights.length,
      signals: neuralState.signals.length
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 14000);

    rebuild();

    if(window.__EXECUTIA_NEURAL_INTERVAL__){
      clearInterval(window.__EXECUTIA_NEURAL_INTERVAL__);
    }

    window.__EXECUTIA_NEURAL_INTERVAL__ =
      setInterval(rebuild, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_NEURAL_INTERVAL__){
      clearInterval(window.__EXECUTIA_NEURAL_INTERVAL__);
      window.__EXECUTIA_NEURAL_INTERVAL__ = null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_NEURAL_SIMULATION = {
      version: VERSION,
      rebuild,
      snapshot,
      start,
      stop
    };

    emit("runtime:neural-layer:ready", {
      version: VERSION
    });

    rebuild();

    window.dispatchEvent(
      new CustomEvent(
        "executia:neural-layer-ready",
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
