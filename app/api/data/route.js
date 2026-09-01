import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";
import { isDuplicateRegistration } from "../../../lib/database-errors";

export const runtime = "nodejs";
const fail = (error, status) => NextResponse.json({ error }, { status });
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

function leadership(row) {
  return {
    id: row.id, name: row.name, birth: row.birth, cpf: row.cpf, phone: row.phone,
    address: row.address, mother: row.mother, email: row.email, neighborhood: row.neighborhood,
    cep: row.cep, title: row.title, zone: row.electoral_zone, section: row.electoral_section,
    pix: row.pix, pixname: row.name, bank: row.bank, archivedAt: row.archived_at || null,
    created: row.created_at, updated: row.updated_at
  };
}
function activist(row) {
  return {
    id: row.id, leaderId: row.leadership_id, name: row.name, birth: row.birth, cpf: row.cpf,
    phone: row.phone, address: row.address, mother: row.mother, email: row.email,
    neighborhood: row.neighborhood, cep: row.cep, title: row.title, zone: row.electoral_zone,
    section: row.electoral_section, pix: row.pix, pixname: row.name, bank: row.bank,
    created: row.created_at, updated: row.updated_at
  };
}
function family(row) {
  return {
    id: row.id, activistId: row.activist_id, leaderId: row.leadership_id, name: row.name,
    birth: row.birth, cpf: row.cpf, phone: row.phone, address: row.address, mother: row.mother,
    email: row.email, neighborhood: row.neighborhood, cep: row.cep, title: row.title,
    zone: row.electoral_zone, section: row.electoral_section, created: row.created_at, updated: row.updated_at
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
    if (!session || !["admin", "leader"].includes(session.role)) return fail("Faça login para acessar os dados.", 401);
    const db = supabaseAdmin();
    if (session.role === "leader") {
      const { data: currentLeader, error: accessError } = await db.from("leaderships").select("id,archived_at").eq("id", session.id).maybeSingle();
      if (accessError) throw accessError;
      if (!currentLeader || currentLeader.archived_at) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);
    }
    const leadershipQuery = session.role === "admin"
      ? db.from("leaderships").select("*").order("created_at", { ascending: false })
      : db.from("leaderships").select("*").eq("id", session.id);
    const activistsQuery = session.role === "admin"
      ? db.from("activists").select("*").order("created_at", { ascending: false })
      : db.from("activists").select("*").eq("leadership_id", session.id).order("created_at", { ascending: false });
    const assessorQuery = db.from("assessors").select("*").order("created_at", { ascending: false });
    const familiesQuery = session.role === "admin"
      ? db.from("families").select("*").order("created_at", { ascending: false })
      : db.from("families").select("*").eq("leadership_id", session.id).order("created_at", { ascending: false });
    const [leaderships, activists, assessors, admins, families] = await Promise.all([
      leadershipQuery, activistsQuery, assessorQuery,
      session.role === "admin" ? db.from("admins").select("id,name,cpf,email,created_at,updated_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }), familiesQuery
    ]);
    const issue = [leaderships, activists, assessors, admins, families].find((result) => result.error)?.error;
    if (issue) throw issue;
    const allLeaderships = leaderships.data.map(leadership);
    const activeLeadershipIds = new Set(allLeaderships.filter((item) => !item.archivedAt).map((item) => item.id));
    const allActivists = activists.data.map(activist);
    const allFamilies = families.data.map(family);
    return NextResponse.json({
      session,
      db: {
        leaderships: allLeaderships.filter((item) => !item.archivedAt),
        archivedLeaderships: session.role === "admin" ? allLeaderships.filter((item) => item.archivedAt) : [],
        activists: allActivists.filter((item) => activeLeadershipIds.has(item.leaderId)),
        archivedActivists: session.role === "admin" ? allActivists.filter((item) => !activeLeadershipIds.has(item.leaderId)) : [],
        assessors: assessors.data.map(assessor),
        admins: admins.data.map(admin),
        families: allFamilies.filter((item) => activeLeadershipIds.has(item.leaderId)),
        archivedFamilies: session.role === "admin" ? allFamilies.filter((item) => !activeLeadershipIds.has(item.leaderId)) : []
      }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("data route", cause);
    return fail("Não foi possível carregar os dados.", 500);
  }
}


function fields(body) {
  return {
    name: String(body.name || "").trim(), birth: body.birth || null, cpf: String(body.cpf || "").replace(/\D/g, ""),
    phone: body.phone || null, address: body.address || null, mother: body.mother || null, email: String(body.email || "").trim() || null,
    neighborhood: body.neighborhood || null, cep: body.cep || null, title: onlyDigits(body.title).slice(0, 12) || null,
    electoral_zone: onlyDigits(body.zone).slice(0, 3) || null, electoral_section: onlyDigits(body.section).slice(0, 4) || null,
    pix: String(body.pix || "").trim() || null, pix_name: String(body.name || "").trim() || null, bank: body.bank || null
  };
}

export async function POST(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session || !["admin", "leader"].includes(session.role)) return fail("Faça login para continuar.", 401);
    const body = await request.json();
    const db = supabaseAdmin();
    if (session.role === "leader") {
      const { data: currentLeader, error: accessError } = await db.from("leaderships").select("id,archived_at").eq("id", session.id).maybeSingle();
      if (accessError) throw accessError;
      if (!currentLeader || currentLeader.archived_at) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);
    }

    if (body.action === "archive-leadership") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const id = String(body.id || "");
      if (!id) return fail("Informe a liderança que será arquivada.");
      const { data, error } = await db.from("leaderships").update({ archived_at: new Date().toISOString() }).eq("id", id).is("archived_at", null).select("*").single();
      if (error) throw error;
      return NextResponse.json({ item: leadership(data) });
    }

    if (body.action === "restore-leadership") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const id = String(body.id || "");
      if (!id) return fail("Informe a liderança que será restaurada.");
      const { data, error } = await db.from("leaderships").update({ archived_at: null }).eq("id", id).select("*").single();
      if (error) throw error;
      return NextResponse.json({ item: leadership(data) });
    }

    if (body.action === "delete-leadership") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const id = String(body.id || "");
      if (!id) return fail("Informe a liderança que será excluída.");
      const { data: records, error: recordsError } = await db.from("daily_activity_records").select("id").eq("leadership_id", id);
      const activityTablesUnavailable = recordsError && ["42P01", "PGRST205"].includes(recordsError.code);
      if (recordsError && !activityTablesUnavailable) throw recordsError;
      let storagePaths = [];
      if (records?.length) {
        const { data: images, error: imagesError } = await db.from("daily_activity_images").select("storage_path").in("record_id", records.map((record) => record.id));
        if (imagesError) throw imagesError;
        storagePaths = images.map((image) => image.storage_path);
      }
      const { data, error } = await db.from("leaderships").delete().eq("id", id).select("id").single();
      if (error) throw error;
      if (storagePaths.length) {
        const { error: storageError } = await db.storage.from("daily-activities").remove(storagePaths);
        if (storageError) console.error("leadership storage cleanup", storageError);
      }
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (body.action === "save-leadership") {
      if (session.role !== "admin") return fail("Somente a coordenação pode cadastrar lideranças.", 403);
      const values = fields(body);
      if (!values.name || values.cpf.length !== 11) return fail("Informe nome e CPF válidos.");
      if (body.id) {
        const { data, error } = await db.from("leaderships").update(values).eq("id", body.id).select("*").single();
        if (error) throw error;
        return NextResponse.json({ item: leadership(data) });
      }
      const temporaryPassword = String(Math.floor(10000000 + Math.random() * 90000000));
      const { hashPassword } = await import("../../../lib/server-auth");
      const { data, error } = await db.from("leaderships").insert({ ...values, password_hash: hashPassword(temporaryPassword) }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ item: leadership(data), temporaryPassword }, { status: 201 });
    }

    if (body.action === "save-activist") {
      if (!["admin", "leader"].includes(session.role)) return fail("Acesso não autorizado.", 403);
      const values = fields(body);
      const leadershipId = session.role === "admin" ? body.leaderId : session.id;
      if (!leadershipId || !values.name || values.cpf.length !== 11) return fail("Informe liderança, nome e CPF válidos.");
      if (body.id) {
        const ownership = session.role === "admin"
          ? db.from("activists").select("id").eq("id", body.id)
          : db.from("activists").select("id").eq("id", body.id).eq("leadership_id", session.id);
        const { data: owned, error: ownershipError } = await ownership.maybeSingle();
        if (ownershipError) throw ownershipError;
        if (!owned) return fail("Ativista não encontrado ou fora da sua liderança.", 403);
        const { data, error } = await db.from("activists").update({ ...values, leadership_id: leadershipId }).eq("id", owned.id).select("*").single();
        if (error) throw error;
        return NextResponse.json({ item: activist(data) });
      }
      const { data, error } = await db.from("activists").insert({ ...values, leadership_id: leadershipId }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ item: activist(data) }, { status: 201 });
    }

    if (body.action === "save-assessor") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const values = { name: String(body.name || "").trim(), role: body.role || null, phone: body.phone || null, email: body.email || null, notes: body.notes || null };
      if (!values.name) return fail("Informe o nome do contato.");
      const query = body.id
        ? db.from("assessors").update(values).eq("id", body.id)
        : db.from("assessors").insert(values);
      const { data, error } = await query.select("*").single();
      if (error) throw error;
      return NextResponse.json({ item: assessor(data) }, { status: body.id ? 200 : 201 });
    }

    if (body.action === "save-admin-profile") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const id = String(body.id || "");
      const values = {
        name: String(body.name || "").trim(),
        email: String(body.email || "").trim() || null
      };
      if (!id || !values.name) return fail("Informe o nome do administrador.", 400);
      const { data, error } = await db.from("admins").update(values).eq("id", id).select("id,name,cpf,email,created_at,updated_at").single();
      if (error) throw error;
      return NextResponse.json({ item: admin(data) });
    }

    if (body.action === "delete-assessor") {
      if (session.role !== "admin") return fail("Acesso não autorizado.", 403);
      const { error } = await db.from("assessors").delete().eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return fail("Ação inválida.", 404);
  } catch (cause) {
    console.error("data write route", cause);
    if (isDuplicateRegistration(cause)) return fail("Esse cadastro já existe.", 409);
    return fail("Não foi possível salvar os dados.", 500);
  }
}
