(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_TOPOLOGY_MESH_V1";

  let mesh = {
    sectors: [],
    links: [],
    pressure: [],
    density: [],
    topology_state: "INITIALIZING",
    updated_at: null
  };

  function now(){
    return new Date().toISOString();
  }

  function normalize(v){
    return String(v || "").trim().toUpperCase();
  }

  function randomSeed(index){
    return ((index * 9301 + 49297) % 233280) / 233280;
  }

  function buildSector(index, node, cognition){
    const instability = cognition?.instability || 0;
    const evolution = cognition?.evolution || 0;

    const pressure =
      instability > 24 ? "CRITICAL" :
      instability > 12 ? "ELEVATED" :
      evolution > 20 ? "EVOLVING" :
      "STABLE";

    const density =
      evolution > instability ? "EXPANDING" :
      instability > 16 ? "COMPRESSED" :
      "BALANCED";

    return {
      id: "SECTOR_" + index,
      node: node.name,
      x: Math.round(node.cx),
      y: Math.round(node.cy),
      radius: node.radius,
      pressure,
      density,
      risk: node.risky ? "RISK" : "CONTROLLED",
      topology:
        pressure === "CRITICAL"
          ? "CONTAINMENT_ZONE"
          : density === "EXPANDING"
            ? "ADAPTIVE_CLUSTER"
            : "SYNCHRONIZED_CLUSTER"
    };
  }

  function buildLinks(sectors){
    const links = [];

    for(let i = 0; i < sectors.length - 1; i++){
      const a = sectors[i];
      const b = sectors[i + 1];

      links.push({
        from: a.id,
        to: b.id,
        type:
          a.pressure === "CRITICAL" ||
          b.pressure === "CRITICAL"
            ? "CONTAINMENT_FLOW"
            : a.density === "EXPANDING" ||
              b.density === "EXPANDING"
                ? "EVOLUTION_FLOW"
                : "SYNC_FLOW",
        strength:
          a.pressure === "CRITICAL" ||
          b.pressure === "CRITICAL"
            ? "HIGH"
            : "NORMAL"
      });
    }

    return links;
  }

  function buildPressureMap(sectors){
    return sectors.map((s, i) => ({
      sector: s.id,
      wave:
        s.pressure === "CRITICAL"
          ? "SHOCKWAVE"
          : s.pressure === "ELEVATED"
            ? "PRESSURE_RISE"
            : "STABLE_FIELD",
      intensity:
        s.pressure === "CRITICAL"
          ? 100
          : s.pressure === "ELEVATED"
            ? 72
            : 38 + Math.round(randomSeed(i) * 14)
    }));
  }

  function buildDensityMap(sectors){
    return sectors.map((s, i) => ({
      sector: s.id,
      density: s.density,
      gravity:
        s.density === "EXPANDING"
          ? "OUTBOUND"
          : s.density === "COMPRESSED"
            ? "INBOUND"
            : "BALANCED",
      field:
        40 + Math.round(randomSeed(i + 3) * 60)
    }));
  }

  function computeTopologyState(cognition){
    const instability = cognition?.instability || 0;
    const evolution = cognition?.evolution || 0;

    if(instability >= 30){
      return "CONTAINMENT_RUNTIME";
    }

    if(instability >= 18){
      return "PRESSURE_STABILIZATION";
    }

    if(evolution >= 18){
      return "SELF_EVOLVING_MESH";
    }

    return "SYNCHRONIZED_EXECUTION_FIELD";
  }

  function rebuild(){
    const runtime = window.EXECUTIA_RUNTIME_ENGINE;
    const cognition = window.EXECUTIA_COGNITION_CORE;

    if(!runtime || !cognition){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    const snapshot = runtime.snapshot();
    const thought = cognition.buildCognition();

    const nodes = Array.isArray(snapshot.nodes)
      ? snapshot.nodes
      : [];

    const sectors = nodes.map((node, index) =>
      buildSector(index, node, thought)
    );

    mesh = {
      sectors,
      links: buildLinks(sectors),
      pressure: buildPressureMap(sectors),
      density: buildDensityMap(sectors),
      topology_state: computeTopologyState(thought),
      updated_at: now()
    };

    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:topology-mesh:update",
        mesh
      );

      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:topology-pressure:update",
        {
          topology_state: mesh.topology_state,
          pressure: mesh.pressure
        }
      );

      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:topology-density:update",
        {
          topology_state: mesh.topology_state,
          density: mesh.density
        }
      );
    }

    return {
      ok: true,
      version: VERSION,
      mesh
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at: mesh.updated_at,
      topology_state: mesh.topology_state,
      sectors: mesh.sectors.length,
      links: mesh.links.length,
      pressure_zones: mesh.pressure.length,
      density_fields: mesh.density.length
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 9000);

    rebuild();

    if(window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__){
      clearInterval(window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__);
    }

    window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__ =
      setInterval(rebuild, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__){
      clearInterval(window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__);
      window.__EXECUTIA_TOPOLOGY_MESH_INTERVAL__ = null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_TOPOLOGY_MESH = {
      version: VERSION,
      rebuild,
      snapshot,
      start,
      stop
    };

    if(window.EXECUTIA_SIGNAL_BUS){
      window.EXECUTIA_SIGNAL_BUS.emit(
        "runtime:topology-mesh:ready",
        { version: VERSION }
      );
    }

    rebuild();

    window.dispatchEvent(
      new CustomEvent(
        "executia:topology-mesh-ready",
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
