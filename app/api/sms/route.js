import { NextResponse } from "next/server";
import { hashPassword, normalizeCpf, supabaseAdmin, verifyPassword } from "../../../lib/server-auth";

export const runtime = "nodejs";
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const digits = (value) => String(value || "").replace(/\D/g, "");
const nowMinusMinute = () => new Date(Date.now() - 60_000).toISOString();

async function sendSms(phone, code) {
  const apiKey = process.env.SMSGO_KEY;
  if (!apiKey) throw new Error("SMSGO_KEY não configurada.");
  const { SMSGo } = await import("@orynlabs/smsgo");
  return new SMSGo({ apiKey }).send({
    phone: `+55${phone}`,
    message: `Seu código de acesso é ${code}. Ele expira em 5 minutos.`
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const db = supabaseAdmin();

    if (body.action === "send-family-code") {
      const leadershipId = String(body.leadershipId || "");
      const cpf = normalizeCpf(body.cpf);
      if (!leadershipId || cpf.length !== 11) return fail("Informe um CPF de ativista válido.");

      const { data: activist, error } = await db.from("activists").select("id,phone")
        .eq("cpf", cpf).eq("leadership_id", leadershipId).maybeSingle();
      if (error) throw error;
      if (!activist) return fail("CPF não reconhecido entre os ativistas desta liderança.", 404);

      const phone = digits(activist.phone);
      if (![10, 11].includes(phone.length)) return fail("O ativista não possui telefone válido cadastrado.", 422);

      const requestIp = String(request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
      const since = nowMinusMinute();
      const [byActivist, byIp] = await Promise.all([
        db.from("sms_challenges").select("id").eq("activist_id", activist.id).gte("created_at", since).limit(1),
        db.from("sms_challenges").select("id").eq("request_ip", requestIp).gte("created_at", since).limit(1)
      ]);
      if (byActivist.error) throw byActivist.error;
      if (byIp.error) throw byIp.error;
      if (byActivist.data?.length || byIp.data?.length) return fail("Aguarde um minuto antes de solicitar outro código.", 429);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { data: challenge, error: challengeError } = await db.from("sms_challenges").insert({
        activist_id: activist.id, leadership_id: leadershipId, phone, request_ip: requestIp,
        code_hash: hashPassword(code), expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }).select("id").single();
      if (challengeError) throw challengeError;

      try {
        await sendSms(phone, code);
      } catch (sendError) {
        await db.from("sms_challenges").delete().eq("id", challenge.id);
        throw sendError;
      }
      return NextResponse.json({ ok: true, challengeId: challenge.id }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "verify-family-code") {
      const challengeId = String(body.challengeId || "");
      const code = String(body.code || "");
      if (!challengeId || !/^\d{6}$/.test(code)) return fail("Informe o código de 6 dígitos.");

      const { data: challenge, error } = await db.from("sms_challenges").select("*").eq("id", challengeId).maybeSingle();
      if (error) throw error;
      if (!challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime() < Date.now()) return fail("Código expirado. Solicite um novo.", 410);
      if ((challenge.attempts || 0) >= 5) return fail("Limite de tentativas atingido. Solicite um novo código.", 429);

      await db.from("sms_challenges").update({ attempts: (challenge.attempts || 0) + 1 }).eq("id", challenge.id);
      if (!verifyPassword(code, challenge.code_hash)) return fail("Código incorreto.", 401);
      const { error: consumeError } = await db.from("sms_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
      if (consumeError) throw consumeError;
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }

    return fail("Ação inválida.", 404);
  } catch (cause) {
    console.error("sms route", { message: cause?.message, code: cause?.code });
    return fail("Não foi possível enviar ou validar o código SMS.", 500);
  }
}
