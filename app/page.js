"use client";

import { useState } from "react";
import { isValidCPF, isPlausibleTitle } from "../lib/validation";

const RELEASE_CODE = "328974";

export default function Home() {
  const [mode, setMode] = useState("home");

  const [cpf, setCpf] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");

  const [releaseCode, setReleaseCode] = useState("");
  const [releaseMsg, setReleaseMsg] = useState("");

  function check() {
    const cpfOk = isValidCPF(cpf);
    const titleOk = isPlausibleTitle(title);

    setMsg(
      `${cpfOk ? "✓ CPF válido" : "✗ CPF inválido"} • ${
        titleOk
          ? "✓ Título com formato válido"
          : "✗ Título inválido"
      }`
    );
  }

  function validateReleaseCode(type) {
    if (releaseCode === RELEASE_CODE) {
      setReleaseMsg("");
      setReleaseCode("");
      
      if (type === "leader") {
        setMode("leaderRegister");
      } else {
        setMode("adminRegister");
      }
    } else {
      setReleaseMsg("✗ Código de liberação inválido.");
    }
  }

  function goBack() {
    setMode("home");
    setReleaseCode("");
    setReleaseMsg("");
    setMsg("");
  }

  /*
   * PÁGINA INICIAL
   */
  if (mode === "home") {
    return (
      <main className="shell">
        <section className="hero">
          <b>Cadastro Eleitoral</b>

          <h1>Coordenadora Dainara Torres</h1>

          <p>Portal de acesso e cadastro.</p>

          <div className="actions">
            <button onClick={() => setMode("leader")}>
              Já sou liderança
            </button>

            <button onClick={() => setMode("join")}>
              Se torne liderança
            </button>

            <button
              className="outline"
              onClick={() => setMode("admin")}
            >
              Acesso administrativo
            </button>

            <button
              className="outline"
              onClick={() => setMode("adminJoin")}
            >
              Se torne adm
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * CADASTRO DE NOVA LIDERANÇA
   */
  if (mode === "join") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Se torne liderança</h2>

          <p>
            Para iniciar o cadastro, informe o código de liberação.
          </p>

          <div className="grid">
            <label>
              Código de liberação
              <input
                value={releaseCode}
                onChange={(e) =>
                  setReleaseCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </label>

            <button onClick={() => validateReleaseCode("leader")}>
              Liberar cadastro
            </button>

            {releaseMsg && (
              <div className="result">
                {releaseMsg}
              </div>
            )}
          </div>

          <p className="tse">
            <a
              href="https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral"
              target="_blank"
              rel="noreferrer"
            >
              Consultar situação no TSE ↗
            </a>
          </p>
        </section>
      </main>
    );
  }

  /*
   * CADASTRO DE NOVO ADMINISTRADOR
   */
  if (mode === "adminJoin") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Se torne adm</h2>

          <p>
            Para iniciar o cadastro administrativo, informe o
            código de liberação.
          </p>

          <div className="grid">
            <label>
              Código de liberação
              <input
                value={releaseCode}
                onChange={(e) =>
                  setReleaseCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </label>

            <button onClick={() => validateReleaseCode("admin")}>
              Liberar cadastro
            </button>

            {releaseMsg && (
              <div className="result">
                {releaseMsg}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  /*
   * CADASTRO LIBERADO DA LIDERANÇA
   */
  if (mode === "leaderRegister") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Cadastro de liderança</h2>

          <p>
            Cadastro liberado. Informe seus dados para continuar.
          </p>

          <div className="grid">
            <label>
              CPF
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </label>

            <label>
              8 dígitos do título
              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value.replace(/\D/g, "").slice(0, 8)
                  )
                }
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
              />
            </label>

            <button onClick={check}>
              Validar dados
            </button>

            {msg && (
              <div className="result">
                {msg}
              </div>
            )}
          </div>

          <p className="tse">
            <a
              href="https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral"
              target="_blank"
              rel="noreferrer"
            >
              Consultar situação no TSE ↗
            </a>
          </p>
        </section>
      </main>
    );
  }

  /*
   * CADASTRO LIBERADO DO ADMINISTRADOR
   */
  if (mode === "adminRegister") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Cadastro administrativo</h2>

          <p>
            Cadastro liberado. Informe seus dados para continuar.
          </p>

          <div className="grid">
            <label>
              CPF
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </label>

            <label>
              8 dígitos do título
              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value.replace(/\D/g, "").slice(0, 8)
                  )
                }
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
              />
            </label>

            <button onClick={check}>
              Validar dados
            </button>

            {msg && (
              <div className="result">
                {msg}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  /*
   * LOGIN DA LIDERANÇA
   */
  if (mode === "leader") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Área da liderança</h2>

          <p>
            Acesse sua área utilizando seus dados de acesso.
          </p>

          <div className="grid">
            <label>
              CPF
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </label>

            <label>
              8 dígitos do título
              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value.replace(/\D/g, "").slice(0, 8)
                  )
                }
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
              />
            </label>

            <button onClick={() => setMsg("Login de teste realizado.")}>
              Entrar
            </button>

            {msg && (
              <div className="result">
                {msg}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  /*
   * LOGIN ADMINISTRATIVO
   */
  if (mode === "admin") {
    return (
      <main className="shell">
        <section className="card">
          <button className="back" onClick={goBack}>
            ← Voltar
          </button>

          <h2>Área administrativa</h2>

          <p>
            Acesse a área administrativa utilizando seus dados
            de acesso.
          </p>

          <div className="grid">
            <label>
              CPF
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </label>

            <label>
              8 dígitos do título
              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value.replace(/\D/g, "").slice(0, 8)
                  )
                }
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
              />
            </label>

            <button onClick={() => setMsg("Login administrativo de teste realizado.")}>
              Entrar
            </button>

            {msg && (
              <div className="result">
                {msg}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return null;
}
