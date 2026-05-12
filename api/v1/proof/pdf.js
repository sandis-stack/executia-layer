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

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

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

async function fetchProofPackage(req, execution_id) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const authorization = req.headers.authorization || "";

  const response = await fetch(
    `${proto}://${host}/api/v1/proof/export?execution_id=${encodeURIComponent(execution_id)}`,
    {
      headers: authorization ? { Authorization: authorization } : {}
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const error = new Error(data?.error?.message || "Proof package unavailable.");
    error.code = data?.error?.code || "PROOF_PACKAGE_UNAVAILABLE";
    error.status = response.status || 500;
    throw error;
  }

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } });
    }

    const execution_id = req.query.execution_id;

    if (!execution_id) {
      return res.status(400).json({ ok: false, error: { code: "EXECUTION_ID_REQUIRED" } });
    }

    const proof = await fetchProofPackage(req, execution_id);

    const lines = [
      "EXECUTIA EXECUTION PROOF REPORT",
      "Execution-Time Proof Package",
      "",
      `Exported at: ${proof.exported_at || new Date().toISOString()}`,
      `Execution ID: ${proof.execution_id}`,
      `Mode: ${proof.mode}`,
      `Package State: ${proof.package_state}`,
      `Verified: ${proof.verified ? "TRUE" : "FALSE"}`,
      "",
      "PROOF",
      `Proof State: ${proof.proof?.proof_state || "-"}`,
      `Proof Version: ${proof.proof?.proof_version || "-"}`,
      `Proof Hash: ${proof.proof?.proof_hash || "-"}`,
      `Proof Verified: ${proof.proof?.verified ? "TRUE" : "FALSE"}`,
      "",
      "DECISION",
      `Status: ${proof.decision?.status || "-"}`,
      `Decision: ${proof.decision?.decision || "-"}`,
      `Reason: ${proof.decision?.reason || "-"}`,
      "",
      "ACTOR",
      `Email: ${proof.actor?.email || "-"}`,
      `Role: ${proof.actor?.role || "-"}`,
      "",
      "LEDGER",
      `Linked: ${proof.ledger?.linked ? "TRUE" : "FALSE"}`,
      `Core Ledger Entries: ${proof.ledger?.core_ledger_entries || 0}`,
      `Core Ledger Verified: ${proof.ledger?.core_ledger_verified ? "TRUE" : "FALSE"}`,
      `Settlement State: ${proof.ledger?.settlement_state || "-"}`,
      `Reconciliation State: ${proof.ledger?.reconciliation_state || "-"}`,
      "",
      "AUDIT",
      `Verified: ${proof.audit?.verified ? "TRUE" : "FALSE"}`,
      `Entries: ${proof.audit?.entries || 0}`,
      "",
      "REPLAY PATH",
      `Replay Type: ${proof.replay?.type || "-"}`,
      `Replay Events: ${proof.replay?.event_count || 0}`,
      ""
    ];

    for (const event of proof.replay?.path || []) {
      lines.push(`${event.source || "-"} | ${event.event_type || "-"} | ${event.state || "-"} | ${event.actor || "-"} | ${event.timestamp || "-"}`);
    }

    lines.push("");
    lines.push("INSTITUTIONAL PROOF FOOTER");
    lines.push("EXECUTIA is a governance execution system. It is not a bank, broker, investment platform, payment provider or financial intermediary.");
    lines.push("EXECUTIA validates execution logic, continuity and auditability before action becomes reality.");

    const pdf = buildPdf(lines);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="executia-execution-proof-${execution_id}.pdf"`);
    return res.status(200).send(pdf);
  } catch (err) {
    return res.status(err.status || 500).json({
      ok: false,
      error: {
        code: err.code || "PROOF_PDF_FAILED",
        message: err.message || "Execution proof PDF failed."
      }
    });
  }
}
