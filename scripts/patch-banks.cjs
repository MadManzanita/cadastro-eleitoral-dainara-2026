const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app/portal/page.js');
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('PIX_BANKS')) {
  source = source.replace(
    '"use client";',
    '"use client";\n\nimport { PIX_BANKS } from "../data/banks";'
  );
}

if (!source.includes('function BankField({')) {
  const marker = 'function Form({ kind, f, setF, save, back, msg, edit, admin, leaderships, leaderId, setLeaderId }) {';
  const index = source.indexOf(marker);
  if (index < 0) throw new Error('Form marker not found; bank patch aborted');

  const component = `function BankField({ f, setF }) {
  const [otherSelected, setOtherSelected] = useState(() => Boolean(f.bank && !PIX_BANKS.includes(f.bank)));
  useEffect(() => {
    if (f.bank && !PIX_BANKS.includes(f.bank)) setOtherSelected(true);
  }, [f.bank]);
  const selected = otherSelected ? "__OUTROS__" : (PIX_BANKS.includes(f.bank) ? f.bank : "");
  return <div className="bank-field-wrap">
    <label className="field"><span>Banco / instituição Pix</span><select value={selected} onChange={(e) => {
      const value = e.target.value;
      if (value === "__OUTROS__") {
        setOtherSelected(true);
        setF((x) => ({ ...x, bank: "" }));
      } else {
        setOtherSelected(false);
        setF((x) => ({ ...x, bank: value }));
      }
    }}>
      <option value="">Selecione o banco / instituição</option>
      {PIX_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
      <option value="__OUTROS__">Outros</option>
    </select></label>
    {otherSelected && <label className="field"><span>Nome do banco / instituição</span><input value={f.bank || ""} onChange={(e) => setF((x) => ({ ...x, bank: e.target.value }))} placeholder="Digite o nome da instituição" /></label>}
  </div>;
}

`;
  source = source.slice(0, index) + component + source.slice(index);
}

const oldField = '<Field f={f} setF={setF} n="bank" label="Banco"/>';
if (source.includes(oldField)) {
  source = source.replace(oldField, '<BankField f={f} setF={setF}/>');
}

fs.writeFileSync(file, source);
console.log('Bank selection patched successfully.');
