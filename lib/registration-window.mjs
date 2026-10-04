// Fixed Manaus time (UTC-04:00), independent of the device/server time zone.
export const COUNTDOWN_START = Date.parse("2026-10-04T00:00:00-04:00");
export const REGISTRATION_DEADLINE = Date.parse("2026-10-04T16:00:00-04:00");
export const REGISTRATION_CLOSED_MESSAGE = "O prazo para novos cadastros terminou em 04/10/2026 às 16h (horário de Manaus). Os cadastros já salvos foram preservados.";
export const registrationsClosed = (now = Date.now()) => now >= REGISTRATION_DEADLINE;
export function registrationWindow(now) {
  return { visible: now >= COUNTDOWN_START, closed: registrationsClosed(now), remainingSeconds: Math.max(0, Math.ceil((REGISTRATION_DEADLINE - now) / 1000)) };
}
