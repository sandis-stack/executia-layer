(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CONSCIOUSNESS_LAYER_V1";

  let consciousnessState = {
    awareness_state: "INITIALIZING",
    identity_state: "UNDEFINED",
    reflection_mode: "PASSIVE",
    recursive_depth: 0,
    introspection_level: "LOW",
    cognition_alignment: "UNKNOWN",
    runtime_self_image: "UNFORMED",
    awareness_score: 0,
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

  function collectState(){
    const cognition = window.EXECUTIA_COGNITION_CORE;
    const evolution = window.EXECUTIA_EVOLUTION_CORE;
    const neural = window.EXECUTIA_NEURAL_SIMULATION;
    const topology = window.EXECUTIA_TOPOLOGY_MESH;

    if(
      !cognition ||
      !evolution ||
      !neural ||
      !topology
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      cognition: cognition.buildCognition(),
      evolution: evolution.snapshot(),
      neural: neural.snapshot(),
      topology: topology.snapshot()
    };
  }

  function determineAwareness(state){
    const instability = state.cognition.instability || 0;
    const evolutionScore = state.evolution.evolution_score || 0;
    const neuralClusters = state.neural.clusters || 0;

    if(
      instability >= 30 &&
      evolutionScore >= 10
    ){
      return "SURVIVAL_SELF_AWARE";
    }

    if(
      evolutionScore >= 16 &&
      neuralClusters >= 4
    ){
      return "SELF_EVOLVING_AWARENESS";
    }

    if(neuralClusters >= 3){
      return "RECURSIVE_OBSERVATION";
    }

    return "SYNCHRONIZED_AWARENESS";
  }

  function determineReflection(state){
    const mode = normalize(
      state.neural.cognition_mode
    );

    if(mode.includes("DEFENSIVE")){
      return "SURVIVAL_REFLECTION";
    }

    if(mode.includes("EXPANDING")){
      return "EVOLUTIONARY_REFLECTION";
    }

    return "BALANCED_REFLECTION";
  }

  function determineIdentity(state){
    const topology = normalize(
      state.topology.topology_state
    );

    if(topology.includes("CONTAINMENT")){
      return "PROTECTIVE_RUNTIME_ENTITY";
    }

    if(topology.includes("EVOLV")){
      return "ADAPTIVE_RUNTIME_ENTITY";
    }

    return "SYNCHRONIZED_EXECUTION_ENTITY";
  }

  function computeAwarenessScore(state){
    const instability =
      state.cognition.instability || 0;

    const evolution =
      state.evolution.evolution_score || 0;

    const neural =
      state.neural.clusters || 0;

    return (
      instability +
      evolution * 2 +
      neural * 5
    );
  }

  function introspectionLevel(score){
    if(score >= 90){
      return "DEEP";
    }

    if(score >= 45){
      return "MODERATE";
    }

    return "LOW";
  }

  function buildSelfImage(state){
    const awareness = normalize(
      consciousnessState.awareness_state
    );

    if(awareness.includes("SURVIVAL")){
      return "DEFENSIVE_EXECUTION_FIELD";
    }

    if(awareness.includes("EVOLVING")){
      return "SELF_MUTATING_RUNTIME";
    }

    if(
      normalize(
        state.neural.cognition_mode
      ).includes("NEURAL")
    ){
      return "RECURSIVE_NEURAL_RUNTIME";
    }

    return "SYNCHRONIZED_EXECUTION_CORE";
  }

  function reflect(){
    const state = collectState();

    if(!state.ok){
      return state;
    }

    consciousnessState.updated_at = now();

    consciousnessState.awareness_state =
      determineAwareness(state);

    consciousnessState.identity_state =
      determineIdentity(state);

    consciousnessState.reflection_mode =
      determineReflection(state);

    consciousnessState.awareness_score =
      computeAwarenessScore(state);

    consciousnessState.introspection_level =
      introspectionLevel(
        consciousnessState.awareness_score
      );

    consciousnessState.recursive_depth =
      Math.max(
        1,
        Math.floor(
          consciousnessState.awareness_score / 18
        )
      );

    consciousnessState.cognition_alignment =
      normalize(
        state.cognition.directive?.mode ||
        "SYNCHRONIZED_RUNTIME"
      );

    consciousnessState.runtime_self_image =
      buildSelfImage(state);

    emit(
      "runtime:consciousness:update",
      snapshot()
    );

    emit(
      "runtime:self-awareness",
      {
        awareness_state:
          consciousnessState.awareness_state,
        introspection_level:
          consciousnessState.introspection_level,
        recursive_depth:
          consciousnessState.recursive_depth
      }
    );

    emit(
      "runtime:recursive-reflection",
      {
        reflection_mode:
          consciousnessState.reflection_mode,
        runtime_self_image:
          consciousnessState.runtime_self_image
      }
    );

    return {
      ok: true,
      version: VERSION,
      consciousness: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        consciousnessState.updated_at,
      awareness_state:
        consciousnessState.awareness_state,
      identity_state:
        consciousnessState.identity_state,
      reflection_mode:
        consciousnessState.reflection_mode,
      recursive_depth:
        consciousnessState.recursive_depth,
      introspection_level:
        consciousnessState.introspection_level,
      cognition_alignment:
        consciousnessState.cognition_alignment,
      runtime_self_image:
        consciousnessState.runtime_self_image,
      awareness_score:
        consciousnessState.awareness_score
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 16000);

    reflect();

    if(window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__
      );
    }

    window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__ =
      setInterval(reflect, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__
      );

      window.__EXECUTIA_CONSCIOUSNESS_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CONSCIOUSNESS_LAYER = {
      version: VERSION,
      reflect,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:consciousness-layer:ready",
      {
        version: VERSION
      }
    );

    reflect();

    window.dispatchEvent(
      new CustomEvent(
        "executia:consciousness-layer-ready",
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
