"use client";

import { useEffect, useState } from "react";

const digits = (value) => value.replace(/\D/g, "");

export default function PasswordRecovery({ role, initialCpf = "", leadershipId, onBack }) {
  const [cpf, setCpf] = useState(initialCpf);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function call(body) {
    const response = await fetch("/api/password-recovery", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || "Não foi possível concluir. Tente novamente."), { restart: data.restart });
    return data;
  }
  async function send(event) {
    event?.preventDefault();
    if (busy || seconds) return;
    setBusy(true); setMessage("");
    try {
      const data = await call({ action: "request", role, cpf, leadershipId });
      setChallengeId(data.challengeId); setCode(""); setResetToken(""); setSeconds(data.retryAfter); setMessage(data.message);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const data = await call({ action: "verify", challengeId, code });
      setResetToken(data.resetToken); setCode("");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  function restart() {
    setChallengeId(""); setCode(""); setResetToken(""); setPassword(""); setConfirmation(""); setMessage("");
  }
  async function reset(event) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) { setMessage("As senhas precisam ser iguais."); return; }
    setBusy(true); setMessage("");
    try {
      await call({ action: "reset", challengeId, resetToken, password });
      setPassword(""); setConfirmation(""); setResetToken(""); setDone(true);
    } catch (error) { if (error.restart) restart(); setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="shell"><section className="card auth-card">
    <button type="button" className="back" disabled={busy} onClick={onBack}>← Voltar ao acesso</button>
    <h2>{done ? "Senha alterada" : "Recuperar senha"}</h2>
    {done ? <><p>Sua nova senha foi salva. Entre com seu CPF e a nova senha.</p><button className="primary" onClick={onBack}>Voltar para entrar</button></> : <>
      <p>{resetToken ? "Código validado. Agora escolha e confirme sua nova senha de 8 números." : challengeId ? "Digite o código de 6 números recebido por SMS para continuar." : `${role === "leader" ? "Liderança" : "Ativista"}: receba um código por SMS no celular do seu cadastro.`}</p>
      <p className="auth-note">Etapa {resetToken ? "3 de 3 — Nova senha" : challengeId ? "2 de 3 — Validar código" : "1 de 3 — Solicitar código"}</p>
      {!challengeId ? <form onSubmit={send}>
        <label className="field"><span>CPF</span><input required autoFocus inputMode="numeric" autoComplete="username" pattern="[0-9]{11}" maxLength={11} value={cpf} onChange={(event) => setCpf(digits(event.target.value).slice(0, 11))} placeholder="11 números" disabled={busy}/></label>
        <button className="primary" disabled={busy || seconds > 0}>{busy ? "Solicitando…" : seconds ? `Aguarde ${seconds}s para solicitar` : "Receber código por SMS"}</button>
      </form> : !resetToken ? <>
        <form key="verify" onSubmit={verify}>
          <label className="field"><span>Código recebido por SMS</span><input required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(digits(event.target.value).slice(0, 6))} placeholder="6 números" disabled={busy}/></label>
          <button className="primary" disabled={busy}>{busy ? "Validando…" : "Validar código"}</button>
        </form>
        <button type="button" className="link-button" disabled={busy || seconds > 0} onClick={send}>{seconds ? `Reenviar código em ${seconds}s` : "Reenviar código"}</button>
        <button type="button" className="link-button" disabled={busy} onClick={restart}>Corrigir CPF</button>
      </> : <>
        <form key="password" onSubmit={reset}>
          <label className="field"><span>Nova senha — 8 números</span><input required autoFocus type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{8}" maxLength={8} value={password} onChange={(event) => setPassword(digits(event.target.value).slice(0, 8))} disabled={busy}/></label>
          <label className="field"><span>Confirme a nova senha</span><input required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{8}" maxLength={8} value={confirmation} onChange={(event) => setConfirmation(digits(event.target.value).slice(0, 8))} disabled={busy}/></label>
          <button className="primary" disabled={busy}>{busy ? "Aguarde…" : "Salvar nova senha"}</button>
        </form>
        <button type="button" className="link-button" disabled={busy} onClick={restart}>Solicitar outro código</button>
      </>}
      {message && <p className="result" role="status" aria-live="polite">{message}</p>}
      <p className="auth-note">Sem acesso ao celular cadastrado ou não recebeu o SMS? Procure a coordenação para conferir ou atualizar seu número.</p>
    </>}
  </section></main>;
}
