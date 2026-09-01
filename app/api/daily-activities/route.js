import crypto from "crypto";
import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";

export const runtime = "nodejs";

const BUCKET = "daily-activities";
const MAX_DAILY_IMAGES = 5;
const MAX_IMAGE_BYTES = 900 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

function manausDayRange(now = new Date()) {
  const inManaus = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(inManaus.getUTCFullYear(), inManaus.getUTCMonth(), inManaus.getUTCDate(), 4));
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

function extensionFor(type) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

async function dailyImageCount(db, leadershipId) {
  const { start, end } = manausDayRange();
  const { data: records, error: recordsError } = await db.from("daily_activity_records").select("id")
    .eq("leadership_id", leadershipId).gte("created_at", start).lt("created_at", end);
  if (recordsError) throw recordsError;
  if (!records.length) return 0;
  const { count, error } = await db.from("daily_activity_images").select("id", { count: "exact", head: true })
    .in("record_id", records.map((record) => record.id));
  if (error) throw error;
  return count || 0;
}

async function serializeRecords(db, records, leaderships) {
  if (!records.length) return [];
  const { data: images, error } = await db.from("daily_activity_images")
    .select("id,record_id,storage_path,original_name,created_at")
    .in("record_id", records.map((record) => record.id)).order("created_at", { ascending: true });
  if (error) throw error;
  const paths = images.map((image) => image.storage_path);
  const signedByPath = new Map();
  if (paths.length) {
    const { data: signed, error: signedError } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (signedError) throw signedError;
    signed.forEach((item, index) => signedByPath.set(item.path || paths[index], item.signedUrl));
  }
  const leaderById = new Map(leaderships.map((leader) => [leader.id, leader.name]));
  return records.map((record) => ({
    id: record.id,
    leadershipId: record.leadership_id,
    leadershipName: leaderById.get(record.leadership_id) || "Liderança",
    description: record.description,
    status: record.status,
    createdAt: record.created_at,
    reviewedAt: record.reviewed_at,
    images: images.filter((image) => image.record_id === record.id).map((image) => ({
      id: image.id, name: image.original_name, url: signedByPath.get(image.storage_path)
    }))
  }));
}

export async function GET(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session || !["admin", "leader"].includes(session.role)) return fail("Faça login para continuar.", 401);
    const db = supabaseAdmin();
    let recordsQuery = db.from("daily_activity_records").select("*").order("created_at", { ascending: false });
    if (session.role === "leader") recordsQuery = recordsQuery.eq("leadership_id", session.id);
    const [recordsResult, leadershipsResult] = await Promise.all([
      recordsQuery,
      session.role === "admin" ? db.from("leaderships").select("id,name") : db.from("leaderships").select("id,name").eq("id", session.id)
    ]);
    if (recordsResult.error) throw recordsResult.error;
    if (leadershipsResult.error) throw leadershipsResult.error;
    const records = await serializeRecords(db, recordsResult.data, leadershipsResult.data);
    const usedToday = session.role === "leader" ? await dailyImageCount(db, session.id) : 0;
    return NextResponse.json({ records, usedToday, remainingToday: Math.max(0, MAX_DAILY_IMAGES - usedToday) }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("daily activities GET", cause);
    return fail("Não foi possível carregar os registros de atividade.", 500);
  }
}

export async function POST(request) {
  let uploadedPaths = [];
  let recordId = null;
  try {
    const session = sessionFromRequest(request);
    if (!session || session.role !== "leader") return fail("Somente lideranças podem registrar atividades.", 403);
    const form = await request.formData();
    const description = String(form.get("description") || "").trim();
    const files = form.getAll("images").filter((item) => item instanceof File && item.size > 0);
    if (description.length < 5 || description.length > 1000) return fail("Escreva uma descrição entre 5 e 1.000 caracteres.");
    if (!files.length || files.length > MAX_DAILY_IMAGES) return fail("Selecione de 1 a 5 imagens.");
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) return fail("Use somente imagens JPG, PNG ou WebP.");
      if (file.size > MAX_IMAGE_BYTES) return fail("Uma das imagens ficou muito grande. Selecione-a novamente para reduzir o tamanho.");
    }
    const db = supabaseAdmin();
    const usedToday = await dailyImageCount(db, session.id);
    if (usedToday + files.length > MAX_DAILY_IMAGES) return fail(`Você já registrou ${usedToday} imagem(ns) hoje. Restam ${Math.max(0, MAX_DAILY_IMAGES - usedToday)}.`);
    recordId = crypto.randomUUID();
    const { data: record, error: recordError } = await db.from("daily_activity_records").insert({
      id: recordId, leadership_id: session.id, description, status: "pending"
    }).select("*").single();
    if (recordError) throw recordError;
    const imageRows = [];
    for (const file of files) {
      const path = `${session.id}/${recordId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type, cacheControl: "3600", upsert: false
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      imageRows.push({ record_id: recordId, storage_path: path, original_name: String(file.name || "imagem") });
    }
    const { error: imagesError } = await db.from("daily_activity_images").insert(imageRows);
    if (imagesError) throw imagesError;
    const { data: leader, error: leaderError } = await db.from("leaderships").select("id,name").eq("id", session.id).single();
    if (leaderError) throw leaderError;
    const [item] = await serializeRecords(db, [record], [leader]);
    return NextResponse.json({ item, usedToday: usedToday + files.length, remainingToday: MAX_DAILY_IMAGES - usedToday - files.length }, { status: 201 });
  } catch (cause) {
    console.error("daily activities POST", cause);
    try {
      const db = supabaseAdmin();
      if (uploadedPaths.length) await db.storage.from(BUCKET).remove(uploadedPaths);
      if (recordId) await db.from("daily_activity_records").delete().eq("id", recordId);
    } catch (cleanupCause) { console.error("daily activities cleanup", cleanupCause); }
    return fail("Não foi possível registrar a atividade. Verifique se a atualização do banco foi aplicada.", 500);
  }
}

export async function PATCH(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session || session.role !== "admin") return fail("Somente administradores podem deferir registros.", 403);
    const body = await request.json();
    if (body.action !== "defer" || !body.id) return fail("Ação inválida.");
    const db = supabaseAdmin();
    const { data, error } = await db.from("daily_activity_records").update({
      status: "deferred", reviewed_by: session.id, reviewed_at: new Date().toISOString()
    }).eq("id", body.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, status: data.status, reviewedAt: data.reviewed_at });
  } catch (cause) {
    console.error("daily activities PATCH", cause);
    return fail("Não foi possível deferir o registro.", 500);
  }
}
