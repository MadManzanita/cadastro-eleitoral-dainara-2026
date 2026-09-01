import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin, verifySession } from "../../../lib/server-auth";
import { isDuplicateRegistration } from "../../../lib/database-errors";

export const runtime = "nodejs";
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const digits = (value) => String(value || "").replace(/\D/g, "");

function family(row) {
  return {
    id: row.id, activistId: row.activist_id, leaderId: row.leadership_id,
    name: row.name, birth: row.birth, cpf: row.cpf, phone: row.phone,
    address: row.address, mother: row.mother, email: row.email,
    neighborhood: row.neighborhood, cep: row.cep, title: row.title,
    zone: row.electoral_zone, section: row.electoral_section,
    created: row.created_at, updated: row.updated_at
  };
}

function familySession(request) {
  const session = sessionFromRequest(request);
  if (session) return session;
  const token = request.cookies.get("cadastro_family_session")?.value;
  const activist = verifySession(token);
  return activist?.role === "activist" ? activist : null;
}

function values(body) {
  return {
    name: String(body.name || "").trim().toUpperCase(),
    birth: body.birth || null,
    cpf: digits(body.cpf),
    phone: digits(body.phone) || null,
    address: String(body.address || "").trim().toUpperCase() || null,
    mother: String(body.mother || "").trim().toUpperCase() || null,
    email: String(body.email || "").trim() || null,
    neighborhood: String(body.neighborhood || "").trim() || null,
    cep: digits(body.cep) || null,
    title: digits(body.title).slice(0, 12) || null,
    electoral_zone: digits(body.zone).slice(0, 3) || null,
    electoral_section: digits(body.section).slice(0, 4) || null
  };
}

async function audit(db, session, action, item) {
  const { error } = await db.from("trust_network_history").insert({
    family_id: item.id, activist_id: item.activist_id, leadership_id: item.leadership_id,
    actor_role: session.role, actor_id: session.id, action, snapshot: item
  });
  if (error) console.error("trust history", error.message);
}

function scoped(query, session) {
  if (session.role === "admin") return query;
  if (session.role === "leader") return query.eq("leadership_id", session.id);
  return query.eq("activist_id", session.id).eq("leadership_id", session.leadershipId);
}

export async function GET(request) {
  try {
    const session = familySession(request);
    if (!session) return fail("Acesso não autorizado.", 401);
    const db = supabaseAdmin();
    const { data, error } = await scoped(db.from("families").select("*").order("created_at", { ascending: false }), session);
    if (error) throw error;
    return NextResponse.json({ items: data.map(family), role: session.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("families read", cause);
    return fail("Não foi possível carregar a Rede de confiança.", 500);
  }
}

export async function POST(request) {
  try {
    const session = familySession(request);
    if (!session) return fail("Acesso não autorizado.", 401);
    const body = await request.json();
    const db = supabaseAdmin();

    if (body.action === "save") {
      const next = values(body);
      if (!next.name || next.cpf.length !== 11) return fail("Informe nome e CPF válidos.");
      if (body.id) {
        const currentResult = await scoped(db.from("families").select("*").eq("id", body.id), session).maybeSingle();
        if (currentResult.error) throw currentResult.error;
        if (!currentResult.data) return fail("Cadastro não encontrado ou fora do seu acesso.", 403);
        const { data, error } = await db.from("families").update(next).eq("id", currentResult.data.id).select("*").single();
        if (error) throw error;
        await audit(db, session, "update", data);
        return NextResponse.json({ item: family(data) });
      }
      if (session.role !== "activist") return fail("O novo cadastro deve ser iniciado pelo link da liderança.", 403);
      const { data, error } = await db.from("families").insert({ ...next, activist_id: session.id, leadership_id: session.leadershipId }).select("*").single();
      if (error) throw error;
      await audit(db, session, "create", data);
      return NextResponse.json({ item: family(data) }, { status: 201 });
    }

    if (body.action === "delete") {
      const currentResult = await scoped(db.from("families").select("*").eq("id", body.id), session).maybeSingle();
      if (currentResult.error) throw currentResult.error;
      if (!currentResult.data) return fail("Cadastro não encontrado ou fora do seu acesso.", 403);
      await audit(db, session, "delete", currentResult.data);
      const { error } = await db.from("families").delete().eq("id", currentResult.data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.action === "history") {
      const currentResult = await scoped(db.from("families").select("id").eq("id", body.id), session).maybeSingle();
      if (currentResult.error) throw currentResult.error;
      if (!currentResult.data) return fail("Cadastro fora do seu acesso.", 403);
      const { data, error } = await db.from("trust_network_history").select("*").eq("family_id", body.id).order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ items: data });
    }

    return fail("Ação inválida.", 404);
  } catch (cause) {
    console.error("families write", cause);
    if (isDuplicateRegistration(cause)) return fail("Esse cadastro já existe.", 409);
    return fail("Não foi possível concluir a operação.", 500);
  }
}
