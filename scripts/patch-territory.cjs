const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app/portal/page.js');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('app/data/territories')) {
  source = source.replace('"use client";', '"use client";\nimport { AMAZONAS_MUNICIPALITIES, AMAZONAS_TERRITORIES, getManausZone } from "../data/territories";');
}

const replacement = String.raw`function TerritoryFields({ f, setF }) {
  const municipality = f.municipality || "";
  const neighborhoods = municipality ? (AMAZONAS_TERRITORIES[municipality] || []) : [];
  const isManaus = municipality === "Manaus";
  const zone = isManaus ? getManausZone(f.neighborhood || "") : "";

  return <>
    <h3>Localização territorial</h3>
    <div className="form-grid three">
      <label className="field"><span>Município *</span><select required value={municipality} onChange={(e) => setF((x) => ({ ...x, municipality: e.target.value, neighborhood: "", zone: "" }))}><option value="">Selecione o município</option>{AMAZONAS_MUNICIPALITIES.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label className="field"><span>Bairro / localidade *</span><select required disabled={!municipality} value={f.neighborhood || ""} onChange={(e) => setF((x) => ({ ...x, neighborhood: e.target.value, zone: municipality === "Manaus" ? getManausZone(e.target.value) : "" }))}><option value="">{municipality ? "Selecione o bairro/localidade" : "Selecione primeiro o município"}</option>{neighborhoods.map((b) => <option key={b} value={b}>{b}</option>)}</select></label>
      {isManaus ? <label className="field"><span>Zona de Manaus</span><input readOnly value={zone} placeholder="Detectada automaticamente"/></label> : <label className="field"><span>Zona de Manaus</span><input readOnly value="—" placeholder="Somente para Manaus"/></label>}
    </div>
    {municipality !== "Manaus" && <div className="territory-note">Para municípios do interior, o campo utiliza a categoria <b>Bairro / localidade</b>. A base oficial do IBGE registra 469 bairros no Amazonas no Censo 2022, mas nem todos os municípios possuem bairros legalmente instituídos; por isso o sistema não inventa denominações.</div>}
  </>;
}

function Form({ kind, f, setF, save, back, msg, edit, admin, leaderships, leaderId, setLeaderId }) {
  return <main className="shell"><section className="card wide"><button className="back" onClick={back}>← Voltar</button><h2>{edit ? \`Editar \${kind}\` : \`Cadastro de \${kind}\`}</h2><p>Preencha os dados e salve o cadastro.</p><form onSubmit={save}>
    <h3>Dados pessoais</h3><div className="form-grid"><Field f={f} setF={setF} n="name" label="Nome completo" required/><Field f={f} setF={setF} n="birth" label="Data de nascimento" type="date"/><Field f={f} setF={setF} n="cpf" label="CPF" required placeholder="000.000.000-00"/><Field f={f} setF={setF} n="phone" label="Celular / telefone" placeholder="(00) 00000-0000"/><Field f={f} setF={setF} n="address" label="Endereço"/><Field f={f} setF={setF} n="mother" label="Nome da mãe"/><Field f={f} setF={setF} n="email" label="E-mail" type="email"/><Field f={f} setF={setF} n="cep" label="CEP" placeholder="00000-000"/></div>
    <TerritoryFields f={f} setF={setF}/>
    {kind === "ativista" && admin && <><h3>Vínculo</h3><div className="form-grid"><label className="field"><span>Liderança responsável *</span><select required value={leaderId || ""} onChange={(e) => setLeaderId(e.target.value)}><option value="">Selecione a liderança</option>{leaderships.map((l) => <option key={l.id} value={l.id}>{l.name} — CPF {cpfBR(l.cpf)}</option>)}</select></label></div></>}
    <h3>Dados eleitorais</h3><div className="form-grid three"><Field f={f} setF={setF} n="title" label="Título de eleitor" required placeholder="000000000000"/><Field f={f} setF={setF} n="zone" label="Zona eleitoral"/><Field f={f} setF={setF} n="section" label="Seção eleitoral"/></div>
    <div className="validation-row"><button type="button" className="outline" onClick={() => setF((x) => ({ ...x, _validation: \`\${cpfOK(x.cpf) ? "✓ CPF válido" : "✗ CPF inválido"} • \${titleOK(x.title) ? "✓ Título válido" : "✗ Título inválido"}\` }))}>Validar CPF e título</button><a className="tse" href={TSE} target="_blank" rel="noreferrer">Consultar situação no TSE ↗</a></div>
    <h3>Dados de pagamento</h3><div className="form-grid three"><Field f={f} setF={setF} n="pix" label="Chave Pix"/><Field f={f} setF={setF} n="pixname" label="Nome do titular"/><Field f={f} setF={setF} n="bank" label="Banco"/></div>
    {f._validation && <div className="result">{f._validation}</div>}{msg && <div className="result">{msg}</div>}<button className="primary submit">{edit ? "Salvar alterações" : \`Cadastrar \${kind}\`}</button>
  </form></section></main>;
}

function Access`;

const formPattern = /function Form\([\s\S]*?\n}\n\nfunction Access/;
if (!formPattern.test(source)) throw new Error('Form function not found; patch aborted');
source = source.replace(formPattern, replacement);

source = source.replace(/<p><b>Bairro:<\/b> \{person\.neighborhood \|\| "—"\}<\/p>/, '<p><b>Município:</b> {person.municipality || "—"}</p><p><b>Bairro / localidade:</b> {person.neighborhood || "—"}</p>{person.municipality === "Manaus" && <p><b>Zona de Manaus:</b> {person.zone || getManausZone(person.neighborhood) || "—"}</p>}');

fs.writeFileSync(file, source);
console.log('Territorial form patched successfully.');
`;
