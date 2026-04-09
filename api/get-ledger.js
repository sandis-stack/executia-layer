import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, limit = "50" } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const snap = await db
      .collection("execution_ledger")
      .where("sessionId", "==", sessionId)
      .orderBy("timestamp", "desc")
      .limit(parseInt(limit, 10))
      .get();

    const entries = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return res.status(200).json({ entries, count: entries.length });
  } catch (err) {
    console.error("Ledger fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch ledger" });
  }
}
