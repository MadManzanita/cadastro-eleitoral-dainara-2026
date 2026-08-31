import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const sessionName = "cadastro_eleitoral_session";
const hours = 24 * 7;

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Configuração do banco indisponível.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}

export function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!password || !stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET não está configurada corretamente.");
  return value;
}

export function signSession(session) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + hours * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function sessionCookie(value = "") {
  return {
    name: sessionName,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value ? hours * 60 * 60 : 0
  };
}

export function sessionFromRequest(request) {
  return verifySession(request.cookies.get(sessionName)?.value);
}
