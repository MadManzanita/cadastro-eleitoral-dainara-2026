import crypto from "crypto";
import { NextResponse } from "next/server";
import { hashPassword, normalizeCpf, sessionCookie, sessionFromRequest, signSession, supabaseAdmin, verifyPassword } from "../../../lib/server-auth";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status });
const error = (message, status = 400) => json({ error: message }, status);

function publicPerson(row) {
  if (!row) return null;
  const { password_hash, ...person } = row;
  return person;
}

export async function GET(request) {
  const session = sessionFromRequest(request);
  if (!session) return error("Sessão não encontrada.", 401);
  return json({ session });
}

export async function POST(request) {
  let stage = "inicialização";
  try {
    stage = "leitura da solicitação";
    const body = await request.json();
    const action = body?.action;
    stage = "conexão com o banco";
    const db = supabaseAdmin();

    if (action === "logout") {
      const response = json({ ok: true });
      response.cookies.set(sessionCookie());
      return response;
    }

    if (action === "login") {
      const cpf = normalizeCpf(body.cpf);
      const password = String(body.password || "");
      const role = body.role === "admin" ? "admin" : "leader";
      if (cpf.length !== 11 || !password) return error("Informe CPF e senha.");

      const table = role === "admin" ? "admins" : "leaderships";
      const { data, error: queryError } = await db.from(table).select("*").eq("cpf", cpf).maybeSingle();
      if (queryError) throw queryError;
      if (!data || !verifyPassword(password, data.password_hash)) return error("CPF ou senha incorretos.", 401);

      const response = json({ ok: true, role, person: publicPerson(data) });
      response.cookies.set(sessionCookie(signSession({ role, id: data.id })));
      return response;
    }

    if (action === "setup-admin") {
      const setupCode = String(body.setupCode || "");
      if (!process.env.ADMIN_SETUP_CODE || !cryptoSafeEqual(setupCode, process.env.ADMIN_SETUP_CODE)) return error("Código de configuração inválido.", 403);
      const cpf = normalizeCpf(body.cpf);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim() || null;
      if (!name || cpf.length !== 11) return error("Informe nome e CPF válidos.");
      stage = "verificação de administradores";
      const { data: existing, error: lookupError } = await db.from("admins").select("id,password_hash").eq("cpf", cpf).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.password_hash) return error("Já existe um administrador. Use o acesso administrativo.", 409);
      stage = "proteção da senha";
      const passwordHash = hashPassword(String(body.password || ""));
      stage = "gravação do administrador";
      const saved = existing
        ? await db.from("admins").update({ name, email, password_hash: passwordHash }).eq("id", existing.id).select("*").single()
        : await db.from("admins").insert({ name, cpf, email, password_hash: passwordHash }).select("*").single();
      const { data, error: insertError } = saved;
      if (insertError) throw insertError;

      stage = "criação da sessão";
      const response = json({ ok: true, role: "admin", person: publicPerson(data) }, 201);
      response.cookies.set(sessionCookie(signSession({ role: "admin", id: data.id })));
      return response;
    }

    if (action === "register-leadership") {
      const setupCode = String(body.setupCode || "");
      if (!process.env.LEADERSHIP_SETUP_CODE || !cryptoSafeEqual(setupCode, process.env.LEADERSHIP_SETUP_CODE)) return error("Código de cadastro inválido.", 403);
      const cpf = normalizeCpf(body.cpf);
      const name = String(body.name || "").trim();
      if (!name || cpf.length !== 11) return error("Informe nome e CPF válidos.");
      const temporaryPassword = String(Math.floor(10000000 + Math.random() * 90000000));
      const values = {
        name, cpf, birth: body.birth || null, phone: body.phone || null, address: body.address || null,
        mother: body.mother || null, email: body.email || null, neighborhood: body.neighborhood || null,
        cep: body.cep || null, title: body.title || null, electoral_zone: body.zone || null,
        electoral_section: body.section || null, pix: body.pix || null, pix_name: body.pixname || null,
        bank: body.bank || null, password_hash: hashPassword(temporaryPassword)
      };
      const { data, error: insertError } = await db.from("leaderships").insert(values).select("*").single();
      if (insertError) throw insertError;
      return json({ ok: true, person: publicPerson(data), temporaryPassword }, 201);
    }

    const session = sessionFromRequest(request);
    if (!session) return error("Faça login para continuar.", 401);

    if (action === "reset-leadership-password") {
      if (session.role !== "admin") return error("Acesso não autorizado.", 403);
      const leadershipId = String(body.leadershipId || "");
      const nextPassword = String(body.password || "");
      const { error: updateError } = await db.from("leaderships").update({ password_hash: hashPassword(nextPassword) }).eq("id", leadershipId);
      if (updateError) throw updateError;
      return json({ ok: true });
    }

    return error("Ação inválida.", 404);
  } catch (cause) {
    console.error("auth route diagnostic", stage, JSON.stringify({ name: cause?.name, message: cause?.message, code: cause?.code, status: cause?.status, details: cause?.details, hint: cause?.hint, keys: Object.keys(cause || {}) }));
    return error(`Não foi possível concluir a operação na etapa: ${stage}.`, 500);
  }
}

function cryptoSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
