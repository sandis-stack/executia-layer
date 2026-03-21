const run = document.getElementById("run");
const resultEl = document.getElementById("result");

async function sha256(data){
 const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
 return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function evaluate(ctx){
 const trace = [];
 const auth = true; trace.push({step:"AUTH",ok:auth});
 const budget = ctx.amount < 5000000; trace.push({step:"BUDGET",ok:budget});
 const supplier = ctx.supplier === "Verified"; trace.push({step:"SUPPLIER",ok:supplier});

 const status = trace.every(t=>t.ok) ? "APPROVED" : "BLOCKED";

 return Object.freeze({
  status,
  trace:Object.freeze(trace.map(t=>Object.freeze(t)))
 });
}

run.onclick = async ()=>{
 const ctx = {amount:4200000, supplier:"Unverified"};
 const result = evaluate(ctx);
 const hash = await sha256(result);

 resultEl.innerHTML = `
  <div><strong>${result.status}</strong></div>
  <div class="mono">HASH: ${hash.slice(0,24)}...</div>
  <div class="mono">
   ${result.trace.map(t=>`${t.step} → ${t.ok?"OK":"FAIL"}`).join("<br>")}
  </div>
 `;
};
