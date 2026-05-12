(function(){
  function moduleKey(){
    var path = window.location.pathname;
    if(path.includes("/control") || path.includes("operator")) return "control";
    if(path.includes("governance")) return "governance";
    if(path.includes("audit-ledger")) return "audit-ledger";
    if(path.includes("audit")) return "audit";
    if(path.includes("ledger")) return "ledger";
    if(path.includes("operations")) return "operations";
    if(path.includes("proof")) return "proofs";
    if(path.includes("/health")) return "health";
    return "dashboard";
  }

  function nav(){
    var active = moduleKey();
    var items = [
      ["control","/control","Control"],
      ["governance","/console/governance.html","Governance"],
      ["ledger","/console/ledger.html","Ledger"],
      ["audit","/console/audit.html","Audit"],
      ["audit-ledger","/console/audit-ledger.html","Audit Ledger"],
      ["operations","/console/operations.html","Operations"],
      ["proofs","/console/governance.html#proof","Proofs"],
      ["health","/health","Health"]
    ];

    return '<nav class="ex-engine-nav" aria-label="Engine navigation">' +
      items.map(function(item){
        return '<a class="' + (item[0] === active ? 'active' : '') + '" href="' + item[1] + '">' + item[2] + '</a>';
      }).join("") +
      '' +
    '</nav>';
  }

  function shell(){
    return '' +
      '<div class="ex-engine-header">' +
        '<div class="ex-engine-header-inner">' +
          '<a class="ex-engine-brand" href="https://executia.io" aria-label="EXECUTIA entry">' +
            '<span class="ex-engine-brand-main">EXECUTIA™</span>' +
            '<span class="ex-engine-brand-sub">Execution Engine</span>' +
          '</a>' +
          '<a class="ex-engine-entry" href="https://executia.io">Entry ↗</a>' +
        '</div>' +
        nav() +
        '<div class="ex-engine-status">' +
          '<span>Runtime: Active</span>' +
          '<span>Ledger: Verified</span>' +
          '<span>Audit: Recording</span>' +
          '<span>Proof: Enabled</span>' +
        '</div>' +
      '</div>';
  }

  document.addEventListener("DOMContentLoaded", function(){
    if(document.querySelector("[data-ex-engine-shell]")) return;

    document.body.classList.add("ex-engine-shell");

    var oldHeaders = document.querySelectorAll(".ex-header-shell, header:first-of-type, .console-nav, .engine-nav");
    oldHeaders.forEach(function(el){
      if(el && !el.closest(".ex-engine-header")){
        el.remove();
      }
    });

    document.body.insertAdjacentHTML("afterbegin", '<div data-ex-engine-shell>' + shell() + '</div>');
  });
})();
