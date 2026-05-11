(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_COGNITION_CORE_V1";

  function normalize(v){
    return String(v || "").trim().toUpperCase();
  }

  function latestSnapshots(memory){
    const arr = Array.isArray(memory?.snapshots) ? memory.snapshots : [];
    return arr.slice(Math.max(arr.length - 12, 0));
  }

  function calculateInstability(snapshots){
    let score = 0;

    snapshots.forEach((s) => {
      const risk = normalize(s.risk);
      const response = normalize(s.response);
      const topology = normalize(s.topology);

      if(risk === "CRITICAL") score += 5;
      else if(risk === "ELEVATED") score += 3;
      else if(risk === "CONTROLLED") score += 1;

      if(response.includes("CONTAIN")) score += 2;
      if(response.includes("REROUTE")) score += 2;

      if(topology.includes("RISK")) score += 3;
      if(topology.includes("EVOLV")) score += 1;
    });

    return score;
  }

  function calculateEvolution(snapshots){
    let score = 0;

    snapshots.forEach((s) => {
      const evo = normalize(s.evolution);
      const topology = normalize(s.topology);

      if(evo === "ACTIVE") score += 3;
      if(evo.includes("LEARN")) score += 2;
      if(topology.includes("EVOLV")) score += 2;
      if(topology.includes("SYNCHRON")) score += 1;
    });

    return score;
  }

  function determineDirective(instability, evolution){
    if(instability >= 30){
      return {
        mode: "AUTONOMOUS_CONTAINMENT",
        priority: "CRITICAL",
        intent: "STABILIZE_AND_REROUTE"
      };
    }

    if(instability >= 18){
      return {
        mode: "PREDICTIVE_STABILIZATION",
        priority: "HIGH",
        intent: "ISOLATE_AND_BALANCE"
      };
    }

    if(evolution >= 18){
      return {
        mode: "SELF_EVOLUTION",
        priority: "OPTIMIZATION",
        intent: "ADAPT_AND_EXPAND"
      };
    }

    return {
      mode: "SYNCHRONIZED_RUNTIME",
      priority: "NORMAL",
      intent: "MAINTAIN_EXECUTION_TRUTH"
    };
  }

  function topologyForecast(snapshots){
    const risks = snapshots.map((x) => normalize(x.risk));
    const critical = risks.filter((x) => x === "CRITICAL").length;

    if(critical >= 3){
      return "DESTABILIZATION_WAVE";
    }

    if(critical >= 1){
      return "STRUCTURAL_PRESSURE";
    }

    const evolving = snapshots.filter((x) =>
      normalize(x.topology).includes("EVOLV")
    ).length;

    if(evolving >= 4){
      return "ADAPTIVE_EXPANSION";
    }

    return "STABLE_EXECUTION_FIELD";
  }

  function buildCognition(){
    const memory = window.EXECUTIA_MEMORY_CORTEX;
    const runtime = window.EXECUTIA_RUNTIME_ENGINE;

    if(!memory || !runtime){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    const recall = memory.recall();
    const snapshots = latestSnapshots(recall);

    const instability = calculateInstability(snapshots);
    const evolution = calculateEvolution(snapshots);
    const directive = determineDirective(instability, evolution);
    const forecast = topologyForecast(snapshots);

    return {
      ok: true,
      version: VERSION,
      timestamp: new Date().toISOString(),
      instability,
      evolution,
      directive,
      forecast,
      snapshots_analyzed: snapshots.length,
      memory_anchors: recall.anchors.length,
      lineage_depth: recall.lineage.length
    };
  }

  function publish(){
    const cognition = buildCognition();

    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:cognition:update",
        cognition
      );

      if(cognition.ok){
        window.EXECUTIA_SIGNAL_BUS.emit(
          "runtime:directive",
          cognition.directive
        );

        window.EXECUTIA_SIGNAL_BUS.emit(
          "runtime:forecast",
          {
            forecast: cognition.forecast,
            instability: cognition.instability,
            evolution: cognition.evolution
          }
        );
      }
    }

    return cognition;
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 7000);

    publish();

    if(window.__EXECUTIA_COGNITION_INTERVAL__){
      clearInterval(window.__EXECUTIA_COGNITION_INTERVAL__);
    }

    window.__EXECUTIA_COGNITION_INTERVAL__ =
      setInterval(publish, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_COGNITION_INTERVAL__){
      clearInterval(window.__EXECUTIA_COGNITION_INTERVAL__);
      window.__EXECUTIA_COGNITION_INTERVAL__ = null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_COGNITION_CORE = {
      version: VERSION,
      buildCognition,
      publish,
      start,
      stop
    };

    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:cognition-core:ready",
        { version: VERSION }
      );
    }

    publish();

    window.dispatchEvent(
      new CustomEvent("executia:cognition-core-ready", {
        detail: { version: VERSION }
      })
    );
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, { once:true });
  } else {
    expose();
  }
})();
