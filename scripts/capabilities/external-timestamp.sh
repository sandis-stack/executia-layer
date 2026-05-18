#!/usr/bin/env bash
set -e

echo "Installing external-timestamp capability..."

cat > api/v1/proof/timestamp-anchor.js <<'JS'
import crypto from "crypto";
import { db } from "../../../services/db.js";

function hashPair(a, b){
  return crypto
    .createHash("sha256")
    .update(`${a}:${b}`)
    .digest("hex");
}

function buildMerkleRoot(hashes){
  if(!hashes.length) return null;

  let level = hashes.slice();

  while(level.length > 1){
    const next = [];

    for(let i = 0; i < level.length; i += 2){
      const left = level[i];
      const right = level[i + 1] || left;
      next.push(hashPair(left, right));
    }

    level = next;
  }

  return level[0];
}

export default async function handler(req, res){

  res.setHeader("Content-Type", "application/json");

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{

    const limit =
      Number(req.body?.limit || 100);

    const result = await db()
      .from("governance_review_events")
      .select("id, review_id, event_type, hash, sequence_no, created_at")
      .not("hash", "is", null)
      .order("sequence_no", { ascending:true })
      .limit(limit);

    if(result.error){
      throw result.error;
    }

    const events =
      result.data || [];

    const hashes =
      events.map(e => e.hash).filter(Boolean);

    const merkle_root =
      buildMerkleRoot(hashes);

    const timestamped_at =
      new Date().toISOString();

    const anchor_id =
      crypto
        .createHash("sha256")
        .update(JSON.stringify({
          merkle_root,
          timestamped_at,
          hashes_included:hashes.length
        }))
        .digest("hex");

    return res.status(200).json({
      ok:true,
      mode:"EXECUTIA_EXTERNAL_TIMESTAMP_ANCHOR",
      anchor_id,
      anchor_status:"TIMESTAMPED_INTERNAL_READY_FOR_EXTERNAL_NOTARY",
      timestamped_at,
      merkle_root,
      events_included:events.length,
      hashes_included:hashes.length,
      external_notary_status:"NOT_CONNECTED",
      next:"CONNECT_EXTERNAL_TIMESTAMP_AUTHORITY"
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:"TIMESTAMP_ANCHOR_FAILED",
      details:error.message
    });
  }
}
JS

echo "external-timestamp capability installed."
