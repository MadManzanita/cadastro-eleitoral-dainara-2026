"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AMAZONAS_MUNICIPALITIES, AMAZONAS_TERRITORIES, MANAUS_ZONES, getManausZone } from "../data/territories";
import { PIX_BANKS } from "../data/banks";
import ActivityRecords from "./ActivityRecords";

const TSE = "https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral";
const KEY = "cadastro-eleitoral-dainara-2026-v9";
const LEGACY_KEYS = ["cadastro-eleitoral-dainara-2026-v8"];
const EMPTY = {
  name: "", birth: "", cpf: "", phone: "", address: "", mother: "", email: "",
  municipality: "", neighborhood: "", manausZone: "", cep: "", title: "", zone: "", section: "", pix: "", pixname: "", bank: ""
};
const EMPTY_ASSESSOR = { name: "", role: "", phone: "", email: "", notes: "" };
const digits = (v) => String(v || "").replace(/\D/g, "");
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const makePassword = () => String(Math.floor(10000000 + Math.random() * 90000000));

const cpfOK = (v) => {
  const c = digits(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d = (s * 10) % 11;
  if (d === 10) d = 0;
  if (d !== +c[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  d = (s * 10) % 11;
  if (d === 10) d = 0;
  return d === +c[10];
};

const titleOK = (v) => digits(v).length === 12;
const dateBR = (v) => (v ? String(v).split("-").reverse().join("/") : "");
const cpfBR = (v) => {
  const d = digits(v);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : String(v || "");
};
const cepBR = (v) => {
  const d = digits(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : String(v || "");
};
const phoneBR = (v) => {
  const d = digits(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return String(v || "");
};

const fresh = () => ({ leaderships: [], archivedLeaderships: [], activists: [], archivedActivists: [], families: [], archivedFamilies: [], admins: [], assessors: [] });

function maskField(n, v) {
  const d = digits(v);
  if (n === "cpf") return cpfBR(d);
  if (n === "phone") return phoneBR(d);
  if (n === "cep") return cepBR(d);
  if (n === "title") return d.slice(0, 12);
  if (n === "zone") return d.slice(0, 3);
  if (n === "section") return d.slice(0, 4);
  return String(v || "");
}

function Field({ f, setF, n, label, type = "text", required = false, placeholder }) {
  const numeric = ["cpf", "phone", "cep", "title", "zone", "section"].includes(n);
  const max = { cpf: 14, phone: 15, cep: 9, title: 12, zone: 3, section: 4 }[n];
  const preserveCase = ["email", "pix"].includes(n);
  const electoral = ["title", "zone", "section"].includes(n);
  const change = (rawValue) => {
    let value = rawValue;
    if (numeric) {
      const limits = { cpf: 11, phone: 11, cep: 8, title: 12, zone: 3, section: 4 };
      value = digits(value).slice(0, limits[n]);
    } else if (!preserveCase && type !== "date") {
      value = value.toUpperCase();
    }
    setF((current) => {
      const next = { ...current, [n]: value };
      if (n === "name" && (!current.pixname || current.pixname === current.name)) next.pixname = value;
      return next;
    });
  };
  const guidance = { name: "Digite o nome completo", phone: "DDD e número do telefone", address: "Rua, número e complemento", mother: "Digite o nome completo da mãe", email: "exemplo@email.com", cep: "CEP do endereço", title: "12 números do título", zone: "Até 3 números", section: "Até 4 números" }[n];
  return <label className="field"><span>{label}{required ? " *" : ""}</span><input type={type} required={required} value={numeric ? maskField(n, f[n]) : (f[n] || "")} placeholder={placeholder || guidance} maxLength={max} inputMode={numeric ? "numeric" : undefined} pattern={electoral ? "[0-9]*" : undefined} autoCapitalize={preserveCase ? "none" : undefined} autoCorrect={preserveCase ? "off" : undefined} spellCheck={preserveCase ? false : undefined} style={preserveCase ? { textTransform: "none" } : undefined} onChange={(e) => change(e.target.value)} /></label>;
}

function PixField({ f, setF }) {
  const updatePix = (value) => setF((current) => ({ ...current, pix: value }));
  return <label className="field"><span>Chave Pix</span><input className="case-preserving-input" type="text" name="pix" value={String(f.pix || "")} placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} onInput={(e) => updatePix(e.currentTarget.value)} onChange={(e) => updatePix(e.currentTarget.value)} /></label>;
}

function HolderNameField({ f }) {
  return <label className="field"><span>Nome do titular</span><input value={f.name || ""} placeholder="Preenchido automaticamente pelo nome completo" disabled aria-disabled="true" title="Preenchido automaticamente com o nome completo" /></label>;
}

function TerritoryFields({ f, setF }) {
  const inferredMunicipality = f.municipality || (MANAUS_ZONES[f.neighborhood] ? "Manaus" : "");
  const neighborhoods = inferredMunicipality ? (AMAZONAS_TERRITORIES[inferredMunicipality] || []) : [];
  const manausZone = inferredMunicipality === "Manaus" ? getManausZone(f.neighborhood || "") : "";
  return <><h3>Localização territorial</h3><div className="form-grid three">
    <label className="field"><span>Município *</span><select required value={inferredMunicipality} onChange={(e) => setF((x) => ({ ...x, municipality: e.target.value, neighborhood: "", manausZone: "" }))}><option value="">Selecione o município</option>{AMAZONAS_MUNICIPALITIES.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}</select></label>
    <label className="field"><span>Bairro / localidade *</span><select required disabled={!inferredMunicipality} value={f.neighborhood || ""} onChange={(e) => setF((x) => ({ ...x, municipality: inferredMunicipality, neighborhood: e.target.value, manausZone: inferredMunicipality === "Manaus" ? getManausZone(e.target.value) : "" }))}><option value="">{inferredMunicipality ? "Selecione o bairro/localidade" : "Selecione primeiro o município"}</option>{neighborhoods.map((neighborhood) => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}</select></label>
    <label className="field"><span>Zona de Manaus</span><input readOnly value={manausZone} placeholder={inferredMunicipality === "Manaus" ? "Detectada automaticamente" : "Somente para Manaus"}/></label>
  </div></>;
}

function BankField({ f, setF }) {
  const other = Boolean(f.bankOther || (f.bank && !PIX_BANKS.includes(f.bank)));
  const selected = other ? "__other__" : (f.bank || "");
  const choose = (value) => setF((current) => value === "__other__" ? { ...current, bank: "", bankOther: true } : { ...current, bank: value, bankOther: false });
  return <label className="field"><span>Banco</span><select value={selected} onChange={(e) => choose(e.target.value)}><option value="">Selecione o banco ou instituição Pix</option>{PIX_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}<option value="__other__">Outros</option></select>{other && <input autoFocus value={f.bank || ""} placeholder="Digite o nome do banco ou instituição" onChange={(e) => setF((current) => ({ ...current, bank: e.target.value, bankOther: true }))}/>}</label>;
}

function Form({ kind, f, setF, save, back, msg, edit, admin, leaderships, leaderId, setLeaderId }) {
  return <main className="shell"><section className="card wide"><button className="back" onClick={back}>← Voltar</button><h2>{edit ? `Editar ${kind}` : `Cadastro de ${kind}`}</h2><p>Preencha os dados e salve o cadastro.</p><form onSubmit={save}>
    <h3>Dados pessoais</h3><div className="form-grid"><Field f={f} setF={setF} n="name" label="Nome completo" required/><Field f={f} setF={setF} n="birth" label="Data de nascimento" type="date"/><Field f={f} setF={setF} n="cpf" label="CPF" required placeholder="000.000.000-00"/><Field f={f} setF={setF} n="phone" label="Celular / telefone" placeholder="(00) 00000-0000"/><Field f={f} setF={setF} n="address" label="Endereço"/><Field f={f} setF={setF} n="mother" label="Nome da mãe"/><Field f={f} setF={setF} n="email" label="E-mail" type="email"/><Field f={f} setF={setF} n="cep" label="CEP" placeholder="00000-000"/></div><TerritoryFields f={f} setF={setF}/>
    {kind === "ativista" && admin && <><h3>Vínculo</h3><div className="form-grid"><label className="field"><span>Liderança responsável *</span><select required value={leaderId || ""} onChange={(e) => setLeaderId(e.target.value)}><option value="">Selecione a liderança</option>{leaderships.map((l) => <option key={l.id} value={l.id}>{l.name} — CPF {cpfBR(l.cpf)}</option>)}</select></label></div></>}
    <h3>Dados eleitorais</h3><div className="form-grid three"><Field f={f} setF={setF} n="title" label="Título de eleitor" required placeholder="000000000000"/><Field f={f} setF={setF} n="zone" label="Zona"/><Field f={f} setF={setF} n="section" label="Seção"/></div>
    <div className="validation-row"><button type="button" className="outline" onClick={() => setF((x) => ({ ...x, _validation: `${cpfOK(x.cpf) ? "✓ CPF válido" : "✗ CPF inválido"} • ${titleOK(x.title) ? "✓ Título válido" : "✗ Título inválido"}` }))}>Validar CPF e título</button><a className="tse" href={TSE} target="_blank" rel="noreferrer">Consultar situação no TSE ↗</a></div>
    <h3>Dados de pagamento</h3><div className="form-grid three"><PixField f={f} setF={setF}/><HolderNameField f={f}/><BankField f={f} setF={setF}/></div>
    {f._validation && <div className="result">{f._validation}</div>}{msg && <div className="result">{msg}</div>}<button className="primary submit">{edit ? "Salvar alterações" : `Cadastrar ${kind}`}</button>
  </form></section></main>;
}

function Access({ admin, release, cpf, setCpf, password, setPassword, code, setCode, msg, onEnter, onBack, onSwitch }) {
  return <main className="shell"><section className="card auth-card"><button className="back" onClick={onBack}>← Voltar</button><h2>{release ? (admin ? "Se tornar administrador" : "Se torne liderança") : (admin ? "Acesso administrativo" : "Já sou liderança")}</h2>
    <p>{release ? "Informe o código de liberação para continuar." : admin ? "Acesse usando o CPF do administrador cadastrado." : "Acesse usando o CPF da liderança e a senha gerada no cadastro."}</p>
    {release ? <label className="field"><span>Código de liberação</span><input autoFocus inputMode="numeric" maxLength={6} value={code} placeholder="000000" onChange={(e) => setCode(digits(e.target.value).slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && onEnter()}/></label> : <>
      <label className="field"><span>CPF</span><input autoFocus inputMode="numeric" maxLength={14} value={cpfBR(cpf)} placeholder="000.000.000-00" onChange={(e) => setCpf(digits(e.target.value).slice(0, 11))} onKeyDown={(e) => e.key === "Enter" && onEnter()}/></label>
      <label className="field"><span>Senha</span><input type="password" minLength={8} value={password} placeholder={admin ? "Senha de administrador" : "Senha de acesso"} onChange={(e) => setPassword(admin ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && onEnter()}/></label>
    </>}
    {msg && <div className="result">{msg}</div>}<button className="primary" onClick={onEnter}>{release ? "Continuar" : "Entrar"}</button>{release && <div className="auth-note">Use o código de configuração definido pela coordenação.</div>}<button className="link-button" onClick={onSwitch}>{release ? (admin ? "Voltar ao acesso administrativo" : "Já sou liderança") : (admin ? "Se tornar administrador" : "Se torne liderança")}</button>
  </section></main>;
}

function AdminReg({ back, save, msg }) {
  return <main className="shell"><section className="card auth-card"><button className="back" onClick={back}>← Voltar</button><h2>Cadastro de administrador</h2><p>Crie suas credenciais de administrador. Depois do cadastro, o acesso será feito com CPF e senha.</p><form onSubmit={save}><label className="field"><span>Nome completo *</span><input name="name" required/></label><label className="field"><span>CPF *</span><input name="cpf" required maxLength={14} inputMode="numeric" placeholder="000.000.000-00" onChange={(e) => { e.currentTarget.value = cpfBR(e.currentTarget.value); }}/></label><label className="field"><span>E-mail</span><input name="email" type="email"/></label><label className="field"><span>Crie uma senha de administrador *</span><input name="password" type="password" required minLength={8} placeholder="Mínimo de 8 caracteres"/></label>{msg && <div className="result">{msg}</div>}<button className="primary">Concluir cadastro</button></form></section></main>;
}

function Credential({ person, password, onAccess, onBack }) {
  if (!person) return <main className="shell"><section className="card auth-card"><h2>Cadastro concluído</h2><p>O cadastro foi salvo, mas a tela de credenciais precisa ser recuperada.</p><button className="primary" onClick={onBack}>Voltar ao início</button></section></main>;
  const shownPassword = password || person.password || "";
  const copy = async () => { try { await navigator.clipboard.writeText(shownPassword); } catch {} };
  return <main className="shell"><section className="card auth-card credential-card"><div className="credential-success">✓ CADASTRO CONCLUÍDO</div><h2>Senha da liderança gerada</h2><p>{person.name}, guarde esta credencial. Ela será usada com seu CPF para entrar na Área da Liderança.</p><div className="credential-box featured"><div className="credential-item"><span>CPF</span><b>{cpfBR(person.cpf)}</b></div><div className="credential-divider"/><div className="credential-item"><span>SENHA DE ACESSO</span><strong>{shownPassword}</strong></div><button className="copy-password" onClick={copy}>Copiar senha</button></div><div className="credential-warning"><b>Importante:</b> esta senha é necessária para acessar a Área da Liderança. Anote ou copie antes de continuar.</div><button className="primary" onClick={onAccess}>Ir para acesso da liderança</button><button className="link-button" onClick={onBack}>Voltar ao início</button></section></main>;
}

function AssessorForm({ form, setForm, save, cancel, editing }) {
  return <div className="assessor-editor"><div className="editor-title"><div><h3>{editing ? "Editar contato" : "Novo contato da assessoria"}</h3><p>Este contato ficará disponível automaticamente para todas as lideranças.</p></div><button className="back small-back" onClick={cancel}>Cancelar</button></div><form onSubmit={save}><div className="form-grid"><label className="field"><span>Nome do contato *</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label className="field"><span>Função / descrição</span><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ex.: Assessoria, coordenação, jurídico..."/></label><label className="field"><span>Telefone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: phoneBR(e.target.value) })} placeholder="(00) 00000-0000"/></label><label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label></div><label className="field"><span>Observações</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Informações adicionais para as lideranças..."/></label><button className="primary">{editing ? "Salvar alterações" : "Adicionar contato"}</button></form></div>;
}

function AdminLeadershipCredential({ person, onReset }) {
  const [newPassword, setNewPassword] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(newPassword); } catch {} };
  const reset = async () => {
    if (!window.confirm("Gerar uma nova senha? A senha anterior deixará de funcionar.")) return;
    const password = await onReset();
    if (password) setNewPassword(password);
  };
  return <div className="panel credential-admin"><h3>Credencial de acesso</h3><p>Por segurança, a senha atual não pode ser exibida. Gere uma nova senha para repassar à liderança.</p><button type="button" className="outline" onClick={reset}>Gerar nova senha</button>{newPassword && <div className="credential-box"><div className="credential-item"><span>NOVA SENHA DE ACESSO</span><strong>{newPassword}</strong></div><p>Copie e entregue esta senha agora. A senha anterior foi invalidada.</p><button type="button" className="copy-password" onClick={copy}>Copiar nova senha</button></div>}</div>;
}

function Detail({ person, title, leader, onBack, onEdit, team, credential, actions }) {
  if (!person) return <main className="shell"><section className="card"><button className="back" onClick={onBack}>← Voltar</button><div className="empty">Cadastro não encontrado.</div></section></main>;
  return <main className="shell"><section className="card wide"><div className="page-head"><div><button className="back" onClick={onBack}>← Voltar</button><h2>{title}</h2></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><button className="primary" onClick={onEdit}>Editar cadastro</button>{actions}</div></div>{leader && <div className="context-badge">Liderança: <b>{leader}</b></div>}<div className="detail-grid"><div className="panel"><h3>Dados pessoais</h3><p><b>Nome:</b> {person.name}</p><p><b>Nascimento:</b> {dateBR(person.birth) || "—"}</p><p><b>CPF:</b> {cpfBR(person.cpf) || "—"}</p><p><b>Telefone:</b> {phoneBR(person.phone) || "—"}</p><p><b>E-mail:</b> {person.email || "—"}</p><p><b>Nome da mãe:</b> {person.mother || "—"}</p><p><b>Endereço:</b> {person.address || "—"}</p><p><b>Bairro:</b> {person.neighborhood || "—"}</p><p><b>CEP:</b> {cepBR(person.cep) || "—"}</p></div><div className="panel"><h3>Dados eleitorais</h3><p><b>Título:</b> {person.title || "—"}</p><p><b>Zona:</b> {person.zone || "—"}</p><p><b>Seção:</b> {person.section || "—"}</p><h3>Dados de pagamento</h3><p><b>Pix:</b> {person.pix || "—"}</p><p><b>Titular:</b> {person.pixname || "—"}</p><p><b>Banco:</b> {person.bank || "—"}</p></div></div>{credential}{team}</section></main>;
}


const MANAUS_MAP_WIDTH = 500;
const MANAUS_MAP_HEIGHT = 354;
const MANAUS_MAP_IMAGE = "data:image/jpeg;base64,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UghmUYwxHQmrNFAk2tgooooEFFFFABSEAjBGQe1LRQBVFmUG2K5mjjHRF2kD6ZBNNtTIt7PEZnlRVU5bGQTnI4A7Yq5VQ4TVBs/5aREuPoRg/qaDRNyumW6KKKDMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAjuYhPbyRE4DqRmm2cpmtUdgAxGCB0yODTNSLLp87KxUhCQQcVPEixxKiKFVRgAdqC/sjqKKKCAooooAKKKKACiiigAooooAKKKKAI7mLzreSLON6kZ9KghvAG8q6AhlBxyflf3U/0q3TZI1ljZHUMrDBBHWgpNbMdRVTTX/ceQ7Eywna2Tz14P4irdApKzsFFFFAgooooAKKKKACqV1NFDqEDyuqDy3GWOO61doIzQVF2eoiMroGUgqwyCOhFLVCJ5LGNY5ox9nViolDZ2rzjI7dhVuGeKcEwyLIFODtOcUBKLWq2JKKKKCQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAKTh7yeSLcFt4mUMMcueDjPp0q7VSzZRcXURI3iTdj2IGDVugufYKKKKCAooooAKKKKACiiigAooooAKKKKACiiobm4W3QEgu7HCIvVjQNJt2RApMup74VIWMFJHPRvRR64J61dqCzieONjLjzJGLsF6AnsPyqegc3rZBRRUdx5phbyHRJOzOuQPwyKCSSisi01OYW4kulEplkKwCFCC4HfBPTg1J/bdruXasrKwQlwvChjgZ/Gg0dORp0VUh1CKW9a12yLIASNwwGAODirdBDTW4UUUUCCqkn7i+WX/lnMBG3swzj88kflVuobqAXEO3JVgQysP4SOhoKi9dSaiobSbz7aOQjDEfMPQ9x+dTUCas7BRRRQIKKKKACiiigAooooAKKKKACiiqq3nmcwW8sqdmAAB+mSM0DSbLVFVWvfK5uIJYV/vtgqPqQeKtAgjIPBoBxaCiqxvotxCLJKBwWjjLAfj3o+0yt9y0mI7ElR/XP6UD5GWaKqm6kjZftEHlox27w2QCemalmuYYMebIqFugJ5NAcrJaKZDNHOm6Jgwzg+xp9BLVgooooAKKKKACii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";
const MANAUS_MAP_ZONES = [
  { name: "Oeste", seed: [105, 105] },
  { name: "Norte", seed: [225, 60] },
  { name: "Leste", seed: [390, 125] },
  { name: "Centro-Oeste", seed: [205, 175] },
  { name: "Centro-Sul", seed: [200, 245] },
  { name: "Sul", seed: [250, 330] }
];

function ManausCoverageMap({ db }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const maskRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const allPeople = [...(db.leaderships || []), ...(db.activists || []), ...(db.families || [])];
  const counts = Object.fromEntries(MANAUS_MAP_ZONES.map(({ name }) => [
    name,
    allPeople.filter((person) => MANAUS_ZONES[person.neighborhood] === name).length
  ]));
  const active = MANAUS_MAP_ZONES.find((zone) => zone.name === hovered);

  const paint = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, MANAUS_MAP_WIDTH, MANAUS_MAP_HEIGHT);
    context.drawImage(image, 0, 0, MANAUS_MAP_WIDTH, MANAUS_MAP_HEIGHT);
    const imageData = context.getImageData(0, 0, MANAUS_MAP_WIDTH, MANAUS_MAP_HEIGHT);
    const pixels = imageData.data;
    const claimed = new Uint8Array(MANAUS_MAP_WIDTH * MANAUS_MAP_HEIGHT);
    const getColor = (count, isActive) => {
      if (!count) return isActive ? [255, 237, 245] : [255, 255, 255];
      if (count <= 10) return isActive ? [249, 193, 214] : [253, 225, 235];
      if (count <= 50) return isActive ? [222, 101, 145] : [238, 154, 181];
      return isActive ? [163, 37, 81] : [197, 70, 114];
    };
    const whiteInterior = (position) => {
      const offset = position * 4;
      return pixels[offset] > 238 && pixels[offset + 1] > 238 && pixels[offset + 2] > 238;
    };

    MANAUS_MAP_ZONES.forEach((zone, zoneIndex) => {
      const color = getColor(counts[zone.name], hovered === zone.name);
      const stack = [zone.seed[1] * MANAUS_MAP_WIDTH + zone.seed[0]];
      while (stack.length) {
        const position = stack.pop();
        if (claimed[position] || !whiteInterior(position)) continue;
        claimed[position] = zoneIndex + 1;
        const offset = position * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        const x = position % MANAUS_MAP_WIDTH;
        const y = Math.floor(position / MANAUS_MAP_WIDTH);
        if (x > 0) stack.push(position - 1);
        if (x < MANAUS_MAP_WIDTH - 1) stack.push(position + 1);
        if (y > 0) stack.push(position - MANAUS_MAP_WIDTH);
        if (y < MANAUS_MAP_HEIGHT - 1) stack.push(position + MANAUS_MAP_WIDTH);
      }
    });
    maskRef.current = claimed;
    context.putImageData(imageData, 0, 0);
  };

  useEffect(() => {
    const image = new Image();
    image.onload = () => { imageRef.current = image; paint(); };
    image.src = MANAUS_MAP_IMAGE;
    return () => { image.onload = null; };
  }, []);

  useEffect(() => { paint(); }, [hovered, JSON.stringify(counts)]);

  const zoneAtPointer = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) * MANAUS_MAP_WIDTH / bounds.width);
    const y = Math.floor((event.clientY - bounds.top) * MANAUS_MAP_HEIGHT / bounds.height);
    const mask = maskRef.current;
    if (!mask || x < 0 || y < 0 || x >= MANAUS_MAP_WIDTH || y >= MANAUS_MAP_HEIGHT) return null;
    const zoneIndex = mask[y * MANAUS_MAP_WIDTH + x] - 1;
    return zoneIndex >= 0 ? MANAUS_MAP_ZONES[zoneIndex].name : null;
  };

  return <section className="panel">
    <div className="page-head"><div><h2>Mapa de cadastros por zona</h2><p>Manaus — bairros oficiais por zona administrativa.</p></div></div>
    <div style={{ position: "relative", maxWidth: 860, margin: "12px auto 0" }}>
      <canvas ref={canvasRef} width={MANAUS_MAP_WIDTH} height={MANAUS_MAP_HEIGHT} role="img" aria-label="Mapa interativo das zonas de Manaus" onMouseMove={(event) => setHovered(zoneAtPointer(event))} onMouseLeave={() => setHovered(null)} style={{ width: "100%", height: "auto", display: "block", background: "#fff", borderRadius: 16, cursor: "default", filter: "drop-shadow(0 8px 14px rgba(157,91,116,.10))" }} />
      {active && <div role="status" style={{ position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)", background: "#49383f", color: "#fff", padding: "10px 14px", borderRadius: 10, fontWeight: 800, boxShadow: "0 8px 20px rgba(0,0,0,.16)", whiteSpace: "nowrap" }}>{active.name}: {counts[active.name]} cadastro(s)</div>}
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14, fontSize: 13, color: "#765665" }}>
      {[["0", "#fff"], ["1–10", "#fde1eb"], ["11–50", "#ee9ab5"], ["51–100", "#c54672"]].map(([label, swatch]) => <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 11, height: 11, display: "inline-block", borderRadius: 3, background: swatch, border: "1px solid #e7a9bf" }} /> {label}</span>)}
    </div>
  </section>;
}

function TrustNetworkManager({ db, setDb, admin, remote }) {
  const [query, setQuery] = useState(""), [activistFilter, setActivistFilter] = useState(""), [leaderFilter, setLeaderFilter] = useState(""), [neighborhoodFilter, setNeighborhoodFilter] = useState(""), [editingFamily, setEditingFamily] = useState(null), [history, setHistory] = useState([]), [notice, setNotice] = useState("");
  const families = db.families || [];
  const neighborhoods = [...new Set(families.map((x) => x.neighborhood).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const list = families.filter((item) => {
    const activist = db.activists.find((x) => x.id === item.activistId);
    const leader = db.leaderships.find((x) => x.id === item.leaderId);
    const text = `${item.name} ${item.cpf} ${activist?.name||""} ${leader?.name||""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!activistFilter || item.activistId === activistFilter) && (!leaderFilter || item.leaderId === leaderFilter) && (!neighborhoodFilter || item.neighborhood === neighborhoodFilter);
  });
  const save = async (event) => {
    event.preventDefault(); setNotice("");
    try {
      const result = await remote("/api/families", { method: "POST", body: JSON.stringify({ action: "save", ...editingFamily }) });
      setDb((current) => ({ ...current, families: current.families.map((x) => x.id === result.item.id ? result.item : x) }));
      setEditingFamily(null); setNotice("Cadastro atualizado.");
    } catch (error) { setNotice(error.message); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Excluir ${item.name} da Rede de confiança? Esta ação ficará registrada no histórico.`)) return;
    try {
      await remote("/api/families", { method: "POST", body: JSON.stringify({ action: "delete", id: item.id }) });
      setDb((current) => ({ ...current, families: current.families.filter((x) => x.id !== item.id) }));
      setNotice("Cadastro excluído.");
    } catch (error) { setNotice(error.message); }
  };
  const showHistory = async (item) => {
    try { const result = await remote("/api/families", { method: "POST", body: JSON.stringify({ action: "history", id: item.id }) }); setHistory(result.items || []); setNotice(`Histórico de ${item.name}`); }
    catch (error) { setNotice(error.message); }
  };
  return <div className="panel"><div className="page-head"><div><h2>Rede de confiança</h2><p>{admin ? "Todas as redes cadastradas no sistema." : "Redes dos ativistas vinculados à sua liderança."}</p></div></div>
    <input className="search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar por nome ou CPF..."/>
    <div className="form-grid three"><label className="field"><span>Filtrar por ativista</span><select value={activistFilter} onChange={(e)=>setActivistFilter(e.target.value)}><option value="">Todos</option>{db.activists.map((a)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{admin&&<label className="field"><span>Filtrar por liderança</span><select value={leaderFilter} onChange={(e)=>setLeaderFilter(e.target.value)}><option value="">Todas</option>{db.leaderships.map((l)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}<label className="field"><span>Filtrar por bairro</span><select value={neighborhoodFilter} onChange={(e)=>setNeighborhoodFilter(e.target.value)}><option value="">Todos</option>{neighborhoods.map((n)=><option key={n} value={n}>{n}</option>)}</select></label></div>
    {notice&&<div className="result">{notice}</div>}
    {history.length>0&&<div className="panel"><h3>Histórico básico</h3>{history.map((h)=><p key={h.id}><b>{h.action==="update"?"Edição":h.action==="delete"?"Exclusão":"Cadastro"}</b> — {new Date(h.created_at).toLocaleString("pt-BR")} — perfil {h.actor_role}</p>)}</div>}
    {editingFamily&&<form onSubmit={save} className="assessor-editor"><div className="editor-title"><h3>Editar pessoa da rede</h3><button type="button" className="back small-back" onClick={()=>setEditingFamily(null)}>Cancelar</button></div><div className="context-badge">Os vínculos com ativista e liderança serão preservados.</div><div className="form-grid"><label className="field"><span>Nome completo *</span><input required value={editingFamily.name||""} onChange={(e)=>setEditingFamily({...editingFamily,name:e.target.value.toUpperCase()})}/></label><label className="field"><span>CPF *</span><input required inputMode="numeric" maxLength={11} value={editingFamily.cpf||""} onChange={(e)=>setEditingFamily({...editingFamily,cpf:digits(e.target.value).slice(0,11)})}/></label><label className="field"><span>Telefone</span><input value={editingFamily.phone||""} onChange={(e)=>setEditingFamily({...editingFamily,phone:digits(e.target.value).slice(0,11)})}/></label><label className="field"><span>E-mail</span><input type="email" value={editingFamily.email||""} onChange={(e)=>setEditingFamily({...editingFamily,email:e.target.value})}/></label><label className="field"><span>Endereço</span><input value={editingFamily.address||""} onChange={(e)=>setEditingFamily({...editingFamily,address:e.target.value.toUpperCase()})}/></label><label className="field"><span>Bairro</span><input value={editingFamily.neighborhood||""} onChange={(e)=>setEditingFamily({...editingFamily,neighborhood:e.target.value})}/></label></div><button className="primary">Salvar alterações</button></form>}
    {list.length?list.map((item)=>{const a=db.activists.find((x)=>x.id===item.activistId),l=db.leaderships.find((x)=>x.id===item.leaderId);return <div className="assessor-admin-row" key={item.id}><div className="assessor-info"><b>{item.name}</b><small>{cpfBR(item.cpf)} • {item.neighborhood||"Sem bairro"}</small><span>Ativista: {a?.name||"Não localizado"}</span><span>Liderança: {l?.name||"Não localizada"}</span></div><div className="assessor-actions"><button className="outline" onClick={()=>{setHistory([]);setEditingFamily({...item})}}>Editar</button><button className="outline" onClick={()=>showHistory(item)}>Histórico</button><button className="danger" onClick={()=>remove(item)}>Excluir</button></div></div>}):<div className="empty">Nenhum cadastro encontrado.</div>}
  </div>;
}

function Side({ admin, view, setView, logout, newL, newA, exportExcel, exportCSV }) {
  const item = (name, label, icon) => <button className={view === name ? "active" : ""} onClick={() => setView(name)}>{icon} {label}</button>;
  return <aside className="sidebar"><div className="brand"><b>Cadastro Eleitoral</b><span>{admin ? "Coordenadora Dainara Torres" : "Área da liderança"}</span></div><div className="nav-title">Menu</div><nav>
    {item("dashboard", "Dashboard", "⌂")}
    {admin ? <>{item("leaderships", "Lideranças", "♙")}{item("archived", "Arquivados", "▤")}{item("activists", "Ativistas", "♧")}{item("trust-network", "Rede de confiança", "♡")}{item("daily-activities", "Atividades diárias", "▣")}{item("admins", "Administradores", "◉")}{item("assessors", "Assessoria", "☎")}<button onClick={newL}>＋ Nova liderança</button></>
      : <>{item("activists", "Meus ativistas", "♧")}<button onClick={newA}>＋ Adicionar ativista</button>{item("trust-network", "Rede de confiança", "♡")}{item("daily-activities", "Registro de atividade", "▣")}{item("profile", "Meu cadastro", "👤")}{item("assessors", "Contatos da assessoria", "☎")}</>}
  </nav>{admin && <><button className="export-side" onClick={exportExcel}>⇩ Exportar Excel</button><button className="export-side" onClick={exportCSV}>⇩ Exportar CSV</button></>}<button className="logout" onClick={logout}>Sair</button></aside>;
}

export default function Portal() {
  const [mode, setMode] = useState("home"), [booting, setBooting] = useState(true), [code, setCode] = useState(""), [cpf, setCpf] = useState(""), [password, setPassword] = useState(""), [msg, setMsg] = useState(""), [f, setF] = useState(EMPTY), [db, setDb] = useState(fresh()), [role, setRole] = useState(null), [leaderId, setLeaderId] = useState(null), [view, setView] = useState("dashboard"), [search, setSearch] = useState(""), [detail, setDetail] = useState(null), [editing, setEditing] = useState(null), [returnTo, setReturnTo] = useState("home"), [generatedPassword, setGeneratedPassword] = useState(""), [generatedPerson, setGeneratedPerson] = useState(null), [assessorForm, setAssessorForm] = useState(EMPTY_ASSESSOR), [editingAssessor, setEditingAssessor] = useState(null), [assessorEditorOpen, setAssessorEditorOpen] = useState(false), [editingAdmin, setEditingAdmin] = useState(null), [adminForm, setAdminForm] = useState({ name: "", email: "" });

  useEffect(() => { try { const raw = localStorage.getItem(KEY) || LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean); if (raw) { const parsed = JSON.parse(raw); setDb({ ...fresh(), ...parsed, assessors: Array.isArray(parsed.assessors) ? parsed.assessors : [] }); } } catch (e) { console.error(e); } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error(e); } }, [db]);
  useEffect(() => { try { if (mode === "leader-credentials" && !generatedPerson) { const raw = sessionStorage.getItem(`${KEY}-new-leadership`); if (raw) { const saved = JSON.parse(raw); setGeneratedPerson(saved.person || null); setGeneratedPassword(String(saved.password || saved.person?.password || "")); } } } catch (e) { console.error(e); } }, [mode, generatedPerson]);

  const remote = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a operação.");
    return payload;
  };
  const loadRemote = async () => {
    const payload = await remote("/api/data");
    setDb({ ...fresh(), ...payload.db });
    return payload;
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { session } = await remote("/api/auth");
        await loadRemote();
        if (!active) return;
        setRole(session.role);
        setLeaderId(session.role === "leader" ? session.id : null);
        setView("dashboard");
        setMode(session.role === "admin" ? "admin-area" : "leader-area");
      } catch {
        if (active) setMode("home");
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => { active = false; };
  }, []);
  const go = (next) => { setMode(next); setMsg(""); };
  const logout = async () => {
    try { await remote("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch {}
    setRole(null); setLeaderId(null); setCpf(""); setPassword(""); setCode(""); setSearch(""); setDetail(null); setView("dashboard"); go("home");
  };
  const leader = db.leaderships.find((x) => x.id === leaderId), mine = db.activists.filter((x) => x.leaderId === leaderId);
  const leaders = useMemo(() => db.leaderships.filter((x) => `${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())), [db.leaderships, search]);
  const archivedLeaders = useMemo(() => db.archivedLeaderships.filter((x) => `${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())), [db.archivedLeaderships, search]);
  const acts = useMemo(() => db.activists.filter((x) => `${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())), [db.activists, search]);

  const enterAdmin = async () => {
    if (!cpfOK(cpf) || password.length < 8) return setMsg("Informe CPF e senha de administrador.");
    try {
      const logged = await remote("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", role: "admin", cpf, password }) });
      await loadRemote(); setRole("admin"); setLeaderId(null); setView("dashboard"); go("admin-area");
    } catch (error) { setMsg(error.message); }
  };
  const enterLeader = async () => {
    if (!cpfOK(cpf) || password.length !== 8) return setMsg("Informe CPF e a senha de 8 dígitos.");
    try {
      const logged = await remote("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", role: "leader", cpf, password }) });
      await loadRemote(); setRole("leader"); setLeaderId(logged.person.id); setView("dashboard"); go("leader-area");
    } catch (error) { setMsg(error.message); }
  };
  const release = (admin) => { setF(EMPTY); setEditing(null); setReturnTo(admin ? "admin-area" : "home"); go(admin ? "admin-reg" : "leader-reg"); };

  const saveLeader = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !cpfOK(f.cpf) || !titleOK(f.title)) return setMsg("Confira nome, CPF e título de eleitor.");
    try {
      const isAdmin = role === "admin";
      const result = await remote(isAdmin ? "/api/data" : "/api/auth", { method: "POST", body: JSON.stringify(isAdmin ? { action: "save-leadership", ...f, pixname: f.name, id: editing?.id } : { action: "register-leadership", ...f, pixname: f.name, setupCode: code }) });
      const x = result.item || result.person;
      setDb((d) => ({ ...d, leaderships: editing ? d.leaderships.map((a) => a.id === x.id ? x : a) : [...d.leaderships, x] }));
      setLeaderId(x.id); setEditing(null); setF(EMPTY);
      if (!editing) { setGeneratedPerson(x); setGeneratedPassword(result.temporaryPassword || ""); go("leader-credentials"); }
      else { setView("dashboard"); go(returnTo); }
    } catch (error) { setMsg(error.message); }
  };
  const saveAct = async (e) => {
    e.preventDefault();
    if (!leaderId || !f.name.trim() || !cpfOK(f.cpf) || !titleOK(f.title)) return setMsg("Confira liderança, nome, CPF e título de eleitor.");
    try {
      const result = await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "save-activist", ...f, pixname: f.name, id: editing?.id, leaderId }) });
      const x = result.item;
      setDb((d) => ({ ...d, activists: editing ? d.activists.map((a) => a.id === x.id ? x : a) : [...d.activists, x] }));
      setEditing(null); setF(EMPTY); setView("activists"); go(returnTo);
    } catch (error) { setMsg(error.message); }
  };
  const startL = () => { setF(EMPTY); setEditing(null); setReturnTo(role === "admin" ? "admin-area" : "home"); go("leader-form"); };
  const startA = (lid = leaderId) => { setLeaderId(lid || null); setF(EMPTY); setEditing(null); setReturnTo(role === "admin" ? "admin-area" : "leader-area"); go("activist-form"); };
  const edit = (x, k) => { setF({ ...EMPTY, ...x }); setEditing(x); setLeaderId(x.leaderId || leaderId); setReturnTo(role === "admin" ? "admin-area" : "leader-area"); go(k === "leader" ? "leader-form" : "activist-form"); };

  const startAssessor = () => { setEditingAssessor(null); setAssessorForm({ ...EMPTY_ASSESSOR }); setMsg(""); setAssessorEditorOpen(true); setView("assessors"); };
  const editAssessor = (a) => { setEditingAssessor(a); setAssessorForm({ ...EMPTY_ASSESSOR, ...a }); setAssessorEditorOpen(true); setMsg(""); };
  const cancelAssessor = () => { setEditingAssessor(null); setAssessorForm(EMPTY_ASSESSOR); setAssessorEditorOpen(false); };
  const saveAssessor = async (e) => {
    e.preventDefault();
    if (!assessorForm.name.trim()) return setMsg("Informe o nome do contato da assessoria.");
    try {
      const result = await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "save-assessor", ...assessorForm, id: editingAssessor?.id }) });
      const item = result.item;
      setDb((d) => ({ ...d, assessors: editingAssessor ? d.assessors.map((a) => a.id === item.id ? item : a) : [...d.assessors, item] }));
      setMsg(editingAssessor ? "Contato da assessoria atualizado." : "Contato da assessoria adicionado."); cancelAssessor();
    } catch (error) { setMsg(error.message); }
  };
  const removeAssessor = async (id) => {
    if (!window.confirm("Excluir este contato da assessoria? Ele deixará de aparecer para as lideranças.")) return;
    try { await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "delete-assessor", id }) }); setDb((d) => ({ ...d, assessors: d.assessors.filter((a) => a.id !== id) })); setMsg("Contato removido."); }
    catch (error) { setMsg(error.message); }
  };
  const archiveLeadership = async (item) => {
    if (!window.confirm(`Arquivar a liderança ${item.name}? O acesso será bloqueado imediatamente, mas o cadastro poderá ser restaurado.`)) return;
    try {
      const result = await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "archive-leadership", id: item.id }) });
      setDb((current) => ({
        ...current,
        leaderships: current.leaderships.filter((leader) => leader.id !== item.id),
        archivedLeaderships: [result.item, ...current.archivedLeaderships.filter((leader) => leader.id !== item.id)],
        activists: current.activists.filter((activist) => activist.leaderId !== item.id),
        archivedActivists: [...current.activists.filter((activist) => activist.leaderId === item.id), ...current.archivedActivists],
        families: current.families.filter((family) => family.leaderId !== item.id),
        archivedFamilies: [...current.families.filter((family) => family.leaderId === item.id), ...current.archivedFamilies]
      }));
      setDetail(null); setSearch(""); setView("archived"); setMsg("Liderança arquivada. O acesso dela foi bloqueado.");
    } catch (error) { setMsg(error.message); }
  };
  const restoreLeadership = async (item) => {
    if (!window.confirm(`Restaurar a liderança ${item.name}? Ela poderá entrar novamente com a senha existente.`)) return;
    try {
      const result = await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "restore-leadership", id: item.id }) });
      setDb((current) => ({
        ...current,
        leaderships: [result.item, ...current.leaderships.filter((leader) => leader.id !== item.id)],
        archivedLeaderships: current.archivedLeaderships.filter((leader) => leader.id !== item.id),
        activists: [...current.archivedActivists.filter((activist) => activist.leaderId === item.id), ...current.activists],
        archivedActivists: current.archivedActivists.filter((activist) => activist.leaderId !== item.id),
        families: [...current.archivedFamilies.filter((family) => family.leaderId === item.id), ...current.families],
        archivedFamilies: current.archivedFamilies.filter((family) => family.leaderId !== item.id)
      }));
      setMsg("Liderança restaurada. O acesso foi liberado novamente.");
    } catch (error) { setMsg(error.message); }
  };
  const deleteLeadership = async (item) => {
    const warning = `Excluir definitivamente ${item.name}? Também serão excluídos os ativistas, a Rede de confiança e os registros de atividade vinculados. Esta ação não pode ser desfeita.`;
    if (!window.confirm(warning) || !window.confirm("Confirme mais uma vez a exclusão definitiva desta liderança e de todos os dados vinculados.")) return;
    try {
      await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "delete-leadership", id: item.id }) });
      setDb((current) => ({
        ...current,
        leaderships: current.leaderships.filter((leader) => leader.id !== item.id),
        archivedLeaderships: current.archivedLeaderships.filter((leader) => leader.id !== item.id),
        activists: current.activists.filter((activist) => activist.leaderId !== item.id),
        archivedActivists: current.archivedActivists.filter((activist) => activist.leaderId !== item.id),
        families: current.families.filter((family) => family.leaderId !== item.id),
        archivedFamilies: current.archivedFamilies.filter((family) => family.leaderId !== item.id)
      }));
      setDetail(null); setView("archived"); setMsg("Liderança e dados vinculados excluídos definitivamente.");
    } catch (error) { setMsg(error.message); }
  };
  const editAdmin = (item) => { setEditingAdmin(item); setAdminForm({ name: item.name || "", email: item.email || "" }); setMsg(""); };
  const cancelAdminEdit = () => { setEditingAdmin(null); setAdminForm({ name: "", email: "" }); };
  const saveAdminProfile = async (e) => {
    e.preventDefault();
    if (!adminForm.name.trim()) return setMsg("Informe o nome do administrador.");
    try {
      const result = await remote("/api/data", { method: "POST", body: JSON.stringify({ action: "save-admin-profile", id: editingAdmin.id, ...adminForm }) });
      setDb((current) => ({ ...current, admins: current.admins.map((item) => item.id === result.item.id ? result.item : item) }));
      cancelAdminEdit(); setMsg("Dados do administrador atualizados.");
    } catch (error) { setMsg(error.message); }
  };
  const saveAdmin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await remote("/api/auth", { method: "POST", body: JSON.stringify({ action: "setup-admin", setupCode: code, name: fd.get("name"), cpf: fd.get("cpf"), email: fd.get("email"), password: fd.get("password") }) });
      await loadRemote(); setRole("admin"); setLeaderId(null); setView("dashboard"); go("admin-area");
    } catch (error) { setMsg(error.message); }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx-js-style"), wb = XLSX.utils.book_new();
      const PINK="E59AB2",LIGHT="F8DCE7",PALE="FFF5F8",BORDER="E8C7D2",TEXT="49383F",WHITE="FFFFFF",LINK="A64F6D";
      const border={top:{style:"thin",color:{rgb:BORDER}},bottom:{style:"thin",color:{rgb:BORDER}},left:{style:"thin",color:{rgb:BORDER}},right:{style:"thin",color:{rgb:BORDER}}};
      const title={font:{name:"Aptos Display",sz:18,bold:true,color:{rgb:WHITE}},fill:{fgColor:{rgb:PINK}},alignment:{horizontal:"center",vertical:"center"},border};
      const subtitle={font:{name:"Aptos",sz:10,italic:true,color:{rgb:"8A707A"}},fill:{fgColor:{rgb:PALE}},alignment:{vertical:"center"},border};
      const section={font:{name:"Aptos",sz:12,bold:true,color:{rgb:TEXT}},fill:{fgColor:{rgb:LIGHT}},alignment:{vertical:"center"},border};
      const header={font:{name:"Aptos",sz:10,bold:true,color:{rgb:WHITE}},fill:{fgColor:{rgb:PINK}},alignment:{horizontal:"center",vertical:"center",wrapText:true},border};
      const cell={font:{name:"Aptos",sz:10,color:{rgb:TEXT}},alignment:{vertical:"center",wrapText:true},border};
      const link={...cell,font:{name:"Aptos",sz:10,bold:true,color:{rgb:LINK},underline:true}};
      const metric={font:{name:"Aptos",sz:20,bold:true,color:{rgb:PINK}},fill:{fgColor:{rgb:PALE}},alignment:{horizontal:"center",vertical:"center"},border};
      const metricLabel={font:{name:"Aptos",sz:10,bold:true,color:{rgb:TEXT}},fill:{fgColor:{rgb:LIGHT}},alignment:{horizontal:"center",vertical:"center"},border};
      const styleRange=(ws,range,style)=>{const r=XLSX.utils.decode_range(range);for(let y=r.s.r;y<=r.e.r;y++)for(let x=r.s.c;x<=r.e.c;x++){const a=XLSX.utils.encode_cell({r:y,c:x});if(!ws[a])ws[a]={t:"s",v:""};ws[a].s=style;}};
      const nav=(ws,a,label,target)=>ws[a]={t:"s",v:label,s:link,l:{Target:`#'${target}'!A1`,Tooltip:`Ir para ${target}`}};
      const textCols=(ws,row,cols)=>cols.forEach(c=>{const a=XLSX.utils.encode_cell({r:row,c});if(ws[a]){ws[a].t="s";ws[a].v=String(ws[a].v??"");}});
      const add=(ws,name)=>XLSX.utils.book_append_sheet(wb,ws,name);
      const panel=XLSX.utils.aoa_to_sheet([["CADASTRO ELEITORAL • COORDENADORA DAINARA TORRES"],[`Exportado em ${new Date().toLocaleString("pt-BR")}`],[""],["RESUMO"],["Lideranças cadastradas",db.leaderships.length],["Ativistas cadastrados",db.activists.length],["Administradores cadastrados",db.admins.length],["Contatos da assessoria",db.assessors.length],[""],["NAVEGAÇÃO"],["Lideranças"],["Ativistas"],["Administradores"],["Assessoria"]]);
      panel["!cols"]=[{wch:34},{wch:24},{wch:24},{wch:24}];panel["A1"].s=title;panel["A2"].s=subtitle;styleRange(panel,"A4:B4",section);[5,6,7,8].forEach(r=>{panel[`A${r}`].s=metricLabel;panel[`B${r}`].s=metric;});panel["A10"].s=section;nav(panel,"A11","Lideranças →","LIDERANÇAS");nav(panel,"A12","Ativistas →","ATIVISTAS");nav(panel,"A13","Administradores →","ADMINISTRADORES");nav(panel,"A14","Assessoria →","ASSESSORIA");panel["!merges"]=[{s:{r:0,c:0},e:{r:0,c:3}},{s:{r:1,c:0},e:{r:1,c:3}},{s:{r:3,c:0},e:{r:3,c:3}},{s:{r:9,c:0},e:{r:9,c:3}}];panel["!freeze"]={xSplit:0,ySplit:4};add(panel,"PAINEL");
      const lHeader=["Nome completo","Data de nascimento","CPF","Telefone","Endereço","Nome da mãe","E-mail","Bairro","CEP","Título de eleitor","Zona","Seção","Chave Pix","Titular Pix","Banco","Qtd. ativistas"];const lData=[["LIDERANÇAS"],["Cadastro completo das lideranças vinculadas à coordenação."],[""],lHeader,...db.leaderships.map(l=>[l.name,dateBR(l.birth),cpfBR(l.cpf),phoneBR(l.phone),l.address,l.mother,l.email,l.neighborhood,cepBR(l.cep),l.title,l.zone,l.section,l.pix,l.pixname,l.bank,db.activists.filter(a=>a.leaderId===l.id).length])];const ls=XLSX.utils.aoa_to_sheet(lData);ls["!cols"]=[30,18,18,18,32,30,30,20,14,18,10,10,28,25,20,16].map(wch=>({wch}));ls["A1"].s=title;ls["A2"].s=subtitle;styleRange(ls,"A4:P4",header);for(let r=4;r<lData.length;r++){for(let c=0;c<16;c++){const a=XLSX.utils.encode_cell({r,c});if(ls[a])ls[a].s=c===0?link:cell;}textCols(ls,r,[1,2,3,8,9,10,11]);}ls["!freeze"]={xSplit:0,ySplit:4};ls["!autofilter"]={ref:`A4:P${Math.max(4,lData.length)}`};nav(ls,"A2","← Voltar ao painel","PAINEL");add(ls,"LIDERANÇAS");
      const aHeader=["Liderança","Nome completo","Data de nascimento","CPF","Telefone","Endereço","Nome da mãe","E-mail","Bairro","CEP","Título de eleitor","Zona","Seção","Chave Pix","Titular Pix","Banco"];const aData=[["ATIVISTAS POR LIDERANÇA"],["Equipes separadas visualmente para não misturar ativistas entre lideranças."],[""],aHeader];[...db.leaderships].sort((a,b)=>String(a.name).localeCompare(String(b.name),"pt-BR")).forEach(l=>{aData.push([`LIDERANÇA: ${l.name}`]);const team=db.activists.filter(a=>a.leaderId===l.id).sort((a,b)=>String(a.name).localeCompare(String(b.name),"pt-BR"));if(team.length)team.forEach(a=>aData.push([l.name,a.name,dateBR(a.birth),cpfBR(a.cpf),phoneBR(a.phone),a.address,a.mother,a.email,a.neighborhood,cepBR(a.cep),a.title,a.zone,a.section,a.pix,a.pixname,a.bank]));else aData.push([l.name,"Nenhum ativista vinculado"]);});const as=XLSX.utils.aoa_to_sheet(aData);as["!cols"]=[30,30,18,18,18,32,30,30,20,14,18,10,10,28,25,20].map(wch=>({wch}));as["A1"].s=title;as["A2"].s=subtitle;styleRange(as,"A4:P4",header);as["!merges"]=[{s:{r:0,c:0},e:{r:0,c:15}},{s:{r:1,c:0},e:{r:1,c:15}}];for(let r=4;r<aData.length;r++){const first=String(as[`A${r+1}`]?.v||"");if(first.startsWith("LIDERANÇA:")){styleRange(as,`A${r+1}:P${r+1}`,section);as["!merges"].push({s:{r,c:0},e:{r,c:15}});}else{for(let c=0;c<16;c++){const a=XLSX.utils.encode_cell({r,c});if(as[a])as[a].s=cell;}textCols(as,r,[2,3,4,9,10,11,12]);}}as["!freeze"]={xSplit:0,ySplit:4};as["!autofilter"]={ref:`A4:P${Math.max(4,aData.length)}`};nav(as,"A2","← Voltar ao painel","PAINEL");add(as,"ATIVISTAS");
      const adData=[["ADMINISTRADORES"],["Administradores autorizados no sistema."],[""],["Nome completo","CPF","E-mail","Data do cadastro"],...db.admins.map(a=>[a.name,cpfBR(a.cpf),a.email,new Date(a.created).toLocaleString("pt-BR")])];const ad=XLSX.utils.aoa_to_sheet(adData);ad["!cols"]=[32,20,34,24].map(wch=>({wch}));ad["A1"].s=title;ad["A2"].s=subtitle;styleRange(ad,"A4:D4",header);for(let r=4;r<adData.length;r++){styleRange(ad,`A${r+1}:D${r+1}`,cell);textCols(ad,r,[1]);}ad["!freeze"]={xSplit:0,ySplit:4};ad["!autofilter"]={ref:`A4:D${Math.max(4,adData.length)}`};nav(ad,"A2","← Voltar ao painel","PAINEL");add(ad,"ADMINISTRADORES");
      const scData=[["ASSESSORIA"],["Contatos disponibilizados pela coordenação às lideranças."],[""],["Nome","Função / descrição","Telefone","E-mail","Observações"],...db.assessors.map(a=>[a.name,a.role,a.phone,a.email,a.notes])];const sc=XLSX.utils.aoa_to_sheet(scData);sc["!cols"]=[34,30,22,36,50].map(wch=>({wch}));sc["A1"].s=title;sc["A2"].s=subtitle;styleRange(sc,"A4:E4",header);for(let r=4;r<scData.length;r++)styleRange(sc,`A${r+1}:E${r+1}`,cell);sc["!freeze"]={xSplit:0,ySplit:4};sc["!autofilter"]={ref:`A4:E${Math.max(4,scData.length)}`};nav(sc,"A2","← Voltar ao painel","PAINEL");add(sc,"ASSESSORIA");
      XLSX.writeFile(wb,`cadastro-eleitoral-dainara-${new Date().toISOString().slice(0,10)}.xlsx`,{bookType:"xlsx",compression:true});setMsg("Excel exportado com painel, navegação, filtros e equipes separadas.");
    } catch(e) { console.error(e); setMsg("Não foi possível gerar o Excel. Tente novamente."); }
  };

  const exportCSV = () => { const h=["Liderança","Nome completo","Data de nascimento","CPF","Telefone","Endereço","Nome da mãe","E-mail","Bairro","CEP","Título de eleitor","Zona","Seção","Chave Pix","Titular Pix","Banco"];const rows=[];db.leaderships.forEach(l=>db.activists.filter(a=>a.leaderId===l.id).forEach(a=>rows.push([l.name,a.name,dateBR(a.birth),cpfBR(a.cpf),phoneBR(a.phone),a.address,a.mother,a.email,a.neighborhood,cepBR(a.cep),a.title,a.zone,a.section,a.pix,a.pixname,a.bank])));const csv=[h,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\r\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`cadastro-eleitoral-dainara-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);setMsg("CSV exportado."); };

  if(booting) return <main className="shell"><section className="card auth-card"><h2>Carregando…</h2><p>Verificando sua sessão.</p></section></main>;
  if(mode==="home") return <main className="shell"><section className="hero"><b>Cadastro Eleitoral</b><h1>Coordenadora Dainara Torres</h1><p>Portal de acesso, cadastro e gestão de lideranças e ativistas.</p><div className="actions"><button onClick={()=>go("leader-access")}>Já sou liderança</button><button onClick={()=>go("leader-release")}>Se torne liderança</button><button className="outline" onClick={()=>go("admin-access")}>Acesso administrativo</button><button className="outline" onClick={()=>go("admin-release")}>Se tornar administrador</button></div><div className="home-note">Cadastros protegidos e armazenados no sistema.</div></section></main>;
  if(["leader-access","admin-access","leader-release","admin-release"].includes(mode)){const admin=mode.includes("admin"),rel=mode.includes("release");return <Access admin={admin} release={rel} cpf={cpf} setCpf={setCpf} password={password} setPassword={setPassword} code={code} setCode={setCode} msg={msg} onBack={()=>go("home")} onEnter={()=>rel?release(admin):(admin?enterAdmin():enterLeader())} onSwitch={()=>go(rel?(admin?"admin-access":"leader-access"):(admin?"admin-release":"leader-release"))}/>;}
  if(mode==="admin-reg") return <AdminReg back={()=>go("admin-area")} save={saveAdmin} msg={msg}/>;
  if(mode==="leader-reg") return <Form kind="liderança" f={f} setF={setF} save={saveLeader} back={()=>go(returnTo)} msg={msg} edit={Boolean(editing)} admin={false} leaderships={db.leaderships} leaderId={leaderId} setLeaderId={setLeaderId}/>;
  if(mode==="leader-credentials") return <Credential person={generatedPerson} password={generatedPassword} onAccess={()=>{setRole("leader");setLeaderId(generatedPerson?.id||null);setView("dashboard");go("leader-area");}} onBack={()=>go("home")}/>;
  if(mode==="leader-form") return <Form kind="liderança" f={f} setF={setF} save={saveLeader} back={()=>go(returnTo)} msg={msg} edit={Boolean(editing)} admin={role==="admin"} leaderships={db.leaderships} leaderId={leaderId} setLeaderId={setLeaderId}/>;
  if(mode==="activist-form") return <Form kind="ativista" f={f} setF={setF} save={saveAct} back={()=>go(returnTo)} msg={msg} edit={Boolean(editing)} admin={role==="admin"} leaderships={db.leaderships} leaderId={leaderId} setLeaderId={setLeaderId}/>;

  const admin=role==="admin", areaMode=admin?"admin-area":"leader-area";
  if(mode!==areaMode){ go(areaMode); return null; }
  const title=admin?"Área Administrativa":`Olá, ${leader?.name||"Liderança"}`;
  let content=null;
  if(view==="dashboard") content=admin?<><div className="cards"><div className="metric"><div className="label">Lideranças</div><div className="value">{db.leaderships.length}</div></div><div className="metric"><div className="label">Ativistas</div><div className="value">{db.activists.length}</div></div><div className="metric"><div className="label">Administradores</div><div className="value">{db.admins.length}</div></div><div className="metric"><div className="label">Assessoria</div><div className="value">{db.assessors.length}</div></div></div><div className="quick-grid"><button className="quick" onClick={()=>setView("leaderships")}><b>♙ Lideranças</b><span>Visualizar e gerenciar todas as lideranças.</span></button><button className="quick" onClick={()=>setView("activists")}><b>♧ Ativistas</b><span>Consultar ativistas e suas lideranças responsáveis.</span></button><button className="quick" onClick={()=>setView("assessors")}><b>☎ Assessoria</b><span>Adicionar e editar os contatos mostrados às lideranças.</span></button><button className="quick" onClick={()=>go("admin-release")}><b>＋ Novo administrador</b><span>Liberar um novo cadastro com o código de teste.</span></button></div><div className="panel"><div className="page-head"><div><h2>Visão geral</h2><p>Gerencie os cadastros e mantenha as equipes separadas por liderança.</p></div><button className="primary" onClick={startL}>＋ Nova liderança</button></div></div><ManausCoverageMap db={db}/></> : <><div className="cards"><div className="metric"><div className="label">Meus ativistas</div><div className="value">{mine.length}</div></div><div className="metric"><div className="label">Meu cadastro</div><div className="value">✓</div></div></div><div className="quick-grid"><button className="quick" onClick={()=>setView("activists")}><b>♧ Meus ativistas</b><span>Veja somente os ativistas vinculados à sua liderança.</span></button><button className="quick" onClick={()=>startA()}><b>＋ Adicionar ativista</b><span>Cadastre um novo ativista vinculado a você.</span></button><button className="quick" onClick={()=>setView("profile")}><b>👤 Meu cadastro</b><span>Consulte e edite seus próprios dados.</span></button><button className="quick" onClick={()=>setView("assessors")}><b>☎ Assessoria</b><span>Veja os contatos disponibilizados pela coordenação.</span></button><button className="quick" onClick={async()=>{const link=window.location.origin + "/familia?lideranca=" + encodeURIComponent(leaderId||"");try{await navigator.clipboard.writeText(link);setMsg("Link da Rede de confiança copiado. Compartilhe-o com os ativistas da sua liderança.");}catch{setMsg("Não foi possível copiar o link automaticamente.");}}}><b>♡ Copiar link da Rede de confiança</b><span>Compartilhe este link com os ativistas vinculados à sua liderança.</span></button></div></>;
  else if(view==="leaderships"&&admin) content=<div className="panel"><div className="page-head"><div><h2>Lideranças</h2><p>Todas as lideranças cadastradas pela coordenação.</p></div><button className="primary" onClick={startL}>＋ Nova liderança</button></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, CPF ou título..."/>{leaders.length?leaders.map(l=><div className="list-item clickable" key={l.id} onClick={()=>{setDetail(l.id);setView("leadership-detail")}}><div><b>{l.name}</b><small>{cpfBR(l.cpf)} • Título {l.title}</small></div><span>{db.activists.filter(a=>a.leaderId===l.id).length} ativista(s) →</span></div>):<div className="empty">Nenhuma liderança encontrada.</div>}</div>;
  else if(view==="archived"&&admin) content=<div className="panel"><div className="page-head"><div><h2>Arquivados</h2><p>Lideranças com acesso bloqueado. Restaure o cadastro ou faça a exclusão definitiva.</p></div></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar arquivados por nome, CPF ou título..."/>{archivedLeaders.length?archivedLeaders.map(l=><div className="assessor-admin-row" key={l.id}><div className="assessor-info"><b>{l.name}</b><small>{cpfBR(l.cpf)} • Título {l.title||"—"}</small><span>Arquivado em {l.archivedAt?new Date(l.archivedAt).toLocaleString("pt-BR"):"—"}</span><span>{db.archivedActivists.filter(a=>a.leaderId===l.id).length} ativista(s) vinculado(s)</span></div><div className="assessor-actions"><button className="outline" onClick={()=>restoreLeadership(l)}>Restaurar</button><button className="danger" onClick={()=>deleteLeadership(l)}>Excluir definitivamente</button></div></div>):<div className="empty">Nenhuma liderança arquivada.</div>}</div>;
  else if(view==="activists"){const list=admin?acts:mine.filter(a=>`${a.name} ${a.cpf} ${a.title}`.toLowerCase().includes(search.toLowerCase()));content=<div className="panel"><div className="page-head"><div><h2>{admin?"Ativistas":"Meus ativistas"}</h2><p>{admin?"A liderança aparece em cada linha para não misturar equipes.":`Liderança: ${leader?.name||"não cadastrada"}`}</p></div><button className="primary" onClick={()=>startA()}>＋ Adicionar ativista</button></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, CPF ou título..."/>{list.length?list.map(a=>{const l=db.leaderships.find(x=>x.id===a.leaderId);return <div className="list-item clickable activist-row" key={a.id} onClick={()=>{setDetail(a.id);setView("activist-detail")}}><div><b>{a.name}</b><small>{cpfBR(a.cpf)} • Título {a.title}</small></div><span className="leader-tag">👤 {l?.name||"Sem liderança"}</span></div>}):<div className="empty">Nenhum ativista encontrado.</div>}</div>}
  else if(view==="trust-network") content=<TrustNetworkManager db={db} setDb={setDb} admin={admin} remote={remote}/>;
  else if(view==="daily-activities") content=<ActivityRecords admin={admin}/>;
  else if(view==="leadership-detail"&&admin){const l=db.leaderships.find(x=>x.id===detail),team=db.activists.filter(x=>x.leaderId===detail);content=<Detail title="Liderança" person={l} onBack={()=>setView("leaderships")} onEdit={()=>edit(l,"leader")} actions={<><button className="outline" onClick={()=>archiveLeadership(l)}>Arquivar</button><button className="danger" onClick={()=>deleteLeadership(l)}>Excluir</button></>} credential={<AdminLeadershipCredential person={l} onReset={async () => { const password = makePassword(); try { await remote("/api/auth", { method: "POST", body: JSON.stringify({ action: "reset-leadership-password", leadershipId: l.id, password }) }); setMsg("Nova senha gerada. Copie-a e entregue à liderança."); return password; } catch (error) { setMsg(error.message); return ""; } }} />} team={<div className="panel team-panel"><div className="page-head"><div><h3>Ativistas vinculados: {team.length}</h3><p>Equipe delimitada para facilitar a gestão.</p></div><button className="primary" onClick={()=>startA(l?.id)}>＋ Adicionar ativista</button></div>{team.length?team.map(a=><div className="list-item clickable" key={a.id} onClick={()=>{setDetail(a.id);setView("activist-detail")}}><div><b>{a.name}</b><small>{cpfBR(a.cpf)} • Título {a.title}</small></div><span>Ver cadastro →</span></div>):<div className="empty">Nenhum ativista vinculado.</div>}</div>}/>}
  else if(view==="activist-detail"){const a=db.activists.find(x=>x.id===detail),l=db.leaderships.find(x=>x.id===a?.leaderId);content=<Detail title="Cadastro do ativista" person={a} leader={l?.name} onBack={()=>setView("activists")} onEdit={()=>edit(a,"activist")}/>;}
  else if(view==="profile"&&!admin) content=<Detail title="Meu cadastro" person={leader} onBack={()=>setView("dashboard")} onEdit={()=>leader&&edit(leader,"leader")}/>;
  else if(view==="assessors"&&admin) content=<div className="panel"><div className="page-head"><div><h2>Contatos da assessoria</h2><p>Cadastre aqui os contatos que aparecerão automaticamente na Área da Liderança.</p></div><button type="button" className="primary" onClick={() => { setMsg(""); setEditingAssessor(null); setAssessorForm({ ...EMPTY_ASSESSOR }); setAssessorEditorOpen(true); setView("assessors"); }}>＋ Adicionar contato</button></div>{assessorEditorOpen&&<div className="assessor-modal-backdrop" role="dialog" aria-modal="true"><div className="assessor-modal"><AssessorForm form={assessorForm} setForm={setAssessorForm} save={saveAssessor} cancel={cancelAssessor} editing={editingAssessor}/></div></div>} {!assessorEditorOpen&&!db.assessors.length&&<div className="empty assessor-empty">Nenhum contato cadastrado. Clique em <b>“Adicionar contato”</b> para incluir o primeiro.</div>}{db.assessors.map(a=><div className="assessor-admin-row" key={a.id}><div className="assessor-info"><b>{a.name}</b>{a.role&&<small>{a.role}</small>}{a.phone&&<span>☎ {a.phone}</span>}{a.email&&<span>✉ {a.email}</span>}{a.notes&&<em>{a.notes}</em>}</div><div className="assessor-actions"><button className="outline" onClick={()=>editAssessor(a)}>Editar</button><button className="danger" onClick={()=>removeAssessor(a.id)}>Excluir</button></div></div>)}</div>;
  else if(view==="assessors"&&!admin) content=<div className="panel"><h2>Contatos da assessoria</h2><p>Contatos disponibilizados pela coordenação.</p>{!db.assessors.length?<div className="empty">Nenhum contato da assessoria foi cadastrado ainda.</div>:db.assessors.map(a=><div className="contact-card" key={a.id}><b>{a.name}</b>{a.role&&<strong>{a.role}</strong>}{a.phone&&<span>☎ {a.phone}</span>}{a.email&&<span>✉ {a.email}</span>}{a.notes&&<span>{a.notes}</span>}</div>)}</div>;
  else if(view==="admins"&&admin) content=<div className="panel"><div className="page-head"><div><h2>Administradores</h2><p>Qualquer administrador pode atualizar nome e e-mail. CPF e senha permanecem protegidos.</p></div><button className="primary" onClick={()=>go("admin-release")}>＋ Novo administrador</button></div>{editingAdmin&&<div className="assessor-modal-backdrop" role="dialog" aria-modal="true"><div className="assessor-modal"><form onSubmit={saveAdminProfile}><h3>Editar administrador</h3><label className="field"><span>Nome completo *</span><input required value={adminForm.name} onChange={(e)=>setAdminForm((current)=>({...current,name:e.target.value}))}/></label><label className="field"><span>E-mail</span><input type="email" value={adminForm.email} onChange={(e)=>setAdminForm((current)=>({...current,email:e.target.value}))}/></label><label className="field"><span>CPF</span><input value={cpfBR(editingAdmin.cpf)} disabled/></label><p className="auth-note">A senha não é exibida nem alterada nesta tela.</p><div className="assessor-actions"><button type="button" className="outline" onClick={cancelAdminEdit}>Cancelar</button><button className="primary">Salvar alterações</button></div></form></div></div>}{db.admins.length?db.admins.map(a=><div className="assessor-admin-row" key={a.id}><div className="assessor-info"><b>{a.name}</b><small>{cpfBR(a.cpf)} • {a.email||"Sem e-mail"}</small><span>Cadastrado em {new Date(a.created).toLocaleDateString("pt-BR")}</span></div><div className="assessor-actions"><button className="outline" onClick={()=>editAdmin(a)}>Editar</button></div></div>):<div className="empty">Nenhum administrador cadastrado.</div>}</div>;
  else content=<div className="panel empty">Selecione uma opção no menu.</div>;
  if(view==="dashboard") content=<>{content}<div className="panel activity-dashboard-callout"><div><span className="activity-callout-icon">▣</span><h2>{admin?"Atividades diárias das lideranças":"Registro de atividade diária"}</h2><p>{admin?"Visualize as imagens e descrições enviadas pelas lideranças e defira os registros analisados.":"Registre as atividades do dia com descrição, imagens em grupo, reuniões, visitas e abordagens."}</p></div><button className="primary" onClick={()=>setView("daily-activities")}>{admin?"Analisar registros":"Registrar atividade"}</button></div></>;

  return <div className="app-shell"><Side admin={admin} view={view} setView={v=>{setSearch("");setDetail(null);setView(v)}} logout={logout} newL={startL} newA={()=>startA()} exportExcel={exportExcel} exportCSV={exportCSV}/><div className="main"><header className="topbar"><div><h1>{title}</h1><p>{admin?"Visão geral dos cadastros e equipes.":"Gerencie somente os ativistas vinculados à sua liderança."}</p></div>{admin&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="outline top-export" onClick={exportExcel}>⇩ Exportar Excel</button><button className="outline top-export" onClick={exportCSV}>⇩ Exportar CSV</button></div>}</header><main className="content">{msg&&<div className="result">{msg}</div>}{content}</main></div></div>;
}
