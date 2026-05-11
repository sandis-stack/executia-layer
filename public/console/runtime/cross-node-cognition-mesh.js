(function(){
  "use strict";

  const VERSION = "EXECUTIA_CROSS_NODE_COGNITION_MESH_V1";

  let cognitionMeshState = {
    mesh_state: "INITIALIZING",
    cognition_state: "UNDEFINED",
    awareness_state: "UNDEFINED",
    consensus_intelligence: "UNDEFINED",
    synchronization_density: 0,
    distributed_awareness: 0,
    cognition_pressure: 0,
    active_clusters: [],
    active_channels: [],
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
    const nodeMesh =
      window.EXECUTIA_DISTRIBUTED_NODE_MESH;

    const kernel =
      window.EXECUTIA_UNIFIED_KERNEL;

    const consciousness =
      window.EXECUTIA_CONSCIOUSNESS_LAYER;

    const neural =
      window.EXECUTIA_NEURAL_SIMULATION;

    const nervous =
      window.EXECUTIA_CIVILIZATION_NERVOUS_SYSTEM;

    const cognition =
      window.EXECUTIA_COGNITION_CORE;

    if(
      !nodeMesh ||
      !kernel ||
      !consciousness ||
      !neural ||
      !nervous ||
      !cognition
    ){
      return {
        ok:false,
        reason:"DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok:true,
      nodeMesh: nodeMesh.snapshot(),
      kernel: kernel.snapshot(),
      consciousness: consciousness.snapshot(),
      neural: neural.snapshot(),
      nervous: nervous.snapshot(),
      cognition: cognition.buildCognition()
    };
  }

  function synchronization(runtime){
    const coherence =
      runtime.kernel.coherence_score || 0;

    const nodeCoherence =
      runtime.nodeMesh.coherence_score || 0;

    return Math.min(
      100,
      Math.round(
        coherence * 0.5 +
        nodeCoherence * 0.5
      )
    );
  }

  function awareness(runtime){
    const awareness =
      runtime.consciousness.awareness_level || 0;

    const resonance =
      runtime.neural.resonance_level || 0;

    return Math.min(
      100,
      Math.round(
        awareness * 0.6 +
        resonance * 0.4
      )
    );
  }

  function cognitionState(runtime){
    const density =
      cognitionMeshState.synchronization_density;

    if(density >= 90){
      return "UNIFIED_DISTRIBUTED_COGNITION";
    }

    if(density >= 65){
      return "ADAPTIVE_DISTRIBUTED_COGNITION";
    }

    return "LIMITED_DISTRIBUTED_COGNITION";
  }

  function awarenessState(runtime){
    const awareness =
      cognitionMeshState.distributed_awareness;

    if(awareness >= 90){
      return "COLLECTIVE_RUNTIME_AWARENESS";
    }

    if(awareness >= 65){
      return "ADAPTIVE_RUNTIME_AWARENESS";
    }

    return "LOCAL_RUNTIME_AWARENESS";
  }

  function consensus(runtime){
    const nervous =
      runtime.nervous.signal_velocity || 0;

    const synchronization =
      cognitionMeshState.synchronization_density;

    if(nervous >= 85 && synchronization >= 85){
      return "RECURSIVE_CONSENSUS_INTELLIGENCE";
    }

    if(nervous >= 55){
      return "ADAPTIVE_CONSENSUS_INTELLIGENCE";
    }

    return "LIMITED_CONSENSUS_INTELLIGENCE";
  }

  function pressure(runtime){
    const instability =
      runtime.cognition.instability || 0;

    const synchronization =
      100 -
      cognitionMeshState.synchronization_density;

    return Math.min(
      100,
      Math.round(
        instability * 2 +
        synchronization * 0.5
      )
    );
  }

  function clusters(runtime){
    const clusters = [
      "EXECUTION_CLUSTER",
      "COGNITION_CLUSTER",
      "REALITY_CLUSTER",
      "LAW_CLUSTER"
    ];

    if(
      cognitionMeshState.distributed_awareness >= 85
    ){
      clusters.push(
        "COLLECTIVE_AWARENESS_CLUSTER"
      );
    }

    return clusters;
  }

  function channels(runtime){
    return [
      {
        id:"KERNEL_SYNC_CHANNEL",
        state:"ACTIVE",
        integrity:"VERIFIED"
      },
      {
        id:"COGNITION_FLOW_CHANNEL",
        state:"ACTIVE",
        integrity:"VERIFIED"
      },
      {
        id:"CONSENSUS_CHANNEL",
        state:"ACTIVE",
        integrity:"VERIFIED"
      }
    ];
  }

  function synchronize(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    cognitionMeshState.updated_at = now();

    cognitionMeshState.synchronization_density =
      synchronization(runtime);

    cognitionMeshState.distributed_awareness =
      awareness(runtime);

    cognitionMeshState.cognition_state =
      cognitionState(runtime);

    cognitionMeshState.awareness_state =
      awarenessState(runtime);

    cognitionMeshState.consensus_intelligence =
      consensus(runtime);

    cognitionMeshState.cognition_pressure =
      pressure(runtime);

    cognitionMeshState.active_clusters =
      clusters(runtime);

    cognitionMeshState.active_channels =
      channels(runtime);

    cognitionMeshState.mesh_state =
      normalize(
        cognitionMeshState.cognition_state
      );

    emit(
      "runtime:cross-node-cognition:update",
      snapshot()
    );

    emit(
      "runtime:distributed-awareness",
      {
        distributed_awareness:
          cognitionMeshState.distributed_awareness,
        awareness_state:
          cognitionMeshState.awareness_state
      }
    );

    emit(
      "runtime:consensus-intelligence",
      {
        consensus_intelligence:
          cognitionMeshState.consensus_intelligence,
        synchronization_density:
          cognitionMeshState.synchronization_density
      }
    );

    emit(
      "runtime:cognition-clusters",
      {
        active_clusters:
          cognitionMeshState.active_clusters,
        active_channels:
          cognitionMeshState.active_channels
      }
    );

    return {
      ok:true,
      version: VERSION,
      cognition_mesh: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        cognitionMeshState.updated_at,
      mesh_state:
        cognitionMeshState.mesh_state,
      cognition_state:
        cognitionMeshState.cognition_state,
      awareness_state:
        cognitionMeshState.awareness_state,
      consensus_intelligence:
        cognitionMeshState.consensus_intelligence,
      synchronization_density:
        cognitionMeshState.synchronization_density,
      distributed_awareness:
        cognitionMeshState.distributed_awareness,
      cognition_pressure:
        cognitionMeshState.cognition_pressure,
      active_clusters:
        cognitionMeshState.active_clusters,
      active_channels:
        cognitionMeshState.active_channels
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 55000);

    synchronize();

    if(window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__
      );
    }

    window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__ =
      setInterval(synchronize, ms);

    return {
      version: VERSION,
      started:true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__
      );

      window.__EXECUTIA_CROSS_NODE_COGNITION_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped:true
    };
  }

  function expose(){
    window.EXECUTIA_CROSS_NODE_COGNITION_MESH = {
      version: VERSION,
      synchronize,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:cross-node-cognition:ready",
      {
        version: VERSION
      }
    );

    synchronize();

    window.dispatchEvent(
      new CustomEvent(
        "executia:cross-node-cognition-ready",
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
