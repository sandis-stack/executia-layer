const btn = document.getElementById("run");
const stepsEl = document.getElementById("steps");
const bar = document.getElementById("bar");
const resultEl = document.getElementById("result");

async function hash(data){
const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

btn.onclick = async ()=>{

stepsEl.innerHTML = "";
resultEl.innerHTML = "";
bar.style.width = "0%";

const checks = [
  {name:"AUTH", ok:true},
  {name:"BUDGET", ok:true},
  {name:"SUPPLIER", ok:false}
];

let progress = 0;

for(let i=0;i<checks.length;i++){
  const c = checks[i];

  const div = document.createElement("div");
  div.className = "step active";
  div.innerText = c.name + " → checking...";
  stepsEl.appendChild(div);

  await new Promise(r=>setTimeout(r,700));

  div.innerText = c.name + " → " + (c.ok ? "OK":"FAIL");
  div.classList.add(c.ok ? "ok":"fail");

  progress += 100/checks.length;
  bar.style.width = progress + "%";
}

const status = checks.every(c=>c.ok) ? "APPROVED":"BLOCKED";

const res = Object.freeze({
  status,
  trace:Object.freeze(checks.map(c=>Object.freeze(c)))
});

const h = await hash(res);

resultEl.innerHTML = `
STATUS: ${res.status}<br>
HASH: ${h.slice(0,32)}...
`;

};
