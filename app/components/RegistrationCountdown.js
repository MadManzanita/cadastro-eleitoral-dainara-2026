"use client";
import { useEffect, useState } from "react";
import { registrationWindow } from "../../lib/registration-window.mjs";

export default function RegistrationCountdown() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    let anchor = null, stopped = false;
    const controller = new AbortController();
    const tick = () => { if (anchor) setNow(anchor.server + performance.now() - anchor.local); };
    const sync = async () => {
      try {
        const response = await fetch("/api/registration-window", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (stopped || !Number.isFinite(data.now)) return;
        anchor = { server: data.now, local: performance.now() };
        tick();
      } catch { /* The server still enforces the deadline if synchronization fails. */ }
    };
    const resume = () => { if (!document.hidden) sync(); };
    sync();
    const timer = setInterval(tick, 250);
    const refresh = setInterval(sync, 60000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", sync);
    return () => { stopped = true; controller.abort(); clearInterval(timer); clearInterval(refresh); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", sync); };
  }, []);
  return <CountdownDisplay now={now} />;
}

export function CountdownDisplay({ now }) {
  if (now === null) return null;
  const state = registrationWindow(now);
  if (!state.visible) return null;
  const hours = Math.floor(state.remainingSeconds / 3600);
  const minutes = Math.floor(state.remainingSeconds / 60) % 60;
  const seconds = state.remainingSeconds % 60;
  const time = [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
  return <section className="panel" aria-label="Prazo de novos cadastros" style={{ textAlign: "center", borderColor: "#e78bac", background: "#fff3f8", marginBottom: 24 }}>
    <h2 style={{ color: "#b82f68" }}>{state.closed ? "Prazo de novos cadastros encerrado" : "Contagem regressiva até o fim da votação"}</h2>
    <div role="timer" aria-label={`${hours} horas, ${minutes} minutos e ${seconds} segundos`} style={{ color: "#d63384", fontSize: "clamp(48px, 10vw, 112px)", fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>{time}</div>
    <p>04 de outubro de 2026 · 16h · Horário de Manaus (Amazonas)</p>
    <p role="status">{state.closed ? "Novos envios estão bloqueados. Os cadastros já salvos foram preservados e continuam disponíveis." : "Novos cadastros serão aceitos até as 16h."}</p>
  </section>;
}
