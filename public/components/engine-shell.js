(function(){

  const NAV = [
    ["CONTROL","/dashboard"],
    ["GOVERNANCE","/console/governance.html"],
    ["LEDGER","/console/ledger.html"],
    ["AUDIT","/console/audit.html"],
    ["AUDIT LEDGER","/console/audit-ledger.html"],
    ["OPERATIONS","/console/operations.html"],
    ["PROOFS","/console/proofs.html"],
    ["HEALTH","/health"]
  ];

  function normalize(path){
    return path.replace(/index\.html$/,"");
  }

  function active(path){
    const current = normalize(location.pathname);
    return normalize(path) === current;
  }

  function render(){
    const shell = document.querySelector(".ex-engine-shell");
    if(!shell) return;

    const header = document.createElement("header");
    header.className = "ex-engine-header";

    header.innerHTML = `
      <div class="ex-engine-header-inner">

        <div class="ex-engine-brand">
          <a class="ex-engine-brand-main" href="/">
            EXECUTIA™
          </a>

          <span class="ex-engine-brand-sub">
            EXECUTION ENGINE
          </span>
        </div>

        <nav class="ex-engine-nav">
          ${NAV.map(([label,path]) => `
            <a href="${path}" class="${active(path) ? "active" : ""}">
              ${label}
            </a>
          `).join("")}
        </nav>

        <a class="ex-engine-entry" href="/">
          Entry ↗
        </a>

      </div>
    `;

    shell.prepend(header);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", render);
  }else{
    render();
  }

})();
