(function(){
  "use strict";

  const VERSION = "EXECUTIA_RUNTIME_ENGINE_V1";

  function text(id, fallback){
    const el = document.getElementById(id);
    return (el && el.textContent ? el.textContent.trim() : fallback);
  }

  function normalize(value){
    return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function collectLayerStates(){
    return [
      ["CAUSE", "CAUSE FIELD", "ROOT"],
      ["MEMORY", text("memoryFabricPill", "MEMORY SYNCHRONIZED"), "FABRIC"],
      ["CONTINUITY", text("executionContinuityPill", "CONTINUITY STABLE"), "FLOW"],
      ["PREDICTION", text("predictionFieldPill", "PREDICTION STABLE"), "MODEL"],
      ["DECISION", text("decisionFieldPill", "DECISION SYNCHRONIZED"), "INTENT"],
      ["ACTION", text("actionEnginePill", "ACTION SYNCHRONIZED"), "EXECUTE"],
      ["COMMIT", text("commitEnginePill", "COMMIT SYNCHRONIZED"), "STATE"],
      ["PROOF", text("proofEnginePill", "PROOF VERIFIED"), "VERIFY"],
      ["TRUTH", text("truthEnginePill", "TRUTH VERIFIED"), "TRUTH"],
      ["EVOLUTION", text("evolutionEnginePill", "EVOLUTION SYNCHRONIZED"), "ADAPT"],
      ["DIRECTIVE", text("directiveCorePill", "DIRECTIVE ACTIVE"), "STEER"],
      ["KERNEL", text("civilizationKernelPill", "KERNEL SYNCHRONIZED"), "CORE"],
      ["AWARENESS", text("civilizationConsciousnessPill", "CONSCIOUSNESS SYNCHRONIZED"), "FIELD"],
      ["REALITY", text("realitySynchronizationPill", "REALITY SYNCHRONIZED"), "ALIGN"],
      ["IMMUNE", text("civilizationImmunePill", "IMMUNE ACTIVE"), "DEFEND"],
      ["REGEN", text("civilizationRegenerationPill", "REGENERATION SYNCHRONIZED"), "HEAL"],
      ["ADAPT", text("civilizationAdaptationPill", "ADAPTATION SYNCHRONIZED"), "LEARN"],
      ["FORESIGHT", text("civilizationForesightPill", "FORESIGHT SYNCHRONIZED"), "FUTURE"],
      ["SOVEREIGNTY", text("civilizationSovereigntyPill", "SOVEREIGNTY VERIFIED"), "AUTH"],
      ["CONSENSUS", text("civilizationConsensusPill", "CONSENSUS VERIFIED"), "LEGIT"],
      ["META-LAW", text("civilizationMetaLawPill", "META-LAW VERIFIED"), "LAW"],
      ["CORE", text("civilizationCorePill", "CIVILIZATION CORE SYNCHRONIZED"), "UNIFY"],
      ["VISUAL", text("civilizationVisualizationPill", "TOPOLOGY SYNCHRONIZED"), "MAP"]
    ];
  }

  function computeSignalProfile(layerStates){
    const joined = normalize(layerStates.map((x) => x[1]).join(" "));

    const profile = {
      risk: "LOW",
      pressure: "LOW",
      synchronization: "HIGH",
      response: "OBSERVE",
      evolution: "STABLE",
      topology: "SYNCHRONIZED"
    };

    if(joined.includes("CONTESTED") || joined.includes("FRAGMENT") || joined.includes("DIVERG") || joined.includes("BROKEN") || joined.includes("MISMATCH") || joined.includes("FRACTURE")){
      profile.risk = "CRITICAL";
      profile.pressure = "HIGH";
      profile.synchronization = "LOW";
      profile.response = "CONTAIN_AND_REROUTE";
      profile.evolution = "LEARN_FROM_DIVERGENCE";
      profile.topology = "RISK_MAPPING";
      return profile;
    }

    if(joined.includes("CONTAIN") || joined.includes("ISOLAT") || joined.includes("PROTECT")){
      profile.risk = "CONTROLLED";
      profile.pressure = "CONTAINED";
      profile.synchronization = "PROTECTED";
      profile.response = "CONTAIN";
      profile.evolution = "HARDEN";
      profile.topology = "PROTECTED";
      return profile;
    }

    if(joined.includes("RECOVER") || joined.includes("REBUILD") || joined.includes("STABILIZ")){
      profile.risk = "ELEVATED";
      profile.pressure = "ELEVATED";
      profile.synchronization = "IMPROVING";
      profile.response = "STABILIZE";
      profile.evolution = "REBALANCE";
      profile.topology = "STABILIZING";
      return profile;
    }

    if(joined.includes("EVOLV") || joined.includes("ADAPT") || joined.includes("OPTIMIZ")){
      profile.risk = "CONTROLLED";
      profile.pressure = "OPTIMIZED";
      profile.synchronization = "INCREASING";
      profile.response = "OPTIMIZE";
      profile.evolution = "ACTIVE";
      profile.topology = "EVOLVING";
      return profile;
    }

    return profile;
  }

  function computeTopologyNodes(layerStates){
    const total = layerStates.length || 1;

    return layerStates.map(([name, state, tag], index) => {
      const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
      const status = normalize(state);
      const risky = status.includes("DIVERG") || status.includes("BROKEN") || status.includes("MISMATCH") || status.includes("CONTESTED") || status.includes("FRAGMENT");
      const protectedState = status.includes("CONTAIN") || status.includes("ISOLAT") || status.includes("PROTECT");

      return {
        name,
        state,
        tag,
        index,
        cx: 520 + Math.cos(angle) * 360,
        cy: 300 + Math.sin(angle) * 220,
        radius: risky ? 18 : protectedState ? 16 : 14,
        risky,
        protectedState
      };
    });
  }

  function snapshot(){
    const layers = collectLayerStates();
    const signals = computeSignalProfile(layers);
    const nodes = computeTopologyNodes(layers);

    return {
      version: VERSION,
      timestamp: new Date().toISOString(),
      layers,
      signals,
      nodes,
      summary: {
        layers: layers.length,
        risk: signals.risk,
        response: signals.response,
        topology: signals.topology,
        evolution: signals.evolution
      }
    };
  }

  function expose(){
    window.EXECUTIA_RUNTIME_ENGINE = {
      version: VERSION,
      collectLayerStates,
      computeSignalProfile,
      computeTopologyNodes,
      snapshot
    };

    window.dispatchEvent(new CustomEvent("executia:runtime-engine-ready", {
      detail: snapshot()
    }));
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", expose, { once: true });
  } else {
    expose();
  }
})();
