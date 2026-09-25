import crypto from "node:crypto";

export const RECOVERY_MESSAGE = "Se os dados corresponderem a um cadastro ativo com celular válido, você receberá um código por SMS. Ele vale por 5 minutos.";
export function mobileNumber(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  return /^[1-9]\d9\d{8}$/.test(digits) ? `+55${digits}` : null;
}
export function recoveryHash(value) {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32) throw new Error("Recovery configuration unavailable");
  return crypto.createHmac("sha256", key).update(`password-recovery:${value}`).digest("hex");
}
export const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
export const validPassword = (value) => typeof value === "string" && /^\d{8}$/.test(value);
