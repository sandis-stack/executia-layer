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

  if(req.method !== "GET"){
    return res.status(405).json({
      ok:false,
      error:"METHOD_NOT_ALLOWED"
    });
  }

  try{
    const limit =
      Number(req.query.limit || 100);

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

    return res.status(200).json({
      ok:true,
      mode:"EXECUTIA_MERKLE_ANCHOR",
      generated_at:new Date().toISOString(),
      events_included:events.length,
      hashes_included:hashes.length,
      merkle_root,
      anchor_status:"READY_FOR_EXTERNAL_TIMESTAMP",
      anchor_scope:"GOVERNANCE_REVIEW_EVENTS_HASH_SEGMENT",
      head_event:
        events.length ? events[events.length - 1] : null
    });

  }catch(error){
    return res.status(500).json({
      ok:false,
      error:"MERKLE_ROOT_FAILED",
      details:error.message
    });
  }
}
