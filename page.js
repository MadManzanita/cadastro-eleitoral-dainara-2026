"use client";

import { useEffect, useMemo, useState } from "react";

const TEST_CODE = "328974";
const TSE_URL = "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral";
const STORAGE = "cadastro-eleitoral-db-v2";

const EMPTY = {
  name: "", birth: "", cpf: "", phone: "", address: "", mother: "", email: "",
  neighborhood: "", cep: "", title: "", zone: "", section: "", pix: "", pixname: "", bank: ""
};

const digits = (v) => String(v || "").replace(/\D/g, "");

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

const validTitle = (value) => digits(value).length === 8;
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function emptyDb() {
  return { leaderships: [], activists: [], admins: [] };
}

function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function Field({ form, setForm, label, name, type = "text", required = false }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={form[name] || ""}
        required={required}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      />
    </label>
  );
}

function DataForm({ title, form, setForm, onSubmit, onBack, submitLabel, message, isLeader, onValidate }) {
  return (
    <main className="shell">
      <section className="card wide">
        <button className="back" onClick={onBack}>← Voltar</button>
        <h2>{title}</h2>
        <p>Preencha os dados abaixo. Os dados desta versão de teste ficam salvos neste navegador.</p>
        <form onSubmit={onSubmit}>
          <h3>Dados pessoais</h3>
          <div className="form-grid">
            <Field form={form} setForm={setForm} label="Nome completo" name="name" required />
            <Field form={form} setForm={setForm} label="Data de nascimento" name="birth" type="date" />
            <Field form={form} setForm={setForm} label="CPF" name="cpf" required />
            <Field form={form} setForm={setForm} label="Telefone" name="phone" />
            <Field form={form} setForm={setForm} label="Endereço" name="address" />
            <Field form={form} setForm={setForm} label="Nome da mãe" name="mother" />
            <Field form={form} setForm={setForm} label="E-mail" name="email" type="email" />
            <Field form={form} setForm={setForm} label="Bairro" name="neighborhood" />
            <Field form={form} setForm={setForm} label="CEP" name="cep" />
          </div>

          <h3>Dados eleitorais</h3>
          <div className="form-grid">
            <Field form={form} setForm={setForm} label="Título de eleitor" name="title" required />
            <Field form={form} setForm={setForm} label="Zona" name="zone" />
            <Field form={form} setForm={setForm} label="Seção" name="section" />
          </div>
          <div className="validation">
            <button type="button" className="outline primary" onClick={onValidate}>Validar CPF e título</button>
            <a className="tse" href={TSE_URL} target="_blank" rel="noreferrer">Consultar situação no TSE ↗</a>
          </div>

          <h3>Dados de pagamento</h3>
          <div className="form-grid">
            <Field form={form} setForm={setForm} label="Chave Pix" name="pix" />
            <Field form={form} setForm={setForm} label="Nome do titular" name="pixname" />
            <Field form={form} setForm={setForm} label="Banco" name="bank" />
          </div>

          {message && <div className="result">{message}</div>}
          <button className="primary submit" type="submit">{submitLabel || (isLeader ? "Cadastrar liderança" : "Cadastrar ativista")}</button>
        </form>
      </section>
    </main>
  );
}

function Detail({ title, person, leaderName, onBack, onEdit, showEdit = true }) {
  if (!person) return <main className="shell"><section className="card"><button className="back" onClick={onBack}>← Voltar</button><div className="empty">Cadastro não encontrado.</div></section></main>;
  return (
    <main className="shell">
      <section className="card wide">
        <div className="page-head">
          <div><button className="back" onClick={onBack}>← Voltar</button><h2>{title}</h2></div>
          {showEdit && <button className="primary" onClick={onEdit}>Editar cadastro</button>}
        </div>
        <div className="detail-grid">
          <div className="panel"><h3>Dados pessoais</h3>
            <p><b>Nome:</b> {person.name}</p><p><b>Nascimento:</b> {formatDate(person.birth)}</p><p><b>CPF:</b> {person.cpf}</p>
            <p><b>Telefone:</b> {person.phone || "—"}</p><p><b>E-mail:</b> {person.email || "—"}</p><p><b>Nome da mãe:</b> {person.mother || "—"}</p>
            <p><b>Endereço:</b> {person.address || "—"}</p><p><b>Bairro:</b> {person.neighborhood || "—"}</p><p><b>CEP:</b> {person.cep || "—"}</p>
          </div>
          <div className="panel"><h3>Dados eleitorais</h3>
            <p><b>Título:</b> {person.title}</p><p><b>Zona:</b> {person.zone || "—"}</p><p><b>Seção:</b> {person.section || "—"}</p>
            {leaderName && <p><b>Liderança:</b> {leaderName}</p>}
            <h3>Dados de pagamento</h3><p><b>Pix:</b> {person.pix || "—"}</p><p><b>Titular:</b> {person.pixname || "—"}</p><p><b>Banco:</b> {person.bank || "—"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [mode, setMode] = useState("home");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [db, setDb] = useState(emptyDb());
  const [leaderId, setLeaderId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [returnAfterSave, setReturnAfterSave] = useState("home");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) setDb({ ...emptyDb(), ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(db)); } catch {}
  }, [db]);

  const go = (next) => { setMode(next); setMessage(""); setCode(""); };

  const enter = (target) => {
    if (code !== TEST_CODE) return setMessage("Código inválido. Para o teste, use 328974.");
    if (target === "leader-area") {
      if (!db.leaderships.length) return setMessage("Ainda não existe uma liderança cadastrada. Use 'Se torne liderança' primeiro.");
      setLeaderId(db.leaderships[0].id);
    }
    setView("dashboard");
    go(target);
  };

  const liberate = (target) => {
    if (code !== TEST_CODE) return setMessage("Código inválido. Para o teste, use 328974.");
    setForm(EMPTY);
    setReturnAfterSave(target === "leader-registration" ? "leader-area" : "admin-area");
    go(target);
  };

  const validate = () => setMessage(`${validCPF(form.cpf) ? "✓ CPF válido" : "✗ CPF inválido"} • ${validTitle(form.title) ? "✓ Título com formato válido" : "✗ Título inválido"}`);

  const saveLeader = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setMessage("Informe o nome completo.");
    if (!validCPF(form.cpf)) return setMessage("Informe um CPF válido.");
    if (!validTitle(form.title)) return setMessage("O título deve conter exatamente 8 dígitos.");
    const id = editing?.id || newId();
    const record = { ...form, id, created: editing?.created || Date.now(), updated: Date.now() };
    setDb((d) => ({ ...d, leaderships: editing ? d.leaderships.map(x => x.id === id ? record : x) : [...d.leaderships, record] }));
    setLeaderId(id); setEditing(null); setForm(EMPTY); setMessage(""); setView("dashboard"); setMode(returnAfterSave === "admin-area" ? "admin-area" : "leader-area");
  };

  const saveActivist = (e) => {
    e.preventDefault();
    if (!leaderId) return setMessage("Nenhuma liderança selecionada.");
    if (!form.name.trim()) return setMessage("Informe o nome completo.");
    if (!validCPF(form.cpf)) return setMessage("Informe um CPF válido.");
    if (!validTitle(form.title)) return setMessage("O título deve conter exatamente 8 dígitos.");
    const id = editing?.id || newId();
    const record = { ...form, id, leaderId, created: editing?.created || Date.now(), updated: Date.now() };
    setDb((d) => ({ ...d, activists: editing ? d.activists.map(x => x.id === id ? record : x) : [...d.activists, record] }));
    setEditing(null); setForm(EMPTY); setMessage(""); setMode(returnAfterSave === "admin-area" ? "admin-area" : "leader-area");
  };

  const leader = db.leaderships.find(x => x.id === leaderId);
  const currentActs = db.activists.filter(x => x.leaderId === leaderId);
  const filteredLeaders = useMemo(() => db.leaderships.filter(x => x.name.toLowerCase().includes(search.toLowerCase())), [db.leaderships, search]);
  const filteredActs = useMemo(() => db.activists.filter(x => x.name.toLowerCase().includes(search.toLowerCase())), [db.activists, search]);

  const exportCSV = () => {
    const rows = [["Tipo","Nome","Nascimento","CPF","Telefone","Email","Mãe","Endereço","Bairro","CEP","Título","Zona","Seção","Pix","Titular","Banco","Liderança"]];
    db.leaderships.forEach(l => rows.push(["Liderança",l.name,l.birth,l.cpf,l.phone,l.email,l.mother,l.address,l.neighborhood,l.cep,l.title,l.zone,l.section,l.pix,l.pixname,l.bank,l.name]));
    db.activists.forEach(a => { const l = db.leaderships.find(x => x.id === a.leaderId); rows.push(["Ativista",a.name,a.birth,a.cpf,a.phone,a.email,a.mother,a.address,a.neighborhood,a.cep,a.title,a.zone,a.section,a.pix,a.pixname,a.bank,l?.name || ""]); });
    const csv = "\ufeff" + rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "cadastro-eleitoral.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (mode === "home") return <main className="shell"><section className="hero"><b>Cadastro Eleitoral</b><h1>Coordenadora Dainara Torres</h1><p>Portal de acesso, cadastro e gestão de lideranças e ativistas.</p><div className="actions"><button onClick={() => go("leader-login")}>Já sou liderança</button><button onClick={() => go("join-leader")}>Se torne liderança</button><button className="outline" onClick={() => go("admin-login")}>Acesso administrativo</button><button className="outline" onClick={() => go("join-admin")}>Se tornar administrador</button></div></section></main>;

  if (["leader-login","admin-login","join-leader","join-admin"].includes(mode)) {
    const admin = mode.includes("admin"); const join = mode.includes("join");
    return <main className="shell"><section className="card"><button className="back" onClick={() => go("home")}>← Voltar</button><h2>{join ? (admin ? "Se tornar administrador" : "Se torne liderança") : (admin ? "Acesso administrativo" : "Acesso da liderança")}</h2><p>{join ? "Informe o código de liberação para continuar." : "Informe o código de 6 dígitos para acessar sua área."}</p><div className="grid"><label>Código de 6 dígitos<input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(digits(e.target.value).slice(0,6))} placeholder="000000" /></label><button className="primary" onClick={() => join ? liberate(admin ? "admin-registration" : "leader-registration") : enter(admin ? "admin-area" : "leader-area")}>{join ? "Continuar" : "Entrar"}</button>{message && <div className="result">{message}</div>}</div></section></main>;
  }

  if (mode === "leader-registration") return <DataForm title={editing ? "Editar liderança" : "Cadastro de liderança"} form={form} setForm={setForm} onSubmit={saveLeader} onBack={() => go(returnAfterSave === "admin-area" ? "admin-area" : "home")} submitLabel={editing ? "Salvar alterações" : "Cadastrar liderança"} message={message} isLeader onValidate={validate} />;

  if (mode === "activist-registration") return <DataForm title={editing ? "Editar ativista" : "Cadastro de ativista"} form={form} setForm={setForm} onSubmit={saveActivist} onBack={() => go(returnAfterSave === "admin-area" ? "admin-area" : "leader-area")} submitLabel={editing ? "Salvar alterações" : "Cadastrar ativista"} message={message} onValidate={validate} />;

  if (mode === "admin-registration") return <main className="shell"><section className="card"><button className="back" onClick={() => go("home")}>← Voltar</button><h2>Cadastro de administrador</h2><p>Fluxo de teste liberado pelo código 328974.</p><form onSubmit={e => { e.preventDefault(); setDb(d => ({ ...d, admins: [...d.admins, { id: newId(), name: e.currentTarget.name.value, cpf: e.currentTarget.cpf.value, email: e.currentTarget.email.value, created: Date.now() }] })); setMessage("✓ Administrador cadastrado para teste."); }}><div className="grid"><label>Nome completo<input name="name" required /></label><label>CPF<input name="cpf" required /></label><label>E-mail<input name="email" type="email" required /></label><button className="primary">Cadastrar administrador</button>{message && <div className="result">{message}</div>}</div></form></section></main>;

  if (mode === "leader-detail") return <Detail title="Meu cadastro" person={leader} onBack={() => go("leader-area")} onEdit={() => { setEditing(leader); setForm({ ...leader }); setReturnAfterSave("leader-area"); go("leader-registration"); }} />;

  if (mode === "activist-detail") {
    const a = db.activists.find(x => x.id === detailId);
    return <Detail title="Dados do ativista" person={a} leaderName={leader?.name} onBack={() => go("leader-area")} onEdit={() => { setEditing(a); setForm({ ...a }); setLeaderId(a?.leaderId || leaderId); setReturnAfterSave("leader-area"); go("activist-registration"); }} />;
  }

  if (mode === "admin-leader-detail") {
    const l = db.leaderships.find(x => x.id === detailId); const a = db.activists.filter(x => x.leaderId === detailId);
    return <main className="shell"><section className="card wide"><button className="back" onClick={() => { setView("leaderships"); go("admin-area"); }}>← Voltar</button><div className="page-head"><div><h2>{l?.name || "Liderança"}</h2><p>Ativistas vinculados: {a.length}</p></div>{l && <button className="primary" onClick={() => { setEditing(l); setForm({ ...l }); setReturnAfterSave("admin-area"); go("leader-registration"); }}>Editar liderança</button>}</div>{l && <div className="detail-grid"><div className="panel"><h3>Dados pessoais</h3><p><b>CPF:</b> {l.cpf}</p><p><b>Nascimento:</b> {formatDate(l.birth)}</p><p><b>Telefone:</b> {l.phone || "—"}</p><p><b>E-mail:</b> {l.email || "—"}</p><p><b>Mãe:</b> {l.mother || "—"}</p><p><b>Endereço:</b> {l.address || "—"}</p><p><b>Bairro:</b> {l.neighborhood || "—"}</p><p><b>CEP:</b> {l.cep || "—"}</p></div><div className="panel"><h3>Dados eleitorais</h3><p><b>Título:</b> {l.title}</p><p><b>Zona:</b> {l.zone || "—"}</p><p><b>Seção:</b> {l.section || "—"}</p><h3>Pagamento</h3><p><b>Pix:</b> {l.pix || "—"}</p><p><b>Titular:</b> {l.pixname || "—"}</p><p><b>Banco:</b> {l.bank || "—"}</p></div></div>}<div className="panel"><div className="page-head"><h3>Ativistas vinculados: {a.length}</h3><button className="primary" onClick={() => { setLeaderId(detailId); setForm(EMPTY); setEditing(null); setReturnAfterSave("admin-area"); go("activist-registration"); }}>+ Adicionar ativista</button></div>{a.map(x => <div className="list-item clickable" key={x.id} onClick={() => { setDetailId(x.id); go("admin-activist-detail"); }}><b>{x.name}</b><span>{x.phone || "—"}</span></div>)}{!a.length && <div className="empty">Nenhum ativista vinculado.</div>}</div></section></main>;
  }

  if (mode === "admin-activist-detail") {
    const a = db.activists.find(x => x.id === detailId); const l = db.leaderships.find(x => x.id === a?.leaderId);
    return <Detail title="Dados do ativista" person={a} leaderName={l?.name} onBack={() => { setView("activists"); go("admin-area"); }} onEdit={() => { setEditing(a); setForm({ ...a }); setLeaderId(a?.leaderId || null); setReturnAfterSave("admin-area"); go("activist-registration"); }} />;
  }

  if (mode === "leader-area") return <main className="app-shell"><aside className="sidebar"><div className="brand"><b>Cadastro Eleitoral</b><span>Área da liderança</span></div><nav><button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>⌂ Dashboard</button><button onClick={() => { setEditing(null); setForm(EMPTY); setReturnAfterSave("leader-area"); go("activist-registration"); }}>＋ Adicionar ativista</button><button onClick={() => go("leader-detail")}>👤 Meu cadastro</button></nav><button className="logout" onClick={() => go("home")}>Sair</button></aside><main className="main"><header className="topbar"><div><h1>Área da liderança</h1><p>{leader?.name || "Liderança"} • seus ativistas</p></div><button className="primary" onClick={() => { setEditing(null); setForm(EMPTY); setReturnAfterSave("leader-area"); go("activist-registration"); }}>+ Adicionar ativista</button></header><section className="content"><div className="cards"><div className="metric"><div className="label">Meus ativistas</div><div className="value">{currentActs.length}</div></div><div className="metric"><div className="label">Equipe</div><div className="value">{currentActs.length + 1}</div></div></div><div className="panel"><div className="page-head"><div><h2>Ativistas vinculados</h2><p>Somente os ativistas desta liderança aparecem aqui.</p></div></div>{currentActs.map(a => <div className="list-item clickable" key={a.id} onClick={() => { setDetailId(a.id); go("activist-detail"); }}><b>{a.name}</b><span>{a.phone || "—"}</span></div>)}{!currentActs.length && <div className="empty">Nenhum ativista vinculado. Clique em “Adicionar ativista”.</div>}</div></section></main></main>;

  if (mode === "admin-area") return <main className="app-shell"><aside className="sidebar"><div className="brand"><b>Cadastro Eleitoral</b><span>Coordenadora Dainara Torres</span></div><div className="nav-title">Menu</div><nav>{[["dashboard","⌂ Dashboard"],["leaderships","♙ Lideranças"],["activists","♧ Ativistas"]].map(([k,l]) => <button key={k} className={view === k ? "active" : ""} onClick={() => { setView(k); setSearch(""); }}>{l}</button>)}<button onClick={() => { setEditing(null); setForm(EMPTY); setReturnAfterSave("admin-area"); go("leader-registration"); }}>＋ Nova liderança</button></nav><button className="logout" onClick={() => go("home")}>Sair</button></aside><main className="main"><header className="topbar"><div><h1>Área administrativa</h1><p>Gestão centralizada de lideranças e ativistas.</p></div><button className="primary" onClick={exportCSV}>Exportar CSV</button></header><section className="content">
    {view === "dashboard" && <><div className="cards"><div className="metric"><div className="label">Total de lideranças</div><div className="value">{db.leaderships.length}</div></div><div className="metric"><div className="label">Total de ativistas</div><div className="value">{db.activists.length}</div></div><div className="metric"><div className="label">Total de equipes</div><div className="value">{db.leaderships.length}</div></div><div className="metric"><div className="label">Cadastros recentes</div><div className="value">{[...db.leaderships,...db.activists].filter(x => Date.now() - x.created < 86400000).length}</div></div></div><div className="panel"><h2>Atividade recente</h2>{[...db.leaderships.map(x => ({...x,type:"Liderança"})), ...db.activists.map(x => ({...x,type:"Ativista"}))].sort((a,b) => b.created - a.created).slice(0,8).map(x => <div className="list-item" key={x.id}><b>{x.name}</b><span>{x.type}</span></div>)}{!db.leaderships.length && !db.activists.length && <div className="empty">Nenhum cadastro encontrado.</div>}</div></>}
    {view === "leaderships" && <div className="panel"><div className="page-head"><div><h2>Lideranças</h2><p>Pesquise, abra e edite cada liderança.</p></div><button className="primary" onClick={() => { setEditing(null); setForm(EMPTY); setReturnAfterSave("admin-area"); go("leader-registration"); }}>+ Nova liderança</button></div><input className="search" placeholder="Pesquisar liderança por nome..." value={search} onChange={e => setSearch(e.target.value)} />{filteredLeaders.map(l => <div className="list-item clickable" key={l.id} onClick={() => { setDetailId(l.id); go("admin-leader-detail"); }}><b>{l.name}</b><span>{db.activists.filter(a => a.leaderId === l.id).length} ativistas</span></div>)}{!filteredLeaders.length && <div className="empty">Nenhuma liderança encontrada.</div>}</div>}
    {view === "activists" && <div className="panel"><h2>Ativistas</h2><p>Lista geral com a liderança vinculada.</p><input className="search" placeholder="Pesquisar ativista por nome..." value={search} onChange={e => setSearch(e.target.value)} />{filteredActs.map(a => { const l = db.leaderships.find(x => x.id === a.leaderId); return <div className="list-item clickable" key={a.id} onClick={() => { setDetailId(a.id); go("admin-activist-detail"); }}><b>{a.name}</b><span>{l?.name || "Sem liderança"}</span></div>; })}{!filteredActs.length && <div className="empty">Nenhum ativista encontrado.</div>}</div>}
  </section></main></main>;

  return null;
}
