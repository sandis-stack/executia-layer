(function registerExecutiaHomepageAuditResult(global) {
  const EXECUTION_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const EVALUATION_LEVELS = ["NOT SUITABLE", "PARTIALLY SUITABLE", "SUITABLE", "HIGH VALUE CANDIDATE"];

  const ISSUE_CATALOG = [
    {
      id: "unverified_approval",
      issue: "Unverified approval chain",
      impact: "Execution before validation",
      severity(score) {
        return score < 68 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return /approval|payment|supplier|contract|tender|procure/i.test(ctx.combined);
      }
    },
    {
      id: "missing_accountability",
      issue: "Missing execution accountability",
      impact: "Responsibility fragmentation",
      severity(score) {
        return score < 70 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return ctx.score < 70 || ctx.apiResult?.failure_prevention_active;
      }
    },
    {
      id: "delayed_audit",
      issue: "Delayed audit visibility",
      impact: "Post-fact audit discovery",
      severity(score) {
        return score < 75 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return ctx.score < 78 || /audit|proof|verify|verification/i.test(ctx.combined);
      }
    },
    {
      id: "cross_system",
      issue: "Cross-system inconsistency",
      impact: "Responsibility fragmentation",
      severity(score) {
        return score < 72 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return ctx.score < 75;
      }
    },
    {
      id: "registry_mismatch",
      issue: "Registry mismatch",
      impact: "Compliance exposure",
      severity() {
        return "HIGH";
      },
      applies(ctx) {
        return ctx.registryConfirmed === false && ctx.countryIsRegistryJurisdiction;
      }
    },
    {
      id: "missing_authority",
      issue: "Missing decision authority",
      impact: "Compliance exposure",
      severity(score) {
        return score < 65 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return ctx.score < 65 || (ctx.apiResult?.blocking_reasons || []).length > 0;
      }
    },
    {
      id: "missing_controls",
      issue: "Missing validation controls",
      impact: "Compliance exposure",
      severity(score) {
        return score < 72 ? "HIGH" : "MEDIUM";
      },
      applies(ctx) {
        return ctx.score < 80;
      }
    }
  ];

  const ACTION_CATALOG = [
    {
      priority: 1,
      action: "Require validation before execution commit",
      reason: "Execution may proceed before governance validation is complete",
      applies(ctx) {
        return ctx.detectedIds.has("unverified_approval") || ctx.score < 72;
      }
    },
    {
      priority: 2,
      action: "Record decision authority and trace",
      reason: "Accountability gaps fragment responsibility across the process",
      applies(ctx) {
        return ctx.detectedIds.has("missing_authority") || ctx.detectedIds.has("missing_accountability");
      }
    },
    {
      priority: 3,
      action: "Establish registry proof before operational commit",
      reason: "Registry mismatch increases compliance exposure at commit time",
      applies(ctx) {
        return ctx.detectedIds.has("registry_mismatch") || ctx.score < 78;
      }
    },
    {
      priority: 4,
      action: "Enable audit visibility before execution closes",
      reason: "Delayed audit visibility defers discovery until after execution",
      applies(ctx) {
        return ctx.detectedIds.has("delayed_audit");
      }
    },
    {
      priority: 5,
      action: "Align cross-system execution records",
      reason: "Inconsistent records across systems obscure execution truth",
      applies(ctx) {
        return ctx.detectedIds.has("cross_system");
      }
    },
    {
      priority: 6,
      action: "Close validation control gaps",
      reason: "Missing controls leave execution exposed to undetected failure",
      applies(ctx) {
        return ctx.detectedIds.has("missing_controls");
      }
    }
  ];

  function normalizeCountry(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isRegistryJurisdiction(country) {
    const c = normalizeCountry(country);
    return c === "norway" || c === "no" || c === "norge";
  }

  function riskBand(score, elevated) {
    if (elevated) return "HIGH";
    if (score < 65) return "HIGH";
    if (score < 82) return "MEDIUM";
    return "LOW";
  }

  function mapExecutionRisk(apiResult) {
    const score = Number(apiResult?.execution_score) || 0;
    const blocked = (apiResult?.blocking_reasons || []).length > 0;
    if (blocked && score < 50) return "CRITICAL";
    if (score < 45) return "CRITICAL";
    if (blocked || score < 65) return "HIGH";
    if (score < 82) return "MEDIUM";
    return "LOW";
  }

  function mapComplianceExposure(apiResult, snapshot) {
    const score = Number(apiResult?.execution_score) || 0;
    const sector = String(snapshot.sector || "").toLowerCase();
    const regulated =
      /government|public procurement|finance|regulated|healthcare|energy/.test(sector);
    if (score < 65 || (regulated && score < 75)) return "HIGH";
    if (score < 82) return "MEDIUM";
    return "LOW";
  }

  function mapComplianceRisks(apiResult, snapshot, ctx) {
    const score = Number(apiResult?.execution_score) || 0;
    return {
      auditRisk: riskBand(score, ctx.detectedIds.has("delayed_audit")),
      validationRisk: riskBand(
        score,
        ctx.detectedIds.has("missing_controls") || ctx.detectedIds.has("registry_mismatch")
      ),
      approvalRisk: riskBand(score, ctx.detectedIds.has("unverified_approval")),
      traceabilityRisk: riskBand(
        score,
        ctx.detectedIds.has("missing_accountability") ||
          ctx.detectedIds.has("missing_authority") ||
          ctx.detectedIds.has("cross_system")
      )
    };
  }

  function mapAuditReadiness(score) {
    if (score >= 82) return "HIGH";
    if (score >= 65) return "MEDIUM";
    return "LOW";
  }

  function mapEvaluation(apiResult, snapshot) {
    const score = Number(apiResult?.execution_score) || 0;
    const blocked = (apiResult?.blocking_reasons || []).length > 0;
    const sector = String(snapshot.sector || "").toLowerCase();
    const highValueSector =
      /energy|government|public procurement|regulated|finance|infrastructure|healthcare/.test(sector);

    if (blocked && score < 55) return "NOT SUITABLE";
    if (score < 55) return "NOT SUITABLE";
    if (score >= 85 && highValueSector) return "HIGH VALUE CANDIDATE";
    if (score >= 82) return "SUITABLE";
    return "PARTIALLY SUITABLE";
  }

  function mapPilotSuitability(evaluation) {
    if (evaluation === "NOT SUITABLE") return "NO";
    return "YES";
  }

  function buildContext(snapshot, apiResult, options) {
    const combined = [snapshot.country, snapshot.sector, snapshot.organization, snapshot.process]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      snapshot,
      apiResult: apiResult || {},
      score: Number(apiResult?.execution_score) || 0,
      combined,
      registryConfirmed: options?.registryConfirmed !== false,
      countryIsRegistryJurisdiction: isRegistryJurisdiction(snapshot.country),
      detectedIds: new Set()
    };
  }

  function buildAuditResult(snapshot, apiResult, options) {
    const ctx = buildContext(snapshot, apiResult, options);
    const executionRisk = mapExecutionRisk(apiResult);
    const complianceExposure = mapComplianceExposure(apiResult, snapshot);
    const auditReadiness = mapAuditReadiness(ctx.score);
    const evaluation = mapEvaluation(apiResult, snapshot);
    const pilotSuitability = mapPilotSuitability(evaluation);

    const detectedIssues = [];
    for (const item of ISSUE_CATALOG) {
      if (item.applies(ctx)) {
        ctx.detectedIds.add(item.id);
        detectedIssues.push({
          issue: item.issue,
          severity: item.severity(ctx.score),
          impact: item.impact
        });
      }
    }

    const validationGaps = detectedIssues.length;
    const missingControls = detectedIssues
      .filter((row) => /control|authority|approval|accountability|registry/i.test(row.issue))
      .map((row) => row.issue);

    let recommendedActions = ACTION_CATALOG.filter((item) => item.applies(ctx))
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map((item, index) => ({
        priority: index + 1,
        action: item.action,
        reason: item.reason
      }));

    if (!recommendedActions.length) {
      recommendedActions = [
        {
          priority: 1,
          action: "Maintain current validation and audit controls",
          reason: "Baseline governance posture is sufficient for continued operation"
        }
      ];
    }

    const complianceRisks = mapComplianceRisks(apiResult, snapshot, ctx);

    return {
      executionRisk,
      riskScore: executionRisk,
      validationGaps,
      complianceExposure,
      complianceRisks,
      auditReadiness,
      pilotSuitability,
      pilotCandidate: pilotSuitability,
      missingControls,
      detectedIssues,
      recommendedActions,
      detectedRisks: detectedIssues.map((row) => row.issue),
      impacts: detectedIssues.map((row) => row.impact),
      evaluation,
      executionScore: ctx.score,
      timestamp: new Date().toISOString(),
      auditId: options?.auditId || null
    };
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildAuditPdfHtml(snapshot, auditResult) {
    const ts = auditResult.timestamp.slice(0, 19).replace("T", " ") + " UTC";
    const issuesHtml = (auditResult.detectedIssues || [])
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.issue)}</td><td>${escapeHtml(row.severity)}</td><td>${escapeHtml(row.impact)}</td></tr>`
      )
      .join("");
    const actionsHtml = (auditResult.recommendedActions || [])
      .map((row) => {
        const action = typeof row === "string" ? row : row.action;
        const priority = typeof row === "object" && row.priority != null ? row.priority : "—";
        const reason = typeof row === "object" && row.reason ? row.reason : "—";
        return `<tr><td>${escapeHtml(String(priority))}</td><td>${escapeHtml(action)}</td><td>${escapeHtml(reason)}</td></tr>`;
      })
      .join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>EXECUTIA Audit Report</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#1a2d42;max-width:720px;margin:0 auto;padding:24px;font-size:12px;line-height:1.5}
h1{font-size:20px}h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#4d6178;margin-top:24px}
.meta{margin:12px 0;padding:12px;background:#f6f8fb;border-radius:8px}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:11px}
th{text-transform:uppercase;letter-spacing:.08em;color:#4d6178}
ol{padding-left:18px}</style></head><body>
<h1>EXECUTIA Audit Report</h1>
<p>${escapeHtml(ts)}${auditResult.auditId ? " · " + escapeHtml(auditResult.auditId) : ""}</p>
<h2>Organization</h2><p class="meta">${escapeHtml(snapshot.organization)} · ${escapeHtml(snapshot.country)} · ${escapeHtml(snapshot.sector)} · ${escapeHtml(snapshot.process)}</p>
<h2>Executive Summary</h2>
<p class="meta">${escapeHtml(snapshot.organization)} · ${escapeHtml(snapshot.sector)} · ${escapeHtml(snapshot.country)} · ${escapeHtml(ts)}</p>
<h2>Execution Risk Level</h2><p><strong>${escapeHtml(auditResult.executionRisk || auditResult.riskScore)}</strong></p>
<h2>Compliance Exposure</h2>
<p>Audit Risk: <strong>${escapeHtml(auditResult.complianceRisks?.auditRisk || auditResult.complianceExposure)}</strong></p>
<p>Validation Risk: <strong>${escapeHtml(auditResult.complianceRisks?.validationRisk || "—")}</strong></p>
<p>Approval Risk: <strong>${escapeHtml(auditResult.complianceRisks?.approvalRisk || "—")}</strong></p>
<p>Traceability Risk: <strong>${escapeHtml(auditResult.complianceRisks?.traceabilityRisk || "—")}</strong></p>
<h2>Detected Governance Gaps</h2>
<table><thead><tr><th>Issue</th><th>Severity</th><th>Impact</th></tr></thead><tbody>${issuesHtml}</tbody></table>
<h2>Recommended Actions</h2>
<table><thead><tr><th>Priority</th><th>Action</th><th>Reason</th></tr></thead><tbody>${actionsHtml}</tbody></table>
<h2>EXECUTIA Evaluation</h2><p class="meta">${escapeHtml(auditResult.evaluation)}</p>
</body></html>`;
  }

  function buildAssessmentSummary(auditResult) {
    const parts = [
      "Risk Level: " + (auditResult.executionRisk || auditResult.riskScore || ""),
      "Validation Gaps: " + String(auditResult.validationGaps ?? ""),
      "Compliance Exposure: " + (auditResult.complianceExposure || ""),
      "Audit Readiness: " + (auditResult.auditReadiness || ""),
      "Pilot Candidate: " + (auditResult.pilotCandidate || ""),
      "Evaluation: " + (auditResult.evaluation || "")
    ];
    return parts.join(" · ").slice(0, 480);
  }

  function buildPilotQuery(snapshot, auditResult) {
    return new URLSearchParams({
      organization: snapshot.organization || "",
      process: (snapshot.process || "").slice(0, 180),
      domain: snapshot.sector || "",
      country: snapshot.country || "",
      risk: auditResult.executionRisk || "",
      evaluation: auditResult.evaluation || "",
      score: String(auditResult.executionScore || ""),
      gaps: String(auditResult.validationGaps || ""),
      pilot: auditResult.pilotCandidate || "",
      risks: (auditResult.detectedRisks || []).slice(0, 6).join("|"),
      summary: buildAssessmentSummary(auditResult)
    }).toString();
  }

  global.EXECUTIA_HOMEPAGE_AUDIT_RESULT = {
    EXECUTION_RISK_LEVELS,
    EVALUATION_LEVELS,
    buildAuditResult,
    buildAuditPdfHtml,
    buildPilotQuery,
    buildAssessmentSummary
  };
})(typeof window !== "undefined" ? window : globalThis);
