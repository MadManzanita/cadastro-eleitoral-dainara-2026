import crypto from "crypto";
import { NextResponse } from "next/server";
import { hashPassword, normalizeCpf, sessionFromRequest, signSession, supabaseAdmin, verifyPassword, verifySession } from "../../../lib/server-auth";

export const runtime = "nodejs";
const COOKIE = "cadastro_family_session";
const PASSWORD_MARKER = "TRUST_PASSWORD";
const MAX_AGE = 12 * 60 * 60;
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const makePassword = () => String(crypto.randomInt(10_000_000, 100_000_000));

function publicActivist(row, credential) {
  return { id: row.id, leaderId: row.leadership_id, name: row.name, cpf: row.cpf, trustCredentialed: Boolean(credential), trustCredentialedAt: credential?.created_at || null };
}

async function activeLeader(db, leadershipId) {
  const { data, error } = await db.from("leaderships").select("id,archived_at").eq("id", leadershipId).maybeSingle();
  if (error) throw error;
  return data && !data.archived_at;
}

async function latestCredential(db, activistId) {
  const { data, error } = await db.from("sms_challenges").select("id,code_hash,attempts,request_ip,created_at").eq("activist_id", activistId).eq("phone", PASSWORD_MARKER).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function createCredential(db, activist, password) {
  const { data, error } = await db.from("sms_challenges").insert({
    activist_id: activist.id,
    leadership_id: activist.leadership_id,
    phone: PASSWORD_MARKER,
    code_hash: hashPassword(password),
    expires_at: "9999-12-31T23:59:59.999Z",
    attempts: 0,
    request_ip: null
  }).select("id,code_hash,attempts,request_ip,created_at").single();
  if (error) throw error;
  return data;
}

function setActivistSession(response, activist) {
  response.cookies.set({ name: COOKIE, value: signSession({ role: "activist", id: activist.id, leadershipId: activist.leadership_id, authMethod: "password-v1" }), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
  return response;
}

function clearSession(response) {
  response.cookies.set({ name: COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}

export async function GET(request) {
  try {
    const session = verifySession(request.cookies.get(COOKIE)?.value);
    if (!session || session.role !== "activist" || session.authMethod !== "password-v1") return fail("Faça sua identificação para continuar.", 401);
    const db = supabaseAdmin();
    if (!(await activeLeader(db, session.leadershipId))) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);
    const { data, error } = await db.from("activists").select("id,leadership_id,name,cpf").eq("id", session.id).eq("leadership_id", session.leadershipId).maybeSingle();
    if (error) throw error;
    if (!data) return fail("Ativista não encontrado.", 401);
    const credential = await latestCredential(db, data.id);
    if (!credential) return fail("Credencial não encontrada.", 401);
    return NextResponse.json({ authenticated: true, activist: publicActivist(data, credential) }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("family access resume", cause);
    return fail("Não foi possível recuperar o acesso.", 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const db = supabaseAdmin();
    if (body.action === "logout") return clearSession(NextResponse.json({ ok: true }));

    if (body.action === "reset-activist-password") {
      const admin = sessionFromRequest(request);
      if (!admin || admin.role !== "admin") return fail("Acesso não autorizado.", 403);
      const { data: activist, error } = await db.from("activists").select("id,leadership_id,name,cpf").eq("id", String(body.activistId || "")).maybeSingle();
      if (error) throw error;
      if (!activist) return fail("Ativista não encontrado.", 404);
      const password = makePassword();
      const credential = await createCredential(db, activist, password);
      return NextResponse.json({ activist: publicActivist(activist, credential), temporaryPassword: password }, { headers: { "Cache-Control": "no-store" } });
    }

    const leadershipId = String(body.leadershipId || "");
    const cpf = normalizeCpf(body.cpf);
    if (!leadershipId || cpf.length !== 11) return fail("Informe um CPF de ativista válido.");
    if (!(await activeLeader(db, leadershipId))) return fail("Este cadastro está arquivado. Entre em contato com a coordenação.", 403);
    const { data: activist, error } = await db.from("activists").select("id,leadership_id,name,cpf").eq("cpf", cpf).eq("leadership_id", leadershipId).maybeSingle();
    if (error) throw error;
    if (!activist) return fail("CPF não reconhecido entre os ativistas desta liderança.", 404);
    const credential = await latestCredential(db, activist.id);

    if (body.action === "identify") {
      if (credential) return NextResponse.json({ firstAccess: false, activist: publicActivist(activist, credential) }, { headers: { "Cache-Control": "no-store" } });
      const password = makePassword();
      const created = await createCredential(db, activist, password);
      return setActivistSession(NextResponse.json({ firstAccess: true, activist: publicActivist(activist, created), temporaryPassword: password }, { headers: { "Cache-Control": "no-store" } }), activist);
    }

    if (body.action === "login") {
      const password = String(body.password || "");
      if (!/^\d{8}$/.test(password)) return fail("Informe a senha de 8 números.");
      if (!credential) return fail("A senha ainda não foi criada. Volte e faça o primeiro acesso.", 409);
      if (credential.request_ip && new Date(credential.request_ip).getTime() > Date.now()) return fail("Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente.", 429);
      if (!verifyPassword(password, credential.code_hash)) {
        const attempts = (credential.attempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        await db.from("sms_challenges").update({ attempts: attempts >= 5 ? 0 : attempts, request_ip: lockedUntil }).eq("id", credential.id);
        return fail(lockedUntil ? "Muitas tentativas incorretas. Aguarde 15 minutos." : "Senha incorreta.", lockedUntil ? 429 : 401);
      }
      const { error: resetError } = await db.from("sms_challenges").update({ attempts: 0, request_ip: null }).eq("id", credential.id);
      if (resetError) throw resetError;
      return setActivistSession(NextResponse.json({ authenticated: true, activist: publicActivist(activist, credential) }, { headers: { "Cache-Control": "no-store" } }), activist);
    }
    return fail("Ação inválida.", 404);
  } catch (cause) {
    console.error("family access", { message: cause?.message, code: cause?.code });
    return fail("Não foi possível concluir o acesso à Rede de confiança.", 500);
  }
}

