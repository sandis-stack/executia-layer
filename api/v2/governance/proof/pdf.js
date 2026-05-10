import { db } from "../../../../services/db.js";

import {
  resolveJwtContext,
  requireJwtPermission
} from "../../../../services/jwt-auth.js";

import {
  verifyGovernanceHashChain
} from "../../../../services/governance-hash.js";

function pdfEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(text, width = 86) {
  const words = String(text ?? "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if ((line + " " + word).trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function buildPdf(rawLines) {
  const lines = rawLines.flatMap((line) => wrapLine(line));
  const pages = [];

  for (let i = 0; i < lines.length; i += 45) {
    pages.push(lines.slice(i, i + 45));
  }

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageIds = [];

  for (const pageLines of pages) {
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 790 Td",
      "14 TL",
      ...pageLines.map((line) => `(${pdfEscape(line)}) Tj T*`),
      "ET"
    ].join("\n");

    const contentId = add(
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
    );

    const pageId = add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );

    pageIds.push(pageId);
  }

  objects[catalogId - 1] =
    `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = Buffer.byteLength(pdf);

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return Buffer.from(pdf);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: { code: "METHOD_NOT_ALLOWED" }
      });
    }

    const context = await resolveJwtContext(req);

    const permission = requireJwtPermission(
      context,
      "governance.review.read"
    );

    if (!permission.ok && context?.user?.role !== "OPERATOR") {
      return res.status(401).json({
        ok: false,
        error: {
          code: "INVALID_JWT",
          message: "Governance proof PDF permission required."
        }
      });
    }

    const review_id = req.query.review_id;

    if (!review_id) {
      return res.status(400).json({
        ok: false,
        error: { code: "REVIEW_ID_REQUIRED" }
      });
    }

    const supabase = db();

    const { data: review, error: reviewError } = await supabase
      .from("governance_reviews")
      .select("*")
      .eq("id", review_id)
      .single();

    if (reviewError) throw reviewError;

    const { data: events, error: eventsError } = await supabase
      .from("governance_review_events")
      .select("*")
      .eq("review_id", review_id)
      .order("sequence_no", { ascending: true });

    if (eventsError) throw eventsError;

    const { data: freezes, error: freezesError } = await supabase
      .from("governance_freezes")
      .select("*")
      .or(`review_id.eq.${review_id},execution_id.eq.${review.execution_id},freeze_scope.eq.SYSTEM,freeze_scope.eq.ORGANIZATION`)
      .order("created_at", { ascending: true });

    if (freezesError) throw freezesError;

    const freezeIds = (freezes || []).map((freeze) => freeze.id);

    let freezeEvents = [];

    if (freezeIds.length > 0) {
      const { data: fetchedFreezeEvents, error: freezeEventsError } = await supabase
        .from("governance_freeze_events")
        .select("*")
        .in("freeze_id", freezeIds)
        .order("created_at", { ascending: true });

      if (freezeEventsError) throw freezeEventsError;

      freezeEvents = fetchedFreezeEvents || [];
    }

    const verification = await verifyGovernanceHashChain({
      supabase,
      review_id
    });

    const lines = [
      "EXECUTIA GOVERNANCE AUDIT REPORT",
      "Execution-Time Governance Proof",
      "",
      `Exported at: ${new Date().toISOString()}`,
      `Review ID: ${review.id}`,
      `Execution ID: ${review.execution_id || "-"}`,
      `Escalation Level: ${review.escalation_level ?? "-"}`,
      `Created At: ${review.created_at || "-"}`,
      `Updated At: ${review.updated_at || "-"}`,
      "",
      "VERIFICATION",
      `Verified: ${verification.verified ? "TRUE" : "FALSE"}`,
      `Events Checked: ${verification.events_checked || 0}`,
      `Head Hash: ${verification.head_hash || "-"}`,
      `Broken At: ${verification.broken_at || "-"}`,
      "",
      "EMERGENCY GOVERNANCE / FREEZE STATE",
      `Freezes Found: ${(freezes || []).length}`,
      `Freeze Events Found: ${(freezeEvents || []).length}`,
      ""
    ];

    for (const freeze of freezes || []) {
      lines.push(`Freeze ID: ${freeze.id}`);
      lines.push(`Scope: ${freeze.freeze_scope}`);
      lines.push(`Level: ${freeze.freeze_level}`);
      lines.push(`Status: ${freeze.status}`);
      lines.push(`Reason: ${freeze.freeze_reason}`);
      lines.push(`Review ID: ${freeze.review_id || "-"}`);
      lines.push(`Execution ID: ${freeze.execution_id || "-"}`);
      lines.push(`Created By: ${freeze.created_by_email || "-"}`);
      lines.push(`Released By: ${freeze.released_by_email || "-"}`);
      lines.push(`Created At: ${freeze.created_at || "-"}`);
      lines.push(`Released At: ${freeze.released_at || "-"}`);
      lines.push("");
    }

    for (const event of freezeEvents || []) {
      lines.push(`Freeze Event: ${event.event_type}`);
      lines.push(`Freeze ID: ${event.freeze_id}`);
      lines.push(`Actor: ${event.actor_email || event.actor_id || "-"}`);
      lines.push(`Created At: ${event.created_at || "-"}`);
      lines.push(`Details: ${JSON.stringify(event.details || {})}`);
      lines.push("");
    }

    const constitutionEvents = (events || []).filter((event) =>
      String(event.event_type || "").startsWith("CONSTITUTION_")
    );

    lines.push("CONSTITUTION LAYER");
    lines.push(`Constitution Events Found: ${constitutionEvents.length}`);
    lines.push("");

    for (const event of constitutionEvents) {
      lines.push(`Constitution Event: ${event.event_type}`);
      lines.push(`Rule: ${event.payload?.rule || "-"}`);
      lines.push(`Reason: ${event.payload?.reason || "-"}`);
      lines.push(`Actor: ${event.actor || "-"}`);
      lines.push(`Review ID: ${event.review_id || "-"}`);
      lines.push(`Execution ID: ${event.execution_id || "-"}`);
      lines.push(`Sequence: ${event.sequence_no}`);
      lines.push(`Prev Hash: ${event.prev_hash || "-"}`);
      lines.push(`Hash: ${event.hash || "-"}`);
      lines.push(`Context: ${JSON.stringify(event.payload?.context || {})}`);
      lines.push("");
    }

    lines.push("GOVERNANCE EVENT TIMELINE");
    lines.push("");


    for (const event of events || []) {
      lines.push(`Sequence: ${event.sequence_no}`);
      lines.push(`Event Type: ${event.event_type}`);
      lines.push(`Actor: ${event.actor || "-"}`);
      lines.push(`Created At: ${event.created_at || "-"}`);
      lines.push(`Prev Hash: ${event.prev_hash || "-"}`);
      lines.push(`Hash: ${event.hash || "-"}`);
      lines.push(`Payload: ${JSON.stringify(event.payload || {})}`);
      lines.push("");
    }

    lines.push("INSTITUTIONAL PROOF FOOTER");
    lines.push("This report proves governance event order, hash-chain continuity, operator action, constitution enforcement, freeze state, and execution-time governance integrity.");
    lines.push("EXECUTIA - Execution-Time Truth Layer");

    const pdf = buildPdf(lines);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="executia-governance-audit-${review_id}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);

    return res.status(200).send(pdf);
  } catch (error) {
    console.error("[EXECUTIA GOVERNANCE PROOF PDF ERROR]", error);

    return res.status(500).json({
      ok: false,
      error: {
        code: error.code || "GOVERNANCE_PROOF_PDF_FAILED",
        message: error.message || "Governance proof PDF failed."
      }
    });
  }
}
