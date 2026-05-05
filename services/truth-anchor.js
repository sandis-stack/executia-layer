import { db } from "./db.js";

export async function anchorTruth({
  source_table,
  source_id,
  source_hash,
  anchor_type    = "INTERNAL_TIMESTAMP",
  anchor_payload = {}
}) {
  if (!source_table || !source_id || !source_hash) {
    throw new Error("ANCHOR_INPUT_REQUIRED");
  }

  const { data, error } = await db()
    .from("truth_anchors")
    .insert({
      anchor_type,
      source_table,
      source_id,
      source_hash,
      anchor_payload
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function verifyAnchor(source_id, source_hash) {
  const { data, error } = await db()
    .from("truth_anchors")
    .select("*")
    .eq("source_id", source_id)
    .eq("source_hash", source_hash)
    .single();

  if (error) return { found: false };
  return { found: true, anchor: data };
}
