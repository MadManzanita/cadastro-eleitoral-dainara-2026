import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";

export const runtime = "nodejs";
const fail = (error, status) => NextResponse.json({ error }, { status });

function leadership(row) {
  return {
    id: row.id, name: row.name, birth: row.birth, cpf: row.cpf, phone: row.phone,
    address: row.address, mother: row.mother, email: row.email, neighborhood: row.neighborhood,
    cep: row.cep, title: row.title, zone: row.electoral_zone, section: row.electoral_section,
    pix: row.pix, pixname: row.pix_name, bank: row.bank, created: row.created_at, updated: row.updated_at
  };
}
function activist(row) {
  return {
    id: row.id, leaderId: row.leadership_id, name: row.name, birth: row.birth, cpf: row.cpf,
    phone: row.phone, address: row.address, mother: row.mother, email: row.email,
    neighborhood: row.neighborhood, cep: row.cep, title: row.title, zone: row.electoral_zone,
    section: row.electoral_section, pix: row.pix, pixname: row.pix_name, bank: row.bank,
    created: row.created_at, updated: row.updated_at
  };
}
function assessor(row) {
  return { id: row.id, name: row.name, role: row.role, phone: row.phone, email: row.email, notes: row.notes, created: row.created_at, updated: row.updated_at };
}
function admin(row) {
  return { id: row.id, name: row.name, cpf: row.cpf, email: row.email, created: row.created_at, updated: row.updated_at };
}

export async function GET(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session) return fail("Faça login para acessar os dados.", 401);
    const db = supabaseAdmin();
    const leadershipQuery = session.role === "admin"
      ? db.from("leaderships").select("*").order("created_at", { ascending: false })
      : db.from("leaderships").select("*").eq("id", session.id);
    const activistsQuery = session.role === "admin"
      ? db.from("activists").select("*").order("created_at", { ascending: false })
      : db.from("activists").select("*").eq("leadership_id", session.id).order("created_at", { ascending: false });
    const assessorQuery = db.from("assessors").select("*").order("created_at", { ascending: false });
    const [leaderships, activists, assessors, admins] = await Promise.all([
      leadershipQuery, activistsQuery, assessorQuery,
      session.role === "admin" ? db.from("admins").select("id,name,cpf,email,created_at,updated_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] })
    ]);
    const issue = [leaderships, activists, assessors, admins].find((result) => result.error)?.error;
    if (issue) throw issue;
    return NextResponse.json({
      session,
      db: {
        leaderships: leaderships.data.map(leadership),
        activists: activists.data.map(activist),
        assessors: assessors.data.map(assessor),
        admins: admins.data.map(admin)
      }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("data route", cause);
    return fail("Não foi possível carregar os dados.", 500);
  }
}
