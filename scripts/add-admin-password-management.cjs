const fs = require('fs');
const path = 'app/portal/page.js';
let s = fs.readFileSync(path, 'utf8');

// Add a small reusable administrator-only credential panel immediately before Detail().
if (!s.includes('function AdminLeadershipCredential')) {
  const marker = '\nfunction Detail({ person, title, leader, onBack, onEdit, team }) {';
  const panel = `\nfunction AdminLeadershipCredential({ person, onReset }) {\n  if (!person?.password) return <div className="panel"><h3>Credencial de acesso</h3><p><b>Senha:</b> Não registrada para esta liderança.</p><button type="button" className="outline" onClick={onReset}>Gerar nova senha</button></div>;\n  const [shown, setShown] = useState(false);\n  return <div className="panel credential-admin"><div className="page-head"><div><h3>Credencial de acesso</h3><p>Visível somente na área administrativa.</p></div><button type="button" className="outline" onClick={() => setShown(v => !v)}>{shown ? 'Ocultar senha' : 'Visualizar senha'}</button></div><div className="credential-box"><div className="credential-item"><span>CPF</span><b>{cpfBR(person.cpf)}</b></div><div className="credential-item"><span>SENHA</span><strong>{shown ? person.password : '••••••••'}</strong></div></div><button type="button" className="outline" onClick={onReset}>Gerar nova senha</button></div>;\n}\n`;
  if (!s.includes(marker)) throw new Error('Detail marker not found');
  s = s.replace(marker, panel + marker);
}

// Put the credential panel into the leadership detail page. The replacement is intentionally
// based on the component invocation rather than a whole-file rewrite.
const oldDetail = '<Detail person={selected} title="Liderança" leader={null} onBack={() => setSelected(null)} onEdit={() => editLeadership(selected.id)} team={team} />';
const newDetail = '<Detail person={selected} title="Liderança" leader={null} onBack={() => setSelected(null)} onEdit={() => editLeadership(selected.id)} team={team} />';
// Detail itself is patched below if the exact invocation exists; otherwise leave the file intact.

// Add the credential panel directly to the Detail component before its closing section.
const needle = '{leader && <div className="context-badge">Liderança: <b>{leader}</b></div>}';
if (s.includes(needle) && !s.includes('AdminLeadershipCredential person={person}')) {
  s = s.replace(needle, needle + '{title === "Liderança" && <AdminLeadershipCredential person={person} onReset={() => window.dispatchEvent(new CustomEvent("reset-leadership-password", { detail: person.id }))} />}');
}

// Wire the reset event once in the portal component, without changing the existing data model.
if (!s.includes('reset-leadership-password')) throw new Error('Credential panel insertion failed');
if (!s.includes('const resetLeadershipPassword')) {
  const anchor = 'const save=next=>{setDb(next);localStorage.setItem(KEY,JSON.stringify(next))};';
  if (!s.includes(anchor)) throw new Error('Portal save function anchor not found');
  const fn = anchor + '\n const resetLeadershipPassword=(id)=>{const password=makePassword();const next={...db,leaderships:db.leaderships.map(l=>l.id===id?{...l,password}:l)};save(next);alert(`Nova senha gerada: ${password}`);};\n useEffect(()=>{const h=e=>resetLeadershipPassword(e.detail);window.addEventListener("reset-leadership-password",h);return()=>window.removeEventListener("reset-leadership-password",h)},[db]);';
  s = s.replace(anchor, fn);
}

fs.writeFileSync(path, s);
console.log('Admin leadership password management patched.');
