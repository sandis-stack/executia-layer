import crypto from "crypto";
import { Resend } from "resend";

function uuid(){
  return crypto.randomUUID();
}

function esc(v){
  return String(v || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
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

    const clientHtml = `
      <h1>EXECUTIA Pilot Review Received</h1>
      <p>Your request has been registered.</p>
      <p><strong>Review ID:</strong> ${esc(record.review_id)}</p>
      <p><strong>Domain:</strong> ${esc(record.domain)}</p>
    `;

    const operatorHtml = `
      <h1>New EXECUTIA Pilot Request</h1>
      <p><strong>Review ID:</strong> ${esc(record.review_id)}</p>
      <p><strong>Organization:</strong> ${esc(record.organization)}</p>
      <p><strong>Contact:</strong> ${esc(record.contact)}</p>
      <p><strong>Email:</strong> ${esc(record.email)}</p>
      <p><strong>Domain:</strong> ${esc(record.domain)}</p>
      <p><strong>Problem:</strong> ${esc(record.problem)}</p>
    `;

    if(record.email){

      await resend.emails.send({
        from,
        to:record.email,
        subject:"EXECUTIA Pilot Review Received",
        html:clientHtml
      });

    }

    await resend.emails.send({
      from,
      to:process.env.OPERATOR_EMAIL,
      subject:"New EXECUTIA Pilot Request",
      html:operatorHtml
    });

    return {
      sent:true
    };

  }catch(error){

    console.error("PILOT_EMAIL_FAILED", error);

    return {
      sent:false,
      reason:error.message
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
