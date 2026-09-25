import crypto from "node:crypto";
import { SMSGo } from "@orynlabs/smsgo";
import { NextResponse } from "next/server";
import { hashPassword, normalizeCpf, supabaseAdmin } from "../../../lib/server-auth";
import { mobileNumber, newCode, recoveryHash, validPassword, RECOVERY_MESSAGE } from "../../../lib/password-recovery.mjs";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function POST(request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Origem inválida." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Formato inválido." }, 415);
    const body = await request.json();
    const db = supabaseAdmin();
    if (body.action === "verify") {
      if (!uuid(body.challengeId) || !/^\d{6}$/.test(String(body.code || ""))) {
        return json({ error: "Informe o código de 6 números recebido por SMS." }, 400);
      }
      const resetToken = crypto.randomBytes(32).toString("hex");
      const { data, error } = await db.rpc("verify_password_recovery_code", {
        p_id: body.challengeId,
        p_code_hash: recoveryHash(`${body.challengeId}:${body.code}`),
        p_token_hash: recoveryHash(`${body.challengeId}:${resetToken}`),
      });
      if (error) throw error;
      if (!data) return json({ error: "Código incorreto, expirado ou já utilizado. Confira o código ou solicite outro." }, 400);
      return json({ resetToken });
    }
    if (body.action === "reset") {
      if (!uuid(body.challengeId) || !/^[0-9a-f]{64}$/.test(String(body.resetToken || "")) || !validPassword(body.password)) {
        return json({ error: "Valide o código primeiro e informe uma nova senha de 8 números." }, 400);
      }
      const { data, error } = await db.rpc("complete_password_recovery", {
        p_id: body.challengeId,
        p_code_hash: recoveryHash(`${body.challengeId}:${body.resetToken}`),
        p_password_hash: hashPassword(body.password),
      });
      if (error) throw error;
      if (!data) return json({ error: "A autorização expirou ou já foi utilizada. Solicite um novo código.", restart: true }, 400);
      return json({ ok: true });
    }
    if (body.action !== "request" || !["leader", "activist"].includes(body.role)) return json({ error: "Solicitação inválida." }, 400);
    const cpf = normalizeCpf(body.cpf);
    if (cpf.length !== 11 || (body.role === "activist" && !uuid(body.leadershipId))) return json({ error: "Informe seu CPF e use o link enviado pela liderança." }, 400);
    if (!process.env.SMSGO_KEY) return json({ error: "Recuperação por SMS indisponível. Entre em contato com a coordenação." }, 503);

    // Only the platform-controlled header is trusted in production; never the caller's X-Forwarded-For.
    const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local";
    if (!ip) return json({ error: "Não foi possível verificar a solicitação." }, 503);
    const { data: allowed, error: limitError } = await db.rpc("allow_password_recovery_request", {
      p_ip: recoveryHash(`ip:${ip}`), p_account: recoveryHash(`account:${body.role}:${cpf}:${body.leadershipId || ""}`),
    });
    if (limitError) throw limitError;
    if (!allowed) return json({ error: "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente." }, 429);

    const id = crypto.randomUUID();
    const accepted = () => json({ challengeId: id, message: RECOVERY_MESSAGE, retryAfter: 60 });
    let query = db.from(body.role === "leader" ? "leaderships" : "activists")
      .select(body.role === "leader" ? "id,phone,archived_at" : "id,phone,leadership_id").eq("cpf", cpf);
    if (body.role === "activist") query = query.eq("leadership_id", body.leadershipId);
    const { data: person, error: lookupError } = await query.maybeSingle();
    if (lookupError) throw lookupError;
    if (!person || person.archived_at) return accepted();
    if (body.role === "activist") {
      const { data: leader, error } = await db.from("leaderships").select("id,archived_at").eq("id", person.leadership_id).maybeSingle();
      if (error) throw error;
      if (!leader || leader.archived_at) return accepted();
    }
    const phone = mobileNumber(person.phone);
    if (!phone) return accepted();
    const code = newCode();
    const { data: reserved, error: reserveError } = await db.rpc("reserve_password_recovery", {
      p_id: id, p_role: body.role, p_person_id: person.id, p_phone: phone,
      p_code_hash: recoveryHash(`${id}:${code}`),
    });
    if (reserveError) throw reserveError;
    if (!reserved) return accepted();
    try {
      const smsgo = new SMSGo({
        apiKey: process.env.SMSGO_KEY,
        fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10_000) }),
      });
      await smsgo.send({ phone, message: `Cadastro Eleitoral: codigo ${code} para trocar sua senha. Valido por 5 minutos. Nao compartilhe.`, smsTypeId: 2 });
    } catch {
      await db.from("password_recovery_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", id);
      // Do not expose provider details, phone, CPF, code or API key.
      console.error("password recovery: SMS delivery request failed");
      return json({ error: "Não foi possível enviar o SMS agora. Aguarde um minuto e tente novamente." }, 503);
    }
    return accepted();
  } catch {
    console.error("password recovery: request failed");
    return json({ error: "Não foi possível concluir a recuperação. Tente novamente ou procure a coordenação." }, 503);
  }
}
