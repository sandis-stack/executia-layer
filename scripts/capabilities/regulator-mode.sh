#!/usr/bin/env bash
set -e

echo "Installing regulator-mode capability..."

mkdir -p public/regulator

cat > public/regulator/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>EXECUTIA Regulator Mode</title>

<style>
body{
  margin:0;
  background:#f4f7fb;
  color:#10253e;
  font-family:Arial,Helvetica,sans-serif;
}

main{
  max-width:1200px;
  margin:0 auto;
  padding:64px 24px;
}

.card{
  background:#ffffff;
  border:1px solid #d9e2ec;
  padding:34px;
  margin-bottom:22px;
}

.kicker{
  font-size:12px;
  letter-spacing:4px;
  font-weight:700;
  color:#60758b;
  margin-bottom:16px;
}

h1{
  margin:0 0 18px;
  font-size:44px;
  line-height:1.04;
}

p{
  color:#42556d;
  font-size:16px;
  line-height:1.7;
}

.grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
  margin-top:26px;
}

.metric{
  border:1px solid #d9e2ec;
  background:#f8fafc;
  padding:18px;
}

.metric span{
  display:block;
  font-size:11px;
  letter-spacing:2px;
  color:#60758b;
  font-weight:700;
}

.metric strong{
  display:block;
  margin-top:8px;
  font-size:18px;
}

@media(max-width:900px){
  .grid{
    grid-template-columns:1fr;
  }

  h1{
    font-size:34px;
  }
}
</style>
</head>

<body>

<main>

<section class="card">
  <div class="kicker">
    EXECUTIA · REGULATOR MODE
  </div>

  <h1>
    Execution integrity oversight layer.
  </h1>

  <p>
    Public regulator-grade interface for immutable execution verification,
    governance continuity inspection,
    settlement confirmation,
    reconciliation traceability,
    and execution proof integrity analysis.
  </p>

  <div class="grid">

    <div class="metric">
      <span>MODE</span>
      <strong>READ ONLY</strong>
    </div>

    <div class="metric">
      <span>PROOF</span>
      <strong>IMMUTABLE</strong>
    </div>

    <div class="metric">
      <span>AUDIT</span>
      <strong>CONTINUOUS</strong>
    </div>

    <div class="metric">
      <span>SETTLEMENT</span>
      <strong>VERIFIED</strong>
    </div>

  </div>
</section>

</main>

</body>
</html>
HTML

echo "regulator-mode capability installed."
