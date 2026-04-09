import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, event, detail, rule, tasksBefore, tasksAfter, scenarioId } = req.body;

  if (!sessionId || !event) {
    return res.status(400).json({ error: "sessionId and event are required" });
  }

  try {
    const entry = {
      sessionId,
      event,
      detail: detail || "",
      rule: rule || "",
      scenarioId: scenarioId || null,
      tasksBefore: tasksBefore || [],
      tasksAfter: tasksAfter || [],
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const ref = await db
      .collection("execution_ledger")
      .add(entry);

    await db
      .collection("execution_sessions")
      .doc(sessionId)
      .set(
        {
          sessionId,
          lastEvent: event,
          lastUpdated: FieldValue.serverTimestamp(),
          eventCount: FieldValue.increment(1),
        },
        { merge: true }
      );

    return res.status(200).json({ ok: true, entryId: ref.id });
  } catch (err) {
    console.error("Ledger write error:", err);
    return res.status(500).json({ error: "Failed to write ledger entry" });
  }
}
