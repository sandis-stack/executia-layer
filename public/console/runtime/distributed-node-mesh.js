(function(){
  "use strict";

  const VERSION = "EXECUTIA_DISTRIBUTED_NODE_MESH_V1";

  let meshState = {
    mesh_state: "INITIALIZING",
    node_count: 0,
    synchronization_state: "UNDEFINED",
    consensus_state: "UNDEFINED",
    propagation_state: "DORMANT",
    network_pressure: 0,
    coherence_score: 0,
    active_nodes: [],
    active_links: [],
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
    const kernel =
      window.EXECUTIA_UNIFIED_KERNEL;

    const reproduction =
      window.EXECUTIA_CIVILIZATION_REPRODUCTION_CORE;

    const nervous =
      window.EXECUTIA_CIVILIZATION_NERVOUS_SYSTEM;

    const economy =
      window.EXECUTIA_CIVILIZATION_ECONOMY_CORE;

    const law =
      window.EXECUTIA_CIVILIZATION_LAW_CORE;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !kernel ||
      !reproduction ||
      !nervous ||
      !economy ||
      !law ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      kernel: kernel.snapshot(),
      reproduction: reproduction.snapshot(),
      nervous: nervous.snapshot(),
      economy: economy.snapshot(),
      law: law.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function buildNodes(runtime){
    const base = [
      "CORE_NODE",
      "COGNITION_NODE",
      "REALITY_NODE",
      "LAW_NODE",
      "ECONOMY_NODE"
    ];

    if(
      normalize(
        runtime.reproduction.propagation_state
      ).includes("AUTONOMOUS")
    ){
      base.push("REPLICATION_NODE");
    }

    if(
      normalize(
        runtime.kernel.civilization_state
      ).includes("AUTONOMOUS")
    ){
      base.push("CIVILIZATION_NODE");
    }

    return base.map((name, index) => ({
      id: name,
      index,
      state: "ACTIVE",
      role:
        index === 0
          ? "KERNEL"
          : name.replace("_NODE", ""),
      weight:
        40 + index * 7,
      synchronized: true
    }));
  }

  function buildLinks(nodes){
    const links = [];

    for(let i = 0; i < nodes.length - 1; i++){
      links.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        channel: "RUNTIME_SYNC",
        integrity: "VERIFIED"
      });
    }

    if(nodes.length > 2){
      links.push({
        from: nodes[0].id,
        to: nodes[nodes.length - 1].id,
        channel: "KERNEL_BACKBONE",
        integrity: "VERIFIED"
      });
    }

    return links;
  }

  function coherence(runtime){
    const kernel =
      runtime.kernel.coherence_score || 0;

    const law =
      runtime.law.law_density || 0;

    return Math.min(
      100,
      Math.round(
        kernel * 0.6 +
        law * 0.4
      )
    );
  }

  function pressure(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const resource =
      runtime.economy.resource_pressure || 0;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        resource * 0.4
      )
    );
  }

  function synchronization(runtime){
    const velocity =
      runtime.nervous.signal_velocity || 0;

    const kernel =
      runtime.kernel.coherence_score || 0;

    if(velocity >= 85 && kernel >= 85){
      return "FULL_NODE_SYNCHRONIZATION";
    }

    if(velocity >= 55){
      return "ADAPTIVE_NODE_SYNCHRONIZATION";
    }

    return "LOCAL_NODE_SYNCHRONIZATION";
  }

  function consensus(runtime){
    const law =
      normalize(
        runtime.law.constitutional_integrity
      );

    if(law.includes("IMMUTABLE")){
      return "CONSTITUTIONAL_CONSENSUS";
    }

    if(law.includes("STABLE")){
      return "STABLE_CONSENSUS";
    }

    return "PARTIAL_CONSENSUS";
  }

  function propagation(runtime){
    const propagation =
      normalize(
        runtime.reproduction.propagation_state
      );

    if(propagation.includes("AUTONOMOUS")){
      return "AUTONOMOUS_NODE_PROPAGATION";
    }

    if(propagation.includes("ADAPTIVE")){
      return "ADAPTIVE_NODE_PROPAGATION";
    }

    return "LIMITED_NODE_PROPAGATION";
  }

  function synchronize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    const nodes = buildNodes(runtime);
    const links = buildLinks(nodes);

    meshState.updated_at = now();
    meshState.active_nodes = nodes;
    meshState.active_links = links;
    meshState.node_count = nodes.length;
    meshState.coherence_score = coherence(runtime);
    meshState.network_pressure = pressure(runtime);
    meshState.synchronization_state = synchronization(runtime);
    meshState.consensus_state = consensus(runtime);
    meshState.propagation_state = propagation(runtime);

    meshState.mesh_state =
      meshState.coherence_score >= 85
        ? "DISTRIBUTED_RUNTIME_MESH"
        : meshState.coherence_score >= 60
          ? "ADAPTIVE_RUNTIME_MESH"
          : "LOCAL_RUNTIME_MESH";

    emit(
      "runtime:distributed-node-mesh:update",
      snapshot()
    );

    emit(
      "runtime:node-synchronization",
      {
        synchronization_state:
          meshState.synchronization_state,
        node_count:
          meshState.node_count
      }
    );

    emit(
      "runtime:node-consensus",
      {
        consensus_state:
          meshState.consensus_state,
        coherence_score:
          meshState.coherence_score
      }
    );

    emit(
      "runtime:node-propagation",
      {
        propagation_state:
          meshState.propagation_state,
        active_links:
          meshState.active_links
      }
    );

    return {
      ok:true,
      version: VERSION,
      distributed_node_mesh: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        meshState.updated_at,
      mesh_state:
        meshState.mesh_state,
      node_count:
        meshState.node_count,
      synchronization_state:
        meshState.synchronization_state,
      consensus_state:
        meshState.consensus_state,
      propagation_state:
        meshState.propagation_state,
      network_pressure:
        meshState.network_pressure,
      coherence_score:
        meshState.coherence_score,
      active_nodes:
        meshState.active_nodes,
      active_links:
        meshState.active_links
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 53000);

    synchronize();

    if(window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__
      );
    }

    window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__ =
      setInterval(synchronize, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__
      );

      window.__EXECUTIA_DISTRIBUTED_NODE_MESH_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_DISTRIBUTED_NODE_MESH = {
      version: VERSION,
      synchronize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:distributed-node-mesh:ready",
      {
        version: VERSION
      }
    );

    synchronize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:distributed-node-mesh-ready",
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
