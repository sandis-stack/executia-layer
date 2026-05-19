import crypto from "crypto";
import { Resend } from "resend";
import { mailTemplate } from "../../../services/mail-template.js";

function uuid(){
  return crypto.randomUUID();
}


async function sendPilotEmails(record){

  if(!process.env.RESEND_API_KEY || !process.env.OPERATOR_EMAIL){
    return {
      sent:false,
      reason:"RESEND_ENV_MISSING"
    };
  }

  try{

    const resend = new Resend(process.env.RESEND_API_KEY);

    const from =
      process.env.FROM_EMAIL ||
      "EXECUTIA <noreply@executia.io>";

    const base =
      process.env.APP_URL ||
      "https://execution.executia.io";

    const pilotUrl =
      `${base}/request-pilot/`;

    const clientHtml = mailTemplate(
      "Pilot review request received.",
      [
        ["REVIEW ID", record.review_id],
        ["ORGANIZATION", record.organization || "-"],
        ["DOMAIN", record.domain || "-"],
        ["STATE", record.state],
        ["RESPONSE WINDOW", "24-48H"]
      ],
      "Your EXECUTIA pilot review request has been registered for institutional governance evaluation.",
      { url: pilotUrl, label: "OPEN REQUEST PILOT" }
    );

    const operatorHtml = mailTemplate(
      "New EXECUTIA pilot request received.",
      [
        ["REVIEW ID", record.review_id],
        ["ORGANIZATION", record.organization || "-"],
        ["CONTACT", record.contact || "-"],
        ["EMAIL", record.email || "-"],
        ["DOMAIN", record.domain || "-"],
        ["RISK", record.risk || "-"],
        ["CURRENT SYSTEM", record.current_system || "-"],
        ["CONTEXT", record.problem || "-"],
        ["RECEIVED", record.payload?.created_at || "-"]
      ],
      "Review the requested execution point and define the controlled pilot scope.",
      { url: pilotUrl, label: "OPEN REQUEST PILOT" }
    );

    if(record.email){
      await resend.emails.send({
        from,
        to:record.email,
        subject:`EXECUTIA - Pilot review received (${record.review_id})`,
        html:clientHtml
      });
    }

    await resend.emails.send({
      from,
      to:process.env.OPERATOR_EMAIL,
      subject:`EXECUTIA - New pilot request (${record.review_id})`,
      html:operatorHtml
    });

    return {
      sent:true
    };

  }catch(error){

    console.error("PILOT_EMAIL_FAILED", error);

    return {
      sent:false,
      reason:error.message || "PILOT_EMAIL_FAILED"
    };

  }

}


async function insertPilotRequest(record){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!url || !key){
    return {
      persisted:false,
      reason:"SUPABASE_ENV_MISSING"
    };
  }

  const response = await fetch(`${url}/rest/v1/pilot_requests`,{
    method:"POST",
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      "Content-Type":"application/json",
      Prefer:"return=representation"
    },
    body:JSON.stringify(record)
  });

  const text = await response.text();

  if(!response.ok){
    return {
      persisted:false,
      reason:text || "SUPABASE_INSERT_FAILED"
    };
  }

  try{
    return {
      persisted:true,
      row:text ? JSON.parse(text)?.[0] : null
    };
  }catch{
    return {
      persisted:true,
      row:null
    };
  }
}

export default async function handler(req,res){

  if(req.method !== "POST"){
    return res.status(405).json({
      ok:false,
      error:{
        code:"METHOD_NOT_ALLOWED"
      }
    });
  }

  const body = req.body || {};
  const reviewId = uuid();
  const createdAt = new Date().toISOString();

  const record = {
    review_id:reviewId,
    organization:body.organization || null,
    domain:body.domain || null,
    risk:body.risk || null,
    current_system:body.system || null,
    problem:body.problem || null,
    contact:body.contact || null,
    email:body.email || null,
    state:"PILOT_REVIEW_RECEIVED",
    payload:{
      ...body,
      source:"EXECUTIA_REQUEST_PILOT_FLOW",
      created_at:createdAt
    }
  };

  const persistence = await insertPilotRequest(record);
  const emailDelivery = await sendPilotEmails(record);

  return res.status(200).json({
    ok:true,
    review_id:reviewId,
    state:"PILOT_REVIEW_RECEIVED",
    domain:body.domain || "UNKNOWN",
    received_at:createdAt,
    persistence,
    email_delivery:emailDelivery
  });
}
