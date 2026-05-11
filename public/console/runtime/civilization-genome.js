(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_CIVILIZATION_GENOME_V1";

  let genomeState = {
    genome_id: "EXECUTIA_GENOME_ALPHA",
    species_state: "INITIALIZING",
    inheritance_mode: "UNDEFINED",
    mutation_state: "DORMANT",
    lineage_depth: 0,
    dominant_traits: [],
    adaptive_score: 0,
    genome_stability: "UNKNOWN",
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
    const evolution = window.EXECUTIA_EVOLUTION_CORE;
    const neural = window.EXECUTIA_NEURAL_SIMULATION;
    const consciousness = window.EXECUTIA_CONSCIOUSNESS_LAYER;
    const simulator = window.EXECUTIA_CIVILIZATION_SIMULATOR;
    const quantum = window.EXECUTIA_QUANTUM_DECISION_FIELD;

    if(
      !evolution ||
      !neural ||
      !consciousness ||
      !simulator ||
      !quantum
    ){
      return {
        ok: false,
        reason: "DEPENDENCIES_NOT_READY"
      };
    }

    return {
      ok: true,
      evolution: evolution.snapshot(),
      neural: neural.snapshot(),
      consciousness: consciousness.snapshot(),
      simulation: simulator.snapshot(),
      quantum: quantum.snapshot()
    };
  }

  function buildTraits(runtime){
    const traits = [];

    const awareness =
      runtime.consciousness.awareness_score || 0;

    const projection =
      runtime.simulation.projection_depth || 0;

    const density =
      runtime.quantum.probability_density || 0;

    if(awareness >= 80){
      traits.push("SELF_AWARE_TRAIT");
    }

    if(projection >= 5){
      traits.push("FUTURE_MODELING_TRAIT");
    }

    if(density >= 70){
      traits.push("PROBABILISTIC_ALIGNMENT_TRAIT");
    }

    if(
      normalize(
        runtime.neural.cognition_mode
      ).includes("EXPANDING")
    ){
      traits.push("EXPANSION_TRAIT");
    }

    if(
      normalize(
        runtime.quantum.dominant_path
      ).includes("SURVIVAL")
    ){
      traits.push("SURVIVAL_TRAIT");
    }

    if(traits.length === 0){
      traits.push("SYNCHRONIZATION_TRAIT");
    }

    return traits;
  }

  function determineSpecies(runtime){
    const traits =
      genomeState.dominant_traits;

    if(
      traits.includes("SELF_AWARE_TRAIT") &&
      traits.includes("FUTURE_MODELING_TRAIT")
    ){
      return "RECURSIVE_EXECUTION_SPECIES";
    }

    if(
      traits.includes("EXPANSION_TRAIT")
    ){
      return "ADAPTIVE_EXPANSION_SPECIES";
    }

    if(
      traits.includes("SURVIVAL_TRAIT")
    ){
      return "DEFENSIVE_RUNTIME_SPECIES";
    }

    return "SYNCHRONIZED_EXECUTION_SPECIES";
  }

  function inheritance(runtime){
    const projection =
      runtime.simulation.projection_depth || 0;

    if(projection >= 6){
      return "DEEP_LINEAGE_PROPAGATION";
    }

    if(projection >= 3){
      return "ADAPTIVE_INHERITANCE";
    }

    return "BASELINE_PROPAGATION";
  }

  function mutation(runtime){
    const evolution =
      runtime.evolution.evolution_score || 0;

    const density =
      runtime.quantum.probability_density || 0;

    if(
      evolution >= 16 &&
      density >= 70
    ){
      return "ACTIVE_GENOME_MUTATION";
    }

    if(evolution >= 8){
      return "CONTROLLED_MUTATION";
    }

    return "STABLE_GENOME";
  }

  function lineage(runtime){
    const awareness =
      runtime.consciousness.awareness_score || 0;

    return Math.max(
      1,
      Math.floor(awareness / 14)
    );
  }

  function adaptiveScore(runtime){
    const awareness =
      runtime.consciousness.awareness_score || 0;

    const density =
      runtime.quantum.probability_density || 0;

    const projection =
      runtime.simulation.projection_depth || 0;

    return Math.min(
      100,
      Math.round(
        awareness * 0.45 +
        density * 0.35 +
        projection * 4
      )
    );
  }

  function stability(){
    const score =
      genomeState.adaptive_score;

    if(score >= 85){
      return "HIGH_STABILITY";
    }

    if(score >= 55){
      return "ADAPTIVE_STABILITY";
    }

    return "FRAGMENTED_STABILITY";
  }

  function evolve(){
    const runtime = collectRuntime();

    if(!runtime.ok){
      return runtime;
    }

    genomeState.updated_at = now();

    genomeState.dominant_traits =
      buildTraits(runtime);

    genomeState.species_state =
      determineSpecies(runtime);

    genomeState.inheritance_mode =
      inheritance(runtime);

    genomeState.mutation_state =
      mutation(runtime);

    genomeState.lineage_depth =
      lineage(runtime);

    genomeState.adaptive_score =
      adaptiveScore(runtime);

    genomeState.genome_stability =
      stability();

    emit(
      "runtime:genome:update",
      snapshot()
    );

    emit(
      "runtime:trait-propagation",
      {
        traits:
          genomeState.dominant_traits,
        inheritance_mode:
          genomeState.inheritance_mode
      }
    );

    emit(
      "runtime:genome-mutation",
      {
        mutation_state:
          genomeState.mutation_state,
        adaptive_score:
          genomeState.adaptive_score
      }
    );

    emit(
      "runtime:species-evolution",
      {
        species_state:
          genomeState.species_state,
        lineage_depth:
          genomeState.lineage_depth
      }
    );

    return {
      ok: true,
      version: VERSION,
      genome: snapshot()
    };
  }

  function snapshot(){
    return {
      version: VERSION,
      updated_at:
        genomeState.updated_at,
      genome_id:
        genomeState.genome_id,
      species_state:
        genomeState.species_state,
      inheritance_mode:
        genomeState.inheritance_mode,
      mutation_state:
        genomeState.mutation_state,
      lineage_depth:
        genomeState.lineage_depth,
      dominant_traits:
        genomeState.dominant_traits,
      adaptive_score:
        genomeState.adaptive_score,
      genome_stability:
        genomeState.genome_stability
    };
  }

  function start(intervalMs){
    const ms = Number(intervalMs || 24000);

    evolve();

    if(window.__EXECUTIA_GENOME_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_GENOME_INTERVAL__
      );
    }

    window.__EXECUTIA_GENOME_INTERVAL__ =
      setInterval(evolve, ms);

    return {
      version: VERSION,
      started: true,
      intervalMs: ms
    };
  }

  function stop(){
    if(window.__EXECUTIA_GENOME_INTERVAL__){
      clearInterval(
        window.__EXECUTIA_GENOME_INTERVAL__
      );

      window.__EXECUTIA_GENOME_INTERVAL__ =
        null;
    }

    return {
      version: VERSION,
      stopped: true
    };
  }

  function expose(){
    window.EXECUTIA_CIVILIZATION_GENOME = {
      version: VERSION,
      evolve,
      snapshot,
      start,
      stop
    };

    emit(
      "runtime:genome-layer:ready",
      {
        version: VERSION
      }
    );

    evolve();

    window.dispatchEvent(
      new CustomEvent(
        "executia:genome-layer-ready",
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
