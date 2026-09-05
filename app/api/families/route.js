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
    municipality: row.municipality, neighborhood: row.neighborhood,
    manausZone: row.manaus_zone, cep: row.cep, title: row.title,
    zone: row.electoral_zone, section: row.electoral_section,
    sourceRole: row.activist_id ? "activist" : "leader",
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
    cpf: digits(body.cpf) || null,
    phone: digits(body.phone) || null,
    address: String(body.address || "").trim().toUpperCase() || null,
    mother: String(body.mother || "").trim().toUpperCase() || null,
    email: String(body.email || "").trim() || null,
    municipality: String(body.municipality || "").trim() || null,
    neighborhood: String(body.neighborhood || "").trim() || null,
    manaus_zone: String(body.manausZone || "").trim() || null,
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

async function archivedLeadership(db, session) {
  const leadershipId = session.role === "leader" ? session.id : session.role === "activist" ? session.leadershipId : null;
  if (!leadershipId) return false;
  const { data, error } = await db.from("leaderships").select("id,archived_at").eq("id", leadershipId).maybeSingle();
  if (error) throw error;
  return !data || Boolean(data.archived_at);
}

export async function GET(request) {
  try {
    const session = familySession(request);
    if (!session) return fail("Acesso não autorizado.", 401);
    const db = supabaseAdmin();
    if (await archivedLeadership(db, session)) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);
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
    if (await archivedLeadership(db, session)) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);

    if (body.action === "save") {
      const next = values(body);
      if (!next.name || !next.address || !next.municipality || !next.neighborhood) {
        return fail("Informe nome, endereço, município e bairro/localidade.");
      }
      if (next.cpf && next.cpf.length !== 11) return fail("O CPF informado é inválido.");
      if (body.id) {
        const currentResult = await scoped(db.from("families").select("*").eq("id", body.id), session).maybeSingle();
        if (currentResult.error) throw currentResult.error;
        if (!currentResult.data) return fail("Cadastro não encontrado ou fora do seu acesso.", 403);
        const { data, error } = await db.from("families").update(next).eq("id", currentResult.data.id).select("*").single();
        if (error) throw error;
        await audit(db, session, "update", data);
        return NextResponse.json({ item: family(data) });
      }
      if (!['activist', 'leader'].includes(session.role)) return fail("Acesso não autorizado.", 403);
      const ownership = session.role === "activist"
        ? { activist_id: session.id, leadership_id: session.leadershipId }
        : { activist_id: null, leadership_id: session.id };
      const { data, error } = await db.from("families").insert({ ...next, ...ownership }).select("*").single();
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
