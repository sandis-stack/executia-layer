export function esc(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function mailTemplate(title, lines, body, action) {
  const rows = lines
    .map(([k, v]) => `<strong>${esc(k)}:</strong> ${esc(v)}<br/>`)
    .join("");

  const actionHtml =
    action?.url
      ? `<div style="margin-top:28px"><a href="${esc(action.url)}" style="display:inline-block;background:#0f2d4a;color:#ffffff;text-decoration:none;padding:14px 22px;font-size:13px;letter-spacing:1.5px;font-weight:700">${esc(action.label || "OPEN GOVERNANCE REVIEW")}</a></div>`
      : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f2d4a"><table width="100%" cellpadding="0" cellspacing="0" style="padding:38px 14px;background:#f3f6fa"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#fff;border:1px solid #d9e1ea"><tr><td style="padding:40px"><div style="font-size:12px;letter-spacing:4px;color:#60758b;font-weight:700;margin-bottom:24px">EXECUTIA · EXECUTION CONTROL</div><h1 style="margin:0 0 18px;font-size:32px;line-height:1.12;color:#0f2d4a">${esc(title)}</h1><p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#415168">${esc(body)}</p><div style="background:#f1f5f9;border-left:4px solid #0f2d4a;padding:20px 24px;font-family:Courier New,monospace;font-size:14px;line-height:1.8;color:#2a4260">${rows}${actionHtml}</div><div style="height:1px;background:#d9e1ea;margin:34px 0 22px"></div><p style="margin:0;font-size:14px;line-height:1.6;color:#60758b">EXECUTIA™<br/>Execution Control Standard<br/>ENTRY → ENGINE → PROOF → REQUEST</p></td></tr></table></td></tr></table></body></html>`;
}
