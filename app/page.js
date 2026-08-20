"use client";

import { useEffect, useMemo, useState } from "react";

const TEST_CODE = "328974";
const TSE_URL = "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral";
const STORAGE = "cadastro-eleitoral-dainara-2026-v3";

const EMPTY = {
  name: "", birth: "", cpf: "", phone: "", address: "", mother: "", email: "",
  neighborhood: "", cep: "", title: "", zone: "", section: "", pix: "", pixname: "", bank: ""
};

const INITIAL_ASSESSORS = [
  { id: "a1", name: "Assessoria da Coordenadora", phone: "Contato cadastrado pela administração", email: "Contato interno" }
];

const digits = (v) => String(v || "").replace(/\D/g, "");
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDate = (v) => v ? v.split("-").reverse().join("/") : "—";

function validCPF(value) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d = (sum * 10) % 11;
  if (d === 10) d = 0;
  if (d !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  d = (sum * 10) % 11;
  if (d === 10) d = 0;
  return d === Number(cpf[10]);
}

const validTitle = (v) => digits(v).length === 8;

function emptyDb() {
  return { leaderships: [], activists: [], admins: [], assessors: INITIAL_ASSESSORS };
}

function Field({ form, setForm, label, name, type = "text", required = false, placeholder = "" }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={form[name] || ""}
        required={required}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      />
    </label>
  );
}

function DataForm({ title, form, setForm, onSubmit, onBack, submitLabel, message, onValidate }) {
  return (
    <main className="shell">
      <section className="card wide">
        <button className="back" onClick={onBack}>← Voltar</button>
        <h2>{title}</h2>
        <p>Preencha os dados abaixo. No modo de teste, os dados ficam salvos neste navegador.</p>
        <form onSubmit={onSubmit}>
          <h3>Dados pessoais</h3>
          <div className="form-grid">
            <Field form={form} setForm={setForm} label="Nome completo" name="name" required />
            <Field form={form} setForm={setForm} label="Data de nascimento" name="birth" type="date" />
            <Field form={form} setForm={setForm} label="CPF" name="cpf" required placeholder="000.000.000-00" />
            <Field form={form} setForm={setForm} label="Telefone" name="phone" placeholder="(00) 00000-0000" />
            <Field form={form} setForm={setForm} label="Endereço" name="address" />
            <Field form={form} setForm={setForm} label="Nome da mãe" name="mother" />
            <Field form={form} setForm={setForm} label="E-mail" name="email" type="email" />
            <Field form={form} setForm={setForm} label="Bairro" name="neighborhood" />
            <Field form={form} setForm={setForm} label="CEP" name="cep" placeholder="00000-000" />
          </div>

          <h3>Dados eleitorais</h3>
          <div className="form-grid three">
            <Field form={form} setForm={setForm} label="Título de eleitor" name="title" required placeholder="00000000" />
            <Field form={form} setForm={setForm} label="Zona" name="zone" />
            <Field form={form} setForm={setForm} label="Seção" name="section" />
          </div>
          <div className="validation-row">
            <button type="button" className="outline" onClick={onValidate}>Validar CPF e título</button>
            <a className="tse" href={TSE_URL} target="_blank" rel="noreferrer">Consultar situação no TSE ↗</a>
          </div>

          <h3>Dados de pagamento</h3>
          <div className="form-grid three">
            <Field form={form} setForm={setForm} label="Chave Pix" name="pix" />
            <Field form={form} setForm={setForm} label="Nome do titular" name="pixname" />
            <Field form={form} setForm={setForm} label="Banco" name="bank" />
          </div>

          {message && <div className="result">{message}</div>}
          <button className="primary submit" type="submit">{submitLabel}</button>
        </form>
      </section>
    </main>
  );
}

function Access({ type, onBack, code, setCode, message, setMessage, onEnter, onJoin }) {
  const admin = type === "admin";
  return (
    <main className="shell">
      <section className="card auth-card">
        <button className="back" onClick={onBack}>← Voltar</button>
        <h2>{admin ? "Acesso administrativo" : "Já sou liderança"}</h2>
        <p>{admin ? "Acesse a gestão centralizada de lideranças e ativistas." : "Acesse sua equipe e os ativistas vinculados à sua liderança."}</p>
        <label className="field"><span>Código de acesso</span><input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => { setCode(digits(e.target.value).slice(0, 6)); setMessage(""); }} placeholder="000000" /></label>
        <button className="primary" onClick={onEnter}>Entrar</button>
        {message && <div className="result">{message}</div>}
        <div className="auth-note">Para o teste atual, use o código de 6 dígitos <b>328974</b>.</div>
        <button className="link-button" onClick={onJoin}>{admin ? "Se tornar administrador" : "Se tornar liderança"}</button>
      </section>
    </main>
  );
}

function Detail({ title, person, leaderName, onBack, onEdit }) {
  if (!person) return <main className="shell"><section className="card"><button className="back" onClick={onBack}>← Voltar</button><div className="empty">Cadastro não encontrado.</div></section></main>;
  return (
    <main className="shell"><section className="card wide">
      <div className="page-head"><div><button className="back" onClick={onBack}>← Voltar</button><h2>{title}</h2></div><button className="primary" onClick={onEdit}>Editar cadastro</button></div>
      <div className="detail-grid">
        <div className="panel"><h3>Dados pessoais</h3>
          <p><b>Nome:</b> {person.name}</p><p><b>Nascimento:</b> {formatDate(person.birth)}</p><p><b>CPF:</b> {person.cpf}</p><p><b>Telefone:</b> {person.phone || "—"}</p><p><b>E-mail:</b> {person.email || "—"}</p><p><b>Nome da mãe:</b> {person.mother || "—"}</p><p><b>Endereço:</b> {person.address || "—"}</p><p><b>Bairro:</b> {person.neighborhood || "—"}</p><p><b>CEP:</b> {person.cep || "—"}</p>
        </div>
        <div className="panel"><h3>Dados eleitorais</h3><p><b>Título:</b> {person.title}</p><p><b>Zona:</b> {person.zone || "—"}</p><p><b>Seção:</b> {person.section || "—"}</p>{leaderName && <p><b>Liderança:</b> {leaderName}</p>}<h3>Dados de pagamento</h3><p><b>Pix:</b> {person.pix || "—"}</p><p><b>Titular:</b> {person.pixname || "—"}</p><p><b>Banco:</b> {person.bank || "—"}</p></div>
      </div>
    </section></main>
  );
}

function Sidebar({ role, view, setView, onLogout, onNewLeader, onNewActivist, onMyProfile, onAssessors }) {
  const admin = role === "admin";
  return <aside className="sidebar">
    <div className="brand"><b>Cadastro Eleitoral</b><span>{admin ? "Coordenadora Dainara Torres" : "Área da liderança"}</span></div>
    <div className="nav-title">Menu</div>
    <nav>
      <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>⌂ Dashboard</button>
      {admin ? <>
        <button className={view === "leaderships" ? "active" : ""} onClick={() => setView("leaderships")}>♙ Lideranças</button>
        <button className={view === "activists" ? "active" : ""} onClick={() => setView("activists")}>♧ Ativistas</button>
        <button className={view === "admins" ? "active" : ""} onClick={() => setView("admins")}>◉ Administradores</button>
        <button onClick={onNewLeader}>＋ Nova liderança</button>
      </> : <>
        <button className={view === "activists" ? "active" : ""} onClick={() => setView("activists")}>♧ Meus ativistas</button>
        <button onClick={onNewActivist}>＋ Adicionar ativista</button>
        <button className={view === "profile" ? "active" : ""} onClick={onMyProfile}>👤 Meu cadastro</button>
        <button className={view === "assessors" ? "active" : ""} onClick={onAssessors}>☎ Contatos da assessoria</button>
      </>}
    </nav>
    <button className="logout" onClick={onLogout}>Sair</button>
  </aside>;
}

export default function Home() {
  const [mode, setMode] = useState("home");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [db, setDb] = useState(emptyDb());
  const [role, setRole] = useState(null);
  const [leaderId, setLeaderId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [returnTo, setReturnTo] = useState("home");

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE); if (saved) setDb({ ...emptyDb(), ...JSON.parse(saved) }); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(db)); } catch {} }, [db]);

  const go = (next) => { setMode(next); setMessage(""); setCode(""); };
  const enter = (target) => {
    if (code !== TEST_CODE) return setMessage("Código inválido. Para o teste, use 328974.");
    setRole(target === "admin-area" ? "admin" : "leader");
    if (target === "leader-area" && !leaderId && db.leaderships[0]) setLeaderId(db.leaderships[0].id);
    setView("dashboard"); go(target);
  };
  const liberate = (target) => {
    if (code !== TEST_CODE) return setMessage("Código inválido. Para o teste, use 328974.");
    setForm(EMPTY); setEditing(null); setReturnTo(target === "leader-registration" ? "leader-area" : "admin-area"); go(target);
  };
  const validate = () => setMessage(`${validCPF(form.cpf) ? "✓ CPF válido" : "✗ CPF inválido"} • ${validTitle(form.title) ? "✓ Título com formato válido" : "✗ Título inválido"}`);

  const saveLeader = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setMessage("Informe o nome completo.");
    if (!validCPF(form.cpf)) return setMessage("Informe um CPF válido.");
    if (!validTitle(form.title)) return setMessage("O título deve conter exatamente 8 dígitos.");
    const id = editing?.id || newId();
    const record = { ...form, id, created: editing?.created || Date.now(), updated: Date.now() };
    setDb(d => ({ ...d, leaderships: editing ? d.leaderships.map(x => x.id === id ? record : x) : [...d.leaderships, record] }));
    setLeaderId(id); setEditing(null); setForm(EMPTY); setRole(returnTo === "admin-area" ? "admin" : "leader"); setView("dashboard"); go(returnTo);
  };

  const saveActivist = (e) => {
    e.preventDefault();
    if (!leaderId) return setMessage("Nenhuma liderança selecionada.");
    if (!form.name.trim()) return setMessage("Informe o nome completo.");
    if (!validCPF(form.cpf)) return setMessage("Informe um CPF válido.");
    if (!validTitle(form.title)) return setMessage("O título deve conter exatamente 8 dígitos.");
    const id = editing?.id || newId();
    const record = { ...form, id, leaderId, created: editing?.created || Date.now(), updated: Date.now() };
    setDb(d => ({ ...d, activists: editing ? d.activists.map(x => x.id === id ? record : x) : [...d.activists, record] }));
    setEditing(null); setForm(EMPTY); setView(returnTo === "admin-area" ? "activists" : "activists"); setRole(returnTo === "admin-area" ? "admin" : "leader"); go(returnTo);
  };

  const registerAdmin = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim(); const cpf = String(fd.get("cpf") || "").trim(); const email = String(fd.get("email") || "").trim();
    if (!name || !validCPF(cpf)) return setMessage("Informe nome e um CPF válido.");
    setDb(d => ({ ...d, admins: [...d.admins, { id: newId(), name, cpf, email, created: Date.now() }] }));
    setRole("admin"); setView("dashboard"); setMessage(""); go("admin-area");
  };

  const leader = db.leaderships.find(x => x.id === leaderId);
  const currentActs = db.activists.filter(x => x.leaderId === leaderId);
  const filteredLeaders = useMemo(() => db.leaderships.filter(x => `${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())), [db.leaderships, search]);
  const filteredActs = useMemo(() => db.activists.filter(x => `${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())), [db.activists, search]);
  const recent = [...db.leaderships.map(x => ({ ...x, kind: "Liderança" })), ...db.activists.map(x => ({ ...x, kind: "Ativista" }))].sort((a, b) => b.created - a.created).slice(0, 8);

  const exportCSV = () => {
    const rows = [["Tipo","Nome","Nascimento","CPF","Telefone","E-mail","Mãe","Endereço","Bairro","CEP","Título","Zona","Seção","Pix","Titular","Banco","Liderança"]];
    db.leaderships.forEach(l => rows.push(["Liderança",l.name,l.birth,l.cpf,l.phone,l.email,l.mother,l.address,l.neighborhood,l.cep,l.title,l.zone,l.section,l.pix,l.pixname,l.bank,l.name]));
    db.activists.forEach(a => { const l = db.leaderships.find(x => x.id === a.leaderId); rows.push(["Ativista",a.name,a.birth,a.cpf,a.phone,a.email,a.mother,a.address,a.neighborhood,a.cep,a.title,a.zone,a.section,a.pix,a.pixname,a.bank,l?.name || "Sem liderança"]); });
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "cadastro-eleitoral-dainara-2026.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (mode === "home") return <main className="shell"><section className="hero"><b>Cadastro Eleitoral</b><h1>Coordenadora Dainara Torres</h1><p>Portal de acesso, cadastro e gestão de lideranças e ativistas.</p><div className="actions"><button onClick={() => go("leader-login")}>Já sou liderança</button><button onClick={() => go("leader-code")}>Se torne liderança</button><button className="outline" onClick={() => go("admin-login")}>Acesso administrativo</button><button className="outline" onClick={() => go("admin-code")}>Se tornar administrador</button></div><div className="home-note">Modo de teste • código de acesso: <b>328974</b></div></section></main>;

  if (mode === "leader-login") return <Access type="leader" onBack={() => go("home")} code={code} setCode={setCode} message={message} setMessage={setMessage} onEnter={() => enter("leader-area")} onJoin={() => go("leader-code")} />;
  if (mode === "admin-login") return <Access type="admin" onBack={() => go("home")} code={code} setCode={setCode} message={message} setMessage={setMessage} onEnter={() => enter("admin-area")} onJoin={() => go("admin-code")} />;
  if (mode === "leader-code" || mode === "admin-code") {
    const admin = mode === "admin-code";
    return <main className="shell"><section className="card auth-card"><button className="back" onClick={() => go("home")}>← Voltar</button><h2>{admin ? "Se tornar administrador" : "Se torne liderança"}</h2><p>Antes do cadastro, informe o código de liberação.</p><label className="field"><span>Código de liberação</span><input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => { setCode(digits(e.target.value).slice(0,6)); setMessage(""); }} placeholder="000000" /></label><button className="primary" onClick={() => liberate(admin ? "admin-registration" : "leader-registration")}>Continuar</button>{message && <div className="result">{message}</div>}</section></main>;
  }

  if (mode === "leader-registration") return <DataForm title={editing ? "Editar liderança" : "Cadastro de liderança"} form={form} setForm={setForm} onSubmit={saveLeader} onBack={() => go(returnTo)} submitLabel={editing ? "Salvar alterações" : "Cadastrar liderança"} message={message} onValidate={validate} />;
  if (mode === "activist-registration") return <DataForm title={editing ? "Editar ativista" : "Cadastro de ativista"} form={form} setForm={setForm} onSubmit={saveActivist} onBack={() => go(returnTo)} submitLabel={editing ? "Salvar alterações" : "Cadastrar ativista"} message={message} onValidate={validate} />;
  if (mode === "admin-registration") return <main className="shell"><section className="card"><button className="back" onClick={() => go("home")}>← Voltar</button><h2>Cadastro de administrador</h2><p>Cadastro liberado pelo código de teste 328974.</p><form onSubmit={registerAdmin}><div className="grid"><label className="field"><span>Nome completo *</span><input name="name" required /></label><label className="field"><span>CPF *</span><input name="cpf" required placeholder="000.000.000-00" /></label><label className="field"><span>E-mail</span><input name="email" type="email" /></label><button className="primary">Cadastrar administrador</button>{message && <div className="result">{message}</div>}</div></form></section></main>;

  if (mode === "leader-profile") return <Detail title="Meu cadastro" person={leader} onBack={() => go("leader-area")} onEdit={() => { setEditing(leader); setForm({ ...leader }); setReturnTo("leader-area"); go("leader-registration"); }} />;
  if (mode === "leader-activist-detail") { const a = db.activists.find(x => x.id === detailId); return <Detail title="Dados do ativista" person={a} leaderName={leader?.name} onBack={() => go("leader-area")} onEdit={() => { setEditing(a); setForm({ ...a }); setLeaderId(a?.leaderId || leaderId); setReturnTo("leader-area"); go("activist-registration"); }} />; }

  if (mode === "admin-leader-detail") {
    const l = db.leaderships.find(x => x.id === detailId); const acts = db.activists.filter(x => x.leaderId === detailId);
    return <main className="shell"><section className="card wide"><button className="back" onClick={() => { setView("leaderships"); go("admin-area"); }}>← Voltar</button><div className="page-head"><div><h2>{l?.name || "Liderança"}</h2><p>Ativistas vinculados: <b>{acts.length}</b></p></div>{l && <button className="primary" onClick={() => { setEditing(l); setForm({ ...l }); setReturnTo("admin-area"); go("leader-registration"); }}>Editar liderança</button>}</div>{l && <div className="detail-grid"><div className="panel"><h3>Dados pessoais</h3><p><b>CPF:</b> {l.cpf}</p><p><b>Nascimento:</b> {formatDate(l.birth)}</p><p><b>Telefone:</b> {l.phone || "—"}</p><p><b>E-mail:</b> {l.email || "—"}</p><p><b>Mãe:</b> {l.mother || "—"}</p><p><b>Endereço:</b> {l.address || "—"}</p><p><b>Bairro:</b> {l.neighborhood || "—"}</p><p><b>CEP:</b> {l.cep || "—"}</p></div><div className="panel"><h3>Dados eleitorais</h3><p><b>Título:</b> {l.title}</p><p><b>Zona:</b> {l.zone || "—"}</p><p><b>Seção:</b> {l.section || "—"}</p><h3>Pagamento</h3><p><b>Pix:</b> {l.pix || "—"}</p><p><b>Titular:</b> {l.pixname || "—"}</p><p><b>Banco:</b> {l.bank || "—"}</p></div></div>}<div className="panel"><div className="page-head"><h3>Ativistas vinculados: {acts.length}</h3><button className="primary" onClick={() => { setLeaderId(detailId); setForm(EMPTY); setEditing(null); setReturnTo("admin-area"); go("activist-registration"); }}>+ Adicionar ativista</button></div>{acts.map(a => <div className="list-item clickable" key={a.id} onClick={() => { setDetailId(a.id); go("admin-activist-detail"); }}><b>{a.name}</b><span>{a.phone || "—"}</span></div>)}{!acts.length && <div className="empty">Nenhum ativista vinculado.</div>}</div></section></main>;
  }
  if (mode === "admin-activist-detail") { const a = db.activists.find(x => x.id === detailId); const l = db.leaderships.find(x => x.id === a?.leaderId); return <Detail title="Dados do ativista" person={a} leaderName={l?.name} onBack={() => { setView("activists"); go("admin-area"); }} onEdit={() => { setEditing(a); setForm({ ...a }); setLeaderId(a?.leaderId || null); setReturnTo("admin-area"); go("activist-registration"); }} />; }

  if (mode === "leader-area") return <main className="app-shell"><Sidebar role="leader" view={view} setView={setView} onLogout={() => { setRole(null); setLeaderId(null); go("home"); }} onNewActivist={() => { if (!leaderId && db.leaderships[0]) setLeaderId(db.leaderships[0].id); setForm(EMPTY); setEditing(null); setReturnTo("leader-area"); go("activist-registration"); }} onMyProfile={() => go("leader-profile")} onAssessors={() => setView("assessors")} /><div className="main"><header className="topbar"><div><h1>Área da liderança</h1><p>{leader?.name || "Nenhuma liderança selecionada"} • acesso restrito à própria equipe</p></div><button className="primary" onClick={() => { setForm(EMPTY); setEditing(null); setReturnTo("leader-area"); go("activist-registration"); }}>+ Adicionar ativista</button></header><section className="content">
    {view === "dashboard" && <><div className="cards"><div className="metric"><div className="label">Meus ativistas</div><div className="value">{currentActs.length}</div></div><div className="metric"><div className="label">Tamanho da equipe</div><div className="value">{currentActs.length + (leader ? 1 : 0)}</div></div></div><div className="panel"><h2>Visão da equipe</h2><p>A liderança não tem acesso a outras lideranças ou aos cadastros de outras equipes.</p>{!leader && <div className="empty"><b>Nenhuma liderança cadastrada ainda.</b><br />Use “Se torne liderança” na página inicial para criar o primeiro perfil de teste.</div>}{leader && <div className="list-item"><b>{leader.name}</b><span>{currentActs.length} ativistas vinculados</span></div>}</div></>}
    {view === "activists" && <div className="panel"><div className="page-head"><div><h2>Meus ativistas</h2><p>Somente os ativistas vinculados a esta liderança aparecem aqui.</p></div><button className="primary" onClick={() => { setForm(EMPTY); setEditing(null); setReturnTo("leader-area"); go("activist-registration"); }}>+ Adicionar</button></div>{currentActs.map(a => <div className="list-item clickable" key={a.id} onClick={() => { setDetailId(a.id); go("leader-activist-detail"); }}><b>{a.name}</b><span>{a.phone || "—"}</span></div>)}{!currentActs.length && <div className="empty">Nenhum ativista vinculado.</div>}</div>}
    {view === "profile" && <div className="panel"><div className="page-head"><div><h2>Meu cadastro</h2><p>Dados da própria liderança.</p></div>{leader && <button className="primary" onClick={() => { setEditing(leader); setForm({ ...leader }); setReturnTo("leader-area"); go("leader-registration"); }}>Editar</button>}</div>{leader ? <div className="detail-grid"><div><p><b>Nome:</b> {leader.name}</p><p><b>CPF:</b> {leader.cpf}</p><p><b>Telefone:</b> {leader.phone || "—"}</p><p><b>E-mail:</b> {leader.email || "—"}</p></div><div><p><b>Título:</b> {leader.title}</p><p><b>Zona:</b> {leader.zone || "—"}</p><p><b>Seção:</b> {leader.section || "—"}</p></div></div> : <div className="empty">Nenhuma liderança cadastrada.</div>}</div>}
    {view === "assessors" && <div className="panel"><h2>Contatos da assessoria</h2><p>Contatos disponibilizados pela coordenação para apoio às lideranças.</p>{db.assessors.map(a => <div className="list-item" key={a.id}><div><b>{a.name}</b><small>{a.email}</small></div><span>{a.phone}</span></div>)}</div>}
  </section></div></main>;

  if (mode === "admin-area") return <main className="app-shell"><Sidebar role="admin" view={view} setView={setView} onLogout={() => { setRole(null); go("home"); }} onNewLeader={() => { setForm(EMPTY); setEditing(null); setReturnTo("admin-area"); go("leader-registration"); }} /><div className="main"><header className="topbar"><div><h1>Área administrativa</h1><p>Gestão centralizada de lideranças e ativistas.</p></div><button className="primary" onClick={exportCSV}>Exportar CSV</button></header><section className="content">
    {view === "dashboard" && <><div className="cards"><div className="metric"><div className="label">Total de lideranças</div><div className="value">{db.leaderships.length}</div></div><div className="metric"><div className="label">Total de ativistas</div><div className="value">{db.activists.length}</div></div><div className="metric"><div className="label">Total de equipes</div><div className="value">{db.leaderships.length}</div></div><div className="metric"><div className="label">Cadastros recentes</div><div className="value">{recent.length}</div></div></div><div className="panel"><h2>Atividade recente</h2>{recent.map(x => <div className="list-item" key={x.id}><b>{x.name}</b><span>{x.kind}</span></div>)}{!recent.length && <div className="empty">Nenhum cadastro encontrado.</div>}</div></>}
    {view === "leaderships" && <div className="panel"><div className="page-head"><div><h2>Lideranças</h2><p>Pesquise por nome, CPF ou título.</p></div><button className="primary" onClick={() => { setForm(EMPTY); setEditing(null); setReturnTo("admin-area"); go("leader-registration"); }}>+ Nova liderança</button></div><input className="search" placeholder="Pesquisar liderança..." value={search} onChange={e => setSearch(e.target.value)} />{filteredLeaders.map(l => <div className="list-item clickable" key={l.id} onClick={() => { setDetailId(l.id); go("admin-leader-detail"); }}><div><b>{l.name}</b><small>CPF: {l.cpf} • Título: {l.title}</small></div><span>{db.activists.filter(a => a.leaderId === l.id).length} ativistas</span></div>)}{!filteredLeaders.length && <div className="empty">Nenhuma liderança encontrada.</div>}</div>}
    {view === "activists" && <div className="panel"><div className="page-head"><div><h2>Ativistas</h2><p>Lista geral com a liderança vinculada.</p></div></div><input className="search" placeholder="Pesquisar ativista..." value={search} onChange={e => setSearch(e.target.value)} />{filteredActs.map(a => { const l = db.leaderships.find(x => x.id === a.leaderId); return <div className="list-item clickable" key={a.id} onClick={() => { setDetailId(a.id); go("admin-activist-detail"); }}><div><b>{a.name}</b><small>CPF: {a.cpf} • Título: {a.title}</small></div><span>{l?.name || "Sem liderança"}</span></div>; })}{!filteredActs.length && <div className="empty">Nenhum ativista encontrado.</div>}</div>}
    {view === "admins" && <div className="panel"><div className="page-head"><div><h2>Administradores</h2><p>Usuários administrativos cadastrados neste protótipo.</p></div></div>{db.admins.map(a => <div className="list-item" key={a.id}><div><b>{a.name}</b><small>{a.email || "Sem e-mail"}</small></div><span>{a.cpf}</span></div>)}{!db.admins.length && <div className="empty">Nenhum administrador cadastrado. Use “Se tornar administrador” na página inicial.</div>}</div>}
  </section></div></main>;

  return null;
}
