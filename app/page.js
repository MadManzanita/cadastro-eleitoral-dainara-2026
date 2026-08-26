"use client";
import {useEffect,useMemo,useState} from "react";
const CODE="328974",TSE="https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral",KEY="cadastro-eleitoral-dainara-2026-v6";
const EMPTY={name:"",birth:"",cpf:"",phone:"",address:"",mother:"",email:"",neighborhood:"",cep:"",title:"",zone:"",section:"",pix:"",pixname:"",bank:""};
const digits=v=>String(v||"").replace(/\D/g,"");
const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const cpfOK=v=>{const c=digits(v);if(c.length!==11||/^(\d)\1+$/.test(c))return false;let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);let d=s*10%11;if(d===10)d=0;if(d!==+c[9])return false;s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);d=s*10%11;if(d===10)d=0;return d===+c[10]};
const titleOK=v=>digits(v).length===8;
const dateBR=v=>v?v.split("-").reverse().join("/"):"—";
const cpfBR=v=>{const d=digits(v);return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4"):v||"—"};
const cepBR=v=>{const d=digits(v);return d.length===8?d.replace(/(\d{5})(\d{3})/,"$1-$2"):v||"—"};
const fresh=()=>({leaderships:[],activists:[],admins:[],assessors:[{id:"a1",name:"Assessoria da Coordenadora",phone:"Contato cadastrado pela administração",email:"Contato interno"}]});
function Field({f,setF,n,label,type="text",required=false,placeholder}){return <label className="field"><span>{label}{required?" *":""}</span><input type={type} required={required} value={f[n]||""} placeholder={placeholder} inputMode={["cpf","cep","title"].includes(n)?"numeric":undefined} onChange={e=>{let v=e.target.value;if(["cpf","cep","title"].includes(n))v=digits(v).slice(0,n==="title"?8:n==="cpf"?11:8);setF(x=>({...x,[n]:v}))}}/></label>}
function Form({kind,f,setF,save,back,msg,edit}){return <main className="shell"><section className="card wide"><button className="back" onClick={back}>← Voltar</button><h2>{edit?`Editar ${kind}`:`Cadastro de ${kind}`}</h2><p>Preencha todos os dados necessários para o cadastro.</p><form onSubmit={save}><h3>Dados pessoais</h3><div className="form-grid"><Field f={f} setF={setF} n="name" label="Nome completo" required/><Field f={f} setF={setF} n="birth" label="Data de nascimento" type="date"/><Field f={f} setF={setF} n="cpf" label="CPF" required placeholder="00000000000"/><Field f={f} setF={setF} n="phone" label="Telefone" placeholder="(00) 00000-0000"/><Field f={f} setF={setF} n="address" label="Endereço"/><Field f={f} setF={setF} n="mother" label="Nome da mãe"/><Field f={f} setF={setF} n="email" label="E-mail" type="email"/><Field f={f} setF={setF} n="neighborhood" label="Bairro"/><Field f={f} setF={setF} n="cep" label="CEP" placeholder="00000000"/></div><h3>Dados eleitorais</h3><div className="form-grid three"><Field f={f} setF={setF} n="title" label="Título de eleitor" required placeholder="00000000"/><Field f={f} setF={setF} n="zone" label="Zona"/><Field f={f} setF={setF} n="section" label="Seção"/></div><div className="validation-row"><button type="button" className="outline" onClick={()=>setF(x=>({...x,_validation:`${cpfOK(x.cpf)?"✓ CPF válido":"✗ CPF inválido"} • ${titleOK(x.title)?"✓ Título com formato válido":"✗ Título inválido"}`}))}>Validar CPF e título</button><a className="tse" href={TSE} target="_blank" rel="noreferrer">Consultar situação no TSE ↗</a></div><h3>Dados de pagamento</h3><div className="form-grid three"><Field f={f} setF={setF} n="pix" label="Chave Pix"/><Field f={f} setF={setF} n="pixname" label="Nome do titular"/><Field f={f} setF={setF} n="bank" label="Banco"/></div>{f._validation&&<div className="result">{f._validation}</div>}{msg&&<div className="result">{msg}</div>}<button className="primary submit">{edit?"Salvar alterações":`Cadastrar ${kind}`}</button></form></section></main>}
function Access({admin,release,code,setCode,msg,onEnter,onBack,onSwitch}){return <main className="shell"><section className="card auth-card"><button className="back" onClick={onBack}>← Voltar</button><h2>{release?(admin?"Se tornar administrador":"Se torne liderança"):(admin?"Acesso administrativo":"Já sou liderança")}</h2><p>{release?"Informe o código de liberação para continuar.":admin?"Acesse a gestão centralizada de lideranças e ativistas.":"Acesse somente sua equipe e seus ativistas vinculados."}</p><label className="field"><span>Código de acesso</span><input autoFocus inputMode="numeric" maxLength={6} value={code} placeholder="000000" onChange={e=>setCode(digits(e.target.value).slice(0,6))} onKeyDown={e=>e.key==="Enter"&&onEnter()}/></label><button className="primary" onClick={onEnter}>{release?"Continuar":"Entrar"}</button>{msg&&<div className="result">{msg}</div>}<div className="auth-note">Código de teste: <b>328974</b></div><button className="link-button" onClick={onSwitch}>{release?(admin?"Voltar ao acesso administrativo":"Já sou liderança"):(admin?"Se tornar administrador":"Se torne liderança")}</button></section></main>}
function AdminReg({back,save,msg}){return <main className="shell"><section className="card auth-card"><button className="back" onClick={back}>← Voltar</button><h2>Se tornar administrador</h2><p>Cadastro liberado pelo código de teste.</p><form onSubmit={save}><label className="field"><span>Nome completo *</span><input name="name" required/></label><label className="field"><span>CPF *</span><input name="cpf" required maxLength={11} inputMode="numeric"/></label><label className="field"><span>E-mail</span><input name="email" type="email"/></label>{msg&&<div className="result">{msg}</div>}<button className="primary">Concluir cadastro</button></form></section></main>}
function Detail({person,title,leader,onBack,onEdit,team}){if(!person)return <main className="shell"><section className="card"><button className="back" onClick={onBack}>← Voltar</button><div className="empty">Cadastro não encontrado.</div></section></main>;return <main className="shell"><section className="card wide"><div className="page-head"><div><button className="back" onClick={onBack}>← Voltar</button><h2>{title}</h2></div><button className="primary" onClick={onEdit}>Editar cadastro</button></div>{leader&&<div className="context-badge">Liderança: <b>{leader}</b></div>}<div className="detail-grid"><div className="panel"><h3>Dados pessoais</h3><p><b>Nome:</b> {person.name}</p><p><b>Nascimento:</b> {dateBR(person.birth)}</p><p><b>CPF:</b> {cpfBR(person.cpf)}</p><p><b>Telefone:</b> {person.phone||"—"}</p><p><b>E-mail:</b> {person.email||"—"}</p><p><b>Nome da mãe:</b> {person.mother||"—"}</p><p><b>Endereço:</b> {person.address||"—"}</p><p><b>Bairro:</b> {person.neighborhood||"—"}</p><p><b>CEP:</b> {cepBR(person.cep)}</p></div><div className="panel"><h3>Dados eleitorais</h3><p><b>Título:</b> {person.title}</p><p><b>Zona:</b> {person.zone||"—"}</p><p><b>Seção:</b> {person.section||"—"}</p><h3>Dados de pagamento</h3><p><b>Pix:</b> {person.pix||"—"}</p><p><b>Titular:</b> {person.pixname||"—"}</p><p><b>Banco:</b> {person.bank||"—"}</p></div></div>{team}</section></main>}
function Side({admin,view,setView,logout,newL,newA,exportExcel}){return <aside className="sidebar"><div className="brand"><b>Cadastro Eleitoral</b><span>{admin?"Coordenadora Dainara Torres":"Área da liderança"}</span></div><div className="nav-title">Menu</div><nav><button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}>⌂ Dashboard</button>{admin?<><button className={view==="leaderships"?"active":""} onClick={()=>setView("leaderships")}>♙ Lideranças</button><button className={view==="activists"?"active":""} onClick={()=>setView("activists")}>♧ Ativistas</button><button className={view==="admins"?"active":""} onClick={()=>setView("admins")}>◉ Administradores</button><button onClick={newL}>＋ Nova liderança</button></>:<><button className={view==="activists"?"active":""} onClick={()=>setView("activists")}>♧ Meus ativistas</button><button onClick={newA}>＋ Adicionar ativista</button><button className={view==="profile"?"active":""} onClick={()=>setView("profile")}>👤 Meu cadastro</button><button className={view==="assessors"?"active":""} onClick={()=>setView("assessors")}>☎ Contatos da assessoria</button>}</nav>{admin&&<button className="export-side" onClick={exportExcel}>⇩ Exportar Excel</button>}<button className="logout" onClick={logout}>Sair</button></aside>}
export default function Home(){
 const [mode,setMode]=useState("home"),[code,setCode]=useState(""),[msg,setMsg]=useState(""),[f,setF]=useState(EMPTY),[db,setDb]=useState(fresh()),[role,setRole]=useState(null),[leaderId,setLeaderId]=useState(null),[view,setView]=useState("dashboard"),[search,setSearch]=useState(""),[detail,setDetail]=useState(null),[editing,setEditing]=useState(null),[returnTo,setReturnTo]=useState("home");
 useEffect(()=>{try{const x=localStorage.getItem(KEY);if(x)setDb({...fresh(),...JSON.parse(x)})}catch{}},[]);useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}},[db]);
 const go=m=>{setMode(m);setMsg("");setCode("")};const leader=db.leaderships.find(x=>x.id===leaderId);const mine=db.activists.filter(x=>x.leaderId===leaderId);const leaders=useMemo(()=>db.leaderships.filter(x=>`${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())),[db.leaderships,search]);const acts=useMemo(()=>db.activists.filter(x=>`${x.name} ${x.cpf} ${x.title}`.toLowerCase().includes(search.toLowerCase())),[db.activists,search]);
 const enter=admin=>{if(code!==CODE)return setMsg("Código inválido. Para o teste, use 328974.");setRole(admin?"admin":"leader");if(!admin&&!leaderId)setLeaderId(db.leaderships.at(-1)?.id||null);setView("dashboard");go(admin?"admin-area":"leader-area")};
 const release=admin=>{if(code!==CODE)return setMsg("Código inválido. Para o teste, use 328974.");setF(EMPTY);setReturnTo(admin?"admin-area":"leader-area");go(admin?"admin-reg":"leader-reg")};
 const saveLeader=e=>{e.preventDefault();if(!f.name.trim())return setMsg("Informe o nome completo.");if(!cpfOK(f.cpf))return setMsg("Informe um CPF válido.");if(!titleOK(f.title))return setMsg("O título deve conter exatamente 8 dígitos.");const x={...f,id:editing?.id||id(),created:editing?.created||Date.now(),updated:Date.now()};delete x._validation;setDb(d=>({...d,leaderships:editing?d.leaderships.map(a=>a.id===x.id?x:a):[...d.leaderships,x]}));setLeaderId(x.id);setEditing(null);setF(EMPTY);setRole(returnTo==="admin-area"?"admin":"leader");setView("dashboard");go(returnTo)};
 const saveAct=e=>{e.preventDefault();if(!leaderId)return setMsg("Nenhuma liderança selecionada.");if(!f.name.trim())return setMsg("Informe o nome completo.");if(!cpfOK(f.cpf))return setMsg("Informe um CPF válido.");if(!titleOK(f.title))return setMsg("O título deve conter exatamente 8 dígitos.");const x={...f,id:editing?.id||id(),leaderId,created:editing?.created||Date.now(),updated:Date.now()};delete x._validation;setDb(d=>({...d,activists:editing?d.activists.map(a=>a.id===x.id?x:a):[...d.activists,x]}));setEditing(null);setF(EMPTY);setView("activists");go(returnTo)};
 const startL=()=>{setF(EMPTY);setEditing(null);setReturnTo(role==="admin"?"admin-area":"home");go("leader-form")};const startA=(lid=leaderId)=>{setLeaderId(lid||null);setF(EMPTY);setEditing(null);setReturnTo(role==="admin"?"admin-area":"leader-area");go("activist-form")};const edit=(x,k)=>{setF({...EMPTY,...x});setEditing(x);setReturnTo(role==="admin"?"admin-area":"leader-area");go(k==="leader"?"leader-form":"activist-form")};
 const registerAdmin=e=>{e.preventDefault();const d=new FormData(e.currentTarget),name=String(d.get("name")||"").trim(),cpf=String(d.get("cpf")||"").trim(),email=String(d.get("email")||"").trim();if(!name||!cpfOK(cpf))return setMsg("Informe nome e um CPF válido.");setDb(x=>({...x,admins:[...x.admins,{id:id(),name,cpf,email,created:Date.now()}]}));setRole("admin");setView("dashboard");go("admin-area")};
 const exportExcel = async () => {
  try {
    const XLSX = await import("xlsx-js-style");

    const wb = XLSX.utils.book_new();

    /* =========================================================
       CORES DO MODELO
    ========================================================= */

    const PINK = "E59AB2";
    const LIGHT_PINK = "F8DCE7";
    const VERY_LIGHT_PINK = "FFF5F8";
    const BORDER = "E8C7D2";
    const TEXT = "49383F";
    const WHITE = "FFFFFF";
    const MUTED = "8A707A";

    const thinBorder = {
      top: { style: "thin", color: { rgb: BORDER } },
      bottom: { style: "thin", color: { rgb: BORDER } },
      left: { style: "thin", color: { rgb: BORDER } },
      right: { style: "thin", color: { rgb: BORDER } }
    };

    const titleStyle = {
      font: {
        name: "Aptos Display",
        sz: 18,
        bold: true,
        color: { rgb: WHITE }
      },
      fill: {
        fgColor: { rgb: PINK }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: thinBorder
    };

    const subtitleStyle = {
      font: {
        name: "Aptos",
        sz: 10,
        italic: true,
        color: { rgb: MUTED }
      },
      fill: {
        fgColor: { rgb: VERY_LIGHT_PINK }
      },
      alignment: {
        vertical: "center"
      }
    };

    const sectionStyle = {
      font: {
        name: "Aptos",
        sz: 12,
        bold: true,
        color: { rgb: TEXT }
      },
      fill: {
        fgColor: { rgb: LIGHT_PINK }
      },
      alignment: {
        vertical: "center"
      },
      border: thinBorder
    };

    const headerStyle = {
      font: {
        name: "Aptos",
        sz: 10,
        bold: true,
        color: { rgb: WHITE }
      },
      fill: {
        fgColor: { rgb: PINK }
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      },
      border: thinBorder
    };

    const cellStyle = {
      font: {
        name: "Aptos",
        sz: 10,
        color: { rgb: TEXT }
      },
      alignment: {
        vertical: "center",
        wrapText: true
      },
      border: thinBorder
    };

    const linkStyle = {
      ...cellStyle,
      font: {
        name: "Aptos",
        sz: 10,
        bold: true,
        color: { rgb: "A64F6D" },
        underline: true
      }
    };

    const metricStyle = {
      font: {
        name: "Aptos",
        sz: 20,
        bold: true,
        color: { rgb: PINK }
      },
      fill: {
        fgColor: { rgb: VERY_LIGHT_PINK }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: thinBorder
    };

    const metricLabelStyle = {
      font: {
        name: "Aptos",
        sz: 10,
        bold: true,
        color: { rgb: TEXT }
      },
      fill: {
        fgColor: { rgb: LIGHT_PINK }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: thinBorder
    };

    /* =========================================================
       FUNÇÕES AUXILIARES
    ========================================================= */

    const text = value => {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      return String(value);
    };

    const countActivists = leadershipId =>
      db.activists.filter(a => a.leaderId === leadershipId).length;

    const leadershipName = leadershipId =>
      db.leaderships.find(l => l.id === leadershipId)?.name || "Sem liderança";

    /*
      Mantém CPF, título, CEP, telefone, zona e seção como TEXTO.
      Isso evita:
      06701559263 -> 6,70156E+10
      00000000 -> 0
      CEP -> #######
    */

    const forceText = value => ({
      t: "s",
      v: text(value),
      s: cellStyle
    });

    const makeSheet = (data, widths) => {
      const ws = XLSX.utils.aoa_to_sheet(data);

      ws["!cols"] = widths.map(w => ({
        wch: w
      }));

      ws["!rows"] = data.map(() => ({
        hpt: 22
      }));

      return ws;
    };

    const styleRange = (ws, range, style) => {
      const ref = XLSX.utils.decode_range(range);

      for (let r = ref.s.r; r <= ref.e.r; r++) {
        for (let c = ref.s.c; c <= ref.e.c; c++) {
          const address = XLSX.utils.encode_cell({
            r,
            c
          });

          if (!ws[address]) {
            ws[address] = {
              t: "s",
              v: ""
            };
          }

          ws[address].s = style;
        }
      }
    };

    const addNavigation = (ws, row, column, label, target) => {
      const address = XLSX.utils.encode_cell({
        r: row,
        c: column
      });

      ws[address] = {
        t: "s",
        v: label,
        s: linkStyle,
        l: {
          Target: `#'${target}'!A1`,
          Tooltip: `Ir para ${target}`
        }
      };
    };

    /* =========================================================
       1. PAINEL
    ========================================================= */

    const painelData = [
      ["CADASTRO ELEITORAL • COORDENADORA DAINARA TORRES"],
      ["Painel geral de cadastro e gestão"],
      [""],
      ["RESUMO"],
      ["Lideranças cadastradas", db.leaderships.length],
      ["Ativistas cadastrados", db.activists.length],
      ["Administradores cadastrados", db.admins.length],
      [""],
      ["NAVEGAÇÃO"],
      ["Ir para Lideranças"],
      ["Ir para Ativistas"],
      ["Ir para Administradores"]
    ];

    const painel = makeSheet(
      painelData,
      [34, 24, 24, 24, 24]
    );

    painel["A1"].s = titleStyle;
    painel["A2"].s = subtitleStyle;

    styleRange(painel, "A4:B4", sectionStyle);

    for (let r = 4; r <= 7; r++) {
      if (painel[`A${r}`]) {
        painel[`A${r}`].s = metricLabelStyle;
      }

      if (painel[`B${r}`]) {
        painel[`B${r}`].s = metricStyle;
      }
    }

    painel["A9"].s = sectionStyle;

    addNavigation(painel, 9, 0, "Lideranças", "Lideranças");
    addNavigation(painel, 10, 0, "Ativistas", "Ativistas");
    addNavigation(painel, 11, 0, "Administradores", "Administradores");

    painel["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 4 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 4 }
      },
      {
        s: { r: 3, c: 0 },
        e: { r: 3, c: 4 }
      },
      {
        s: { r: 8, c: 0 },
        e: { r: 8, c: 4 }
      }
    ];

    painel["!freeze"] = {
      xSplit: 0,
      ySplit: 4
    };

    XLSX.utils.book_append_sheet(wb, painel, "Painel");

    /* =========================================================
       2. LIDERANÇAS
    ========================================================= */

    const liderancasData = [
      ["LIDERANÇAS"],
      ["Cadastro completo das lideranças vinculadas à coordenação."],
      [""],
      [
        "Nome completo",
        "Data de nascimento",
        "CPF",
        "Telefone",
        "Endereço",
        "Nome da mãe",
        "E-mail",
        "Bairro",
        "CEP",
        "Título de eleitor",
        "Zona",
        "Seção",
        "Chave Pix",
        "Titular Pix",
        "Banco",
        "Qtd. ativistas",
        "Ver ativistas"
      ]
    ];

    db.leaderships.forEach(l => {
      liderancasData.push([
        text(l.name),
        text(l.birth),
        text(l.cpf),
        text(l.phone),
        text(l.address),
        text(l.mother),
        text(l.email),
        text(l.neighborhood),
        text(l.cep),
        text(l.title),
        text(l.zone),
        text(l.section),
        text(l.pix),
        text(l.pixname),
        text(l.bank),
        countActivists(l.id),
        "Ver ativistas"
      ]);
    });

    const liderancas = makeSheet(
      liderancasData,
      [
        30, 18, 18, 18, 32, 30, 30, 20,
        14, 18, 10, 10, 28, 25, 20, 15, 18
      ]
    );

    liderancas["A1"].s = titleStyle;
    liderancas["A2"].s = subtitleStyle;

    styleRange(
      liderancas,
      "A4:Q4",
      headerStyle
    );

    for (let r = 4; r < liderancasData.length; r++) {
      for (let c = 0; c < 17; c++) {
        const address = XLSX.utils.encode_cell({
          r,
          c
        });

        if (!liderancas[address]) continue;

        liderancas[address].s =
          c === 16 ? linkStyle : cellStyle;
      }

      /*
        Força os campos sensíveis como texto.
      */

      [1, 2, 3, 8, 9, 10, 11].forEach(c => {
        const address = XLSX.utils.encode_cell({
          r,
          c
        });

        if (liderancas[address]) {
          liderancas[address].t = "s";
          liderancas[address].v =
            text(liderancas[address].v);
        }
      });

      const leadership = db.leaderships[r - 4];

      if (leadership) {
        const address = XLSX.utils.encode_cell({
          r,
          c: 16
        });

        liderancas[address].l = {
          Target: "#'Ativistas'!A1",
          Tooltip: `Ver ativistas de ${leadership.name}`
        };
      }
    }

    liderancas["!freeze"] = {
      xSplit: 0,
      ySplit: 4
    };

    liderancas["!autofilter"] = {
      ref: `A4:Q${Math.max(4, liderancasData.length)}`
    };

    XLSX.utils.book_append_sheet(
      wb,
      liderancas,
      "Lideranças"
    );

    /* =========================================================
       3. ATIVISTAS
       ========================================================= */

    const ativistasData = [
      ["ATIVISTAS"],
      ["Ativistas organizados e identificados por liderança."],
      [""]
    ];

    /*
      Cabeçalho.
    */

    const activistHeader = [
      "Liderança",
      "Nome completo",
      "Data de nascimento",
      "CPF",
      "Telefone",
      "Endereço",
      "Nome da mãe",
      "E-mail",
      "Bairro",
      "CEP",
      "Título de eleitor",
      "Zona",
      "Seção",
      "Chave Pix",
      "Titular Pix",
      "Banco"
    ];

    ativistasData.push(activistHeader);

    /*
      Ordena por liderança para evitar que os ativistas
      fiquem misturados.
    */

    const sortedActivists = [...db.activists].sort((a, b) => {
      const la = leadershipName(a.leaderId);
      const lb = leadershipName(b.leaderId);

      return la.localeCompare(lb, "pt-BR") ||
        text(a.name).localeCompare(
          text(b.name),
          "pt-BR"
        );
    });

    let lastLeader = null;

    sortedActivists.forEach(a => {
      const currentLeader =
        leadershipName(a.leaderId);

      /*
        Linha separadora quando muda a liderança.
      */

      if (currentLeader !== lastLeader) {
        ativistasData.push([
          `LIDERANÇA: ${currentLeader}`
        ]);

        lastLeader = currentLeader;
      }

      ativistasData.push([
        currentLeader,
        text(a.name),
        text(a.birth),
        text(a.cpf),
        text(a.phone),
        text(a.address),
        text(a.mother),
        text(a.email),
        text(a.neighborhood),
        text(a.cep),
        text(a.title),
        text(a.zone),
        text(a.section),
        text(a.pix),
        text(a.pixname),
        text(a.bank)
      ]);
    });

    const ativistas = makeSheet(
      ativistasData,
      [
        30, 30, 18, 18, 18, 32, 30, 30,
        20, 14, 18, 10, 10, 28, 25, 20
      ]
    );

    ativistas["A1"].s = titleStyle;
    ativistas["A2"].s = subtitleStyle;

    styleRange(
      ativistas,
      "A4:P4",
      headerStyle
    );

    /*
      Mesclagem visual do título.
    */

    ativistas["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 15 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 15 }
      }
    ];

    /*
      Identifica linhas de separação por liderança.
    */

    for (let r = 4; r < ativistasData.length; r++) {
      const firstCell =
        ativistas[XLSX.utils.encode_cell({
          r,
          c: 0
        })];

      if (
        firstCell &&
        text(firstCell.v).startsWith("LIDERANÇA:")
      ) {
        for (let c = 0; c < 16; c++) {
          const address = XLSX.utils.encode_cell({
            r,
            c
          });

          if (!ativistas[address]) {
            ativistas[address] = {
              t: "s",
              v: ""
            };
          }

          ativistas[address].s = sectionStyle;
        }

        ativistas[`A${r + 1}`].s =
          sectionStyle;

        /*
          Mescla a linha inteira.
        */

        if (!ativistas["!merges"]) {
          ativistas["!merges"] = [];
        }

        ativistas["!merges"].push({
          s: { r, c: 0 },
          e: { r, c: 15 }
        });

      } else {
        for (let c = 0; c < 16; c++) {
          const address =
            XLSX.utils.encode_cell({
              r,
              c
            });

          if (ativistas[address]) {
            ativistas[address].s =
              cellStyle;
          }
        }

        /*
          Campos que precisam permanecer como texto.
        */

        [2, 3, 4, 9, 10, 11, 12].forEach(c => {
          const address =
            XLSX.utils.encode_cell({
              r,
              c
            });

          if (ativistas[address]) {
            ativistas[address].t = "s";
            ativistas[address].v =
              text(ativistas[address].v);
          }
        });
      }
    }

    ativistas["!freeze"] = {
      xSplit: 0,
      ySplit: 4
    };

    XLSX.utils.book_append_sheet(
      wb,
      ativistas,
      "Ativistas"
    );

    /* =========================================================
       4. ADMINISTRADORES
    ========================================================= */

    const adminsData = [
      ["ADMINISTRADORES"],
      ["Administradores autorizados no sistema."],
      [""],
      [
        "Nome completo",
        "CPF",
        "E-mail",
        "Data do cadastro"
      ]
    ];

    db.admins.forEach(a => {
      adminsData.push([
        text(a.name),
        text(a.cpf),
        text(a.email),
        a.created
          ? new Date(a.created).toLocaleString(
              "pt-BR"
            )
          : ""
      ]);
    });

    const admins = makeSheet(
      adminsData,
      [32, 20, 34, 24]
    );

    admins["A1"].s = titleStyle;
    admins["A2"].s = subtitleStyle;

    styleRange(
      admins,
      "A4:D4",
      headerStyle
    );

    for (let r = 4; r < adminsData.length; r++) {
      for (let c = 0; c < 4; c++) {
        const address =
          XLSX.utils.encode_cell({
            r,
            c
          });

        if (admins[address]) {
          admins[address].s =
            cellStyle;
        }
      }

      /*
        CPF sempre como texto.
      */

      const cpfCell = admins[
        XLSX.utils.encode_cell({
          r,
          c: 1
        })
      ];

      if (cpfCell) {
        cpfCell.t = "s";
        cpfCell.v = text(cpfCell.v);
      }
    }

    admins["!freeze"] = {
      xSplit: 0,
      ySplit: 4
    };

    XLSX.utils.book_append_sheet(
      wb,
      admins,
      "Administradores"
    );

    /* =========================================================
       CONFIGURAÇÕES FINAIS
    ========================================================= */

    /*
      Ativa filtros onde faz sentido.
    */

    if (liderancasData.length > 4) {
      liderancas["!autofilter"] = {
        ref: `A4:Q${liderancasData.length}`
      };
    }

    /*
      Define o painel como primeira aba.
    */

    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Sheets =
      wb.Workbook.Sheets || [];

    /*
      Exportação XLSX.
    */

    XLSX.writeFile(
      wb,
      `cadastro-eleitoral-dainara-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

  } catch (error) {
    console.error(
      "Erro ao exportar Excel:",
      error
    );

    setMsg(
      "Não foi possível gerar o arquivo Excel. Verifique o console para mais detalhes."
    );
  }
};
 const lh=["Nome completo","Data de nascimento","CPF","Telefone","Endereço","Nome da mãe","E-mail","Bairro","CEP","Título de eleitor","Zona","Seção","Chave Pix","Nome do titular","Banco","Qtd. ativistas"];const wsL=XLSX.utils.aoa_to_sheet([["LIDERANÇAS"],[],lh]);wsL["!merges"]=[{s:{r:0,c:0},e:{r:0,c:15}}];style(wsL,"A1:P1",title);style(wsL,"A3:P3",header);nav(wsL,2,"← Voltar ao painel","PAINEL");db.leaderships.forEach((l,i)=>{const r=4+i;const row=[l.name,dateBR(l.birth),cpfBR(l.cpf),l.phone,l.address,l.mother,l.email,l.neighborhood,cepBR(l.cep),l.title,l.zone,l.section,l.pix,l.pixname,l.bank,db.activists.filter(a=>a.leaderId===l.id).length];XLSX.utils.sheet_add_aoa(wsL,[row],{origin:{r:r-1,c:0}});style(wsL,`A${r}:P${r}`,cell);wsL[`A${r}`].s=link;wsL[`A${r}`].l={Target:`#'ATIVISTAS'!A1`,Tooltip:`Ativistas de ${l.name}`}});wsL["!cols"]=[{wch:28},{wch:18},{wch:18},{wch:18},{wch:32},{wch:28},{wch:30},{wch:20},{wch:14},{wch:18},{wch:10},{wch:10},{wch:28},{wch:24},{wch:18},{wch:15}];wsL["!freeze"]={xSplit:0,ySplit:3};wsL["!autofilter"]={ref:`A3:P${Math.max(3,3+db.leaderships.length)}`};XLSX.utils.book_append_sheet(wb,wsL,"LIDERANÇAS");
 const ah=["Liderança","Nome completo","Data de nascimento","CPF","Telefone","Endereço","Nome da mãe","E-mail","Bairro","CEP","Título de eleitor","Zona","Seção","Chave Pix","Nome do titular","Banco"];const wsA=XLSX.utils.aoa_to_sheet([["ATIVISTAS POR LIDERANÇA"],[],ah]);wsA["!merges"]=[{s:{r:0,c:0},e:{r:0,c:15}}];style(wsA,"A1:P1",title);style(wsA,"A3:P3",header);nav(wsA,2,"← Voltar ao painel","PAINEL");let rr=4;db.leaderships.forEach(l=>{XLSX.utils.sheet_add_aoa(wsA,[[l.name]],{origin:{r:rr-1,c:0}});wsA["!merges"].push({s:{r:rr-1,c:0},e:{r:rr-1,c:15}});style(wsA,`A${rr}:P${rr}`,section);rr++;const team=db.activists.filter(a=>a.leaderId===l.id);if(!team.length){set(wsA,`A${rr}`,"Nenhum ativista vinculado",light);rr++}else team.forEach(a=>{const row=[l.name,a.name,dateBR(a.birth),cpfBR(a.cpf),a.phone,a.address,a.mother,a.email,a.neighborhood,cepBR(a.cep),a.title,a.zone,a.section,a.pix,a.pixname,a.bank];XLSX.utils.sheet_add_aoa(wsA,[row],{origin:{r:rr-1,c:0}});style(wsA,`A${rr}:P${rr}`,cell);rr++})});wsA["!cols"]=[{wch:30},{wch:28},{wch:18},{wch:18},{wch:18},{wch:32},{wch:28},{wch:30},{wch:20},{wch:14},{wch:18},{wch:10},{wch:10},{wch:28},{wch:24},{wch:18}];wsA["!freeze"]={xSplit:0,ySplit:3};XLSX.utils.book_append_sheet(wb,wsA,"ATIVISTAS");
 const wsAd=XLSX.utils.aoa_to_sheet([["ADMINISTRADORES"],[],["Nome completo","CPF","E-mail","Data do cadastro"]]);wsAd["!merges"]=[{s:{r:0,c:0},e:{r:0,c:3}}];style(wsAd,"A1:D1",title);style(wsAd,"A3:D3",header);nav(wsAd,2,"← Voltar ao painel","PAINEL");db.admins.forEach((a,i)=>{XLSX.utils.sheet_add_aoa(wsAd,[[a.name,cpfBR(a.cpf),a.email,new Date(a.created).toLocaleString("pt-BR")]],{origin:{r:3+i,c:0}});style(wsAd,`A${4+i}:D${4+i}`,cell)});wsAd["!cols"]=[{wch:30},{wch:18},{wch:32},{wch:24}];wsAd["!freeze"]={xSplit:0,ySplit:3};wsAd["!autofilter"]={ref:`A3:D${Math.max(3,3+db.admins.length)}`};XLSX.utils.book_append_sheet(wb,wsAd,"ADMINISTRADORES");XLSX.writeFile(wb,`cadastro-eleitoral-dainara-${new Date().toISOString().slice(0,10)}.xlsx`,{bookType:"xlsx",compression:true})}catch(e){console.error(e);setMsg("Não foi possível gerar o Excel. Tente novamente.")}};
 if(mode==="home")return <main className="shell"><section className="hero"><b>Cadastro Eleitoral</b><h1>Coordenadora Dainara Torres</h1><p>Portal de acesso, cadastro e gestão de lideranças e ativistas.</p><div className="actions"><button onClick={()=>go("leader-access")}>Já sou liderança</button><button onClick={()=>go("leader-release")}>Se torne liderança</button><button className="outline" onClick={()=>go("admin-access")}>Acesso administrativo</button><button className="outline" onClick={()=>go("admin-release")}>Se tornar administrador</button></div><div className="home-note">Dados persistidos neste navegador durante a fase de teste.</div></section></main>;
 if(["leader-access","admin-access","leader-release","admin-release"].includes(mode)){const a=mode.includes("admin"),rel=mode.includes("release");return <Access admin={a} release={rel} code={code} setCode={setCode} msg={msg} onBack={()=>go("home")} onEnter={()=>rel?release(a):enter(a)} onSwitch={()=>go(rel?(a?"admin-access":"leader-access"):(a?"admin-release":"leader-release"))}/>}
 if(mode==="admin-reg")return <AdminReg back={()=>go("home")} save={registerAdmin} msg={msg}/>;
 if(mode==="leader-reg"||mode==="leader-form")return <Form kind="liderança" f={f} setF={setF} save={saveLeader} back={()=>go(mode==="leader-reg"?"home":returnTo)} msg={msg} edit={!!editing}/>;
 if(mode==="activist-form")return <Form kind="ativista" f={f} setF={setF} save={saveAct} back={()=>go(returnTo)} msg={msg} edit={!!editing}/>;
 if(!role)return <main className="shell"><section className="card"><h2>Acesso encerrado</h2><button className="primary" onClick={()=>go("home")}>Voltar ao início</button></section></main>;
 const admin=role==="admin",title=admin?"Painel administrativo":leader?`Olá, ${leader.name}`:"Área da liderança",logout=()=>{setRole(null);setLeaderId(null);setView("dashboard");go("home")};let content;
 if(view==="dashboard"){const recent=[...db.leaderships.map(x=>({...x,k:"Liderança"})),...db.activists.map(x=>({...x,k:"Ativista"}))].sort((a,b)=>(b.updated||b.created)-(a.updated||a.created)).slice(0,8);content=<><div className="cards"><div className="metric"><span className="label">Total de lideranças</span><div className="value">{admin?db.leaderships.length:leader?1:0}</div></div><div className="metric"><span className="label">Total de ativistas</span><div className="value">{admin?db.activists.length:mine.length}</div></div><div className="metric"><span className="label">Total de equipes</span><div className="value">{admin?db.leaderships.length:leader?1:0}</div></div><div className="metric"><span className="label">Cadastros recentes</span><div className="value">{recent.length}</div></div></div>{admin&&<div className="quick-grid"><button className="quick" onClick={()=>setView("leaderships")}>♙ <b>Gerenciar lideranças</b><span>Pesquisar e editar</span></button><button className="quick" onClick={()=>setView("activists")}>♧ <b>Gerenciar ativistas</b><span>Organizados por liderança</span></button><button className="quick" onClick={startL}>＋ <b>Nova liderança</b><span>Criar cadastro</span></button><button className="quick" onClick={exportExcel}>⇩ <b>Exportar Excel</b><span>Planilha rosa organizada</span></button></div>}{leader&&<div className="panel"><div className="page-head"><div><h3>Minha equipe</h3><p>{mine.length} ativista(s) vinculados.</p></div><button className="primary" onClick={()=>startA()}>＋ Adicionar ativista</button></div></div>}{!admin&&!leader&&<div className="panel empty"><b>Nenhuma liderança cadastrada neste navegador.</b><p>Cadastre sua liderança para começar.</p><button className="primary" onClick={startL}>Cadastrar minha liderança</button></div>}<div className="panel"><h3>Atividade recente</h3>{recent.length?recent.map(x=><div className="list-item" key={x.k+x.id}><div><b>{x.name}</b><small>{x.k} • {new Date(x.updated||x.created).toLocaleString("pt-BR")}</small></div>{x.k==="Ativista"&&<span>{db.leaderships.find(l=>l.id===x.leaderId)?.name||"Sem liderança"}</span>}</div>):<div className="empty">Nenhum cadastro realizado.</div>}</div></>}
 else if(view==="leaderships"&&admin)content=<div className="panel"><div className="page-head"><h2>Lideranças</h2><button className="primary" onClick={startL}>＋ Nova liderança</button></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, CPF ou título..."/>{leaders.length?leaders.map(l=><div className="list-item clickable" key={l.id} onClick={()=>{setDetail(l.id);setView("leadership-detail")}}><div><b>{l.name}</b><small>{cpfBR(l.cpf)} • Título {l.title}</small></div><span>{db.activists.filter(a=>a.leaderId===l.id).length} ativista(s) →</span></div>):<div className="empty">Nenhuma liderança encontrada.</div>}</div>;
 else if(view==="activists"){const list=admin?acts:mine.filter(a=>`${a.name} ${a.cpf} ${a.title}`.toLowerCase().includes(search.toLowerCase()));content=<div className="panel"><div className="page-head"><div><h2>{admin?"Ativistas":"Meus ativistas"}</h2><p>{admin?"A liderança aparece em cada linha para não misturar equipes.":`Liderança: ${leader?.name||"não cadastrada"}`}</p></div><button className="primary" onClick={()=>startA()}>＋ Adicionar ativista</button></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, CPF ou título..."/>{list.length?list.map(a=>{const l=db.leaderships.find(x=>x.id===a.leaderId);return <div className="list-item clickable" key={a.id} onClick={()=>{setDetail(a.id);setView("activist-detail")}}><div><b>{a.name}</b><small>{cpfBR(a.cpf)} • Título {a.title}</small></div><span className="leader-tag">👤 {l?.name||"Sem liderança"}</span></div>}):<div className="empty">Nenhum ativista encontrado.</div>}</div>}
 else if(view==="leadership-detail"&&admin){const l=db.leaderships.find(x=>x.id===detail),aa=db.activists.filter(x=>x.leaderId===detail);content=<Detail title="Liderança" person={l} onBack={()=>setView("leaderships")} onEdit={()=>edit(l,"leader")} team={<div className="panel team-panel"><div className="page-head"><div><h3>Ativistas vinculados: {aa.length}</h3><p>Equipe delimitada para facilitar a gestão.</p></div><button className="primary" onClick={()=>startA(l?.id)}>＋ Adicionar ativista</button></div>{aa.length?aa.map(a=><div className="list-item clickable" key={a.id} onClick={()=>{setDetail(a.id);setView("activist-detail")}}><div><b>{a.name}</b><small>{cpfBR(a.cpf)} • Título {a.title}</small></div><span>Ver cadastro →</span></div>):<div className="empty">Nenhum ativista vinculado.</div>}</div>}/>}
 else if(view==="activist-detail"){const a=db.activists.find(x=>x.id===detail),l=db.leaderships.find(x=>x.id===a?.leaderId);content=<Detail title="Cadastro do ativista" person={a} leader={l?.name} onBack={()=>setView("activists")} onEdit={()=>edit(a,"activist")}/>}
 else if(view==="profile"&&!admin)content=<Detail title="Meu cadastro" person={leader} onBack={()=>setView("dashboard")} onEdit={()=>leader&&edit(leader,"leader")}/>;
 else if(view==="assessors"&&!admin)content=<div className="panel"><h2>Contatos da assessoria</h2><p>Contatos disponibilizados pela coordenação.</p>{db.assessors.map(a=><div className="contact-card" key={a.id}><b>{a.name}</b><span>{a.phone}</span><span>{a.email}</span></div>)}</div>;
 else if(view==="admins"&&admin)content=<div className="panel"><div className="page-head"><h2>Administradores</h2><button className="primary" onClick={()=>go("admin-release")}>＋ Novo administrador</button></div>{db.admins.length?db.admins.map(a=><div className="list-item" key={a.id}><div><b>{a.name}</b><small>{cpfBR(a.cpf)} • {a.email||"Sem e-mail"}</small></div><span>{new Date(a.created).toLocaleDateString("pt-BR")}</span></div>):<div className="empty">Nenhum administrador cadastrado.</div>}</div>;
 else content=<div className="panel empty">Selecione uma opção no menu.</div>;
 return <div className="app-shell"><Side admin={admin} view={view} setView={v=>{setSearch("");setDetail(null);setView(v)}} logout={logout} newL={startL} newA={()=>startA()} exportExcel={exportExcel}/><div className="main"><header className="topbar"><div><h1>{title}</h1><p>{admin?"Visão geral dos cadastros e equipes.":leader?"Gerencie somente os ativistas vinculados à sua liderança.":"Cadastre sua liderança para começar."}</p></div>{admin&&<button className="outline top-export" onClick={exportExcel}>⇩ Exportar Excel</button>}</header><main className="content">{content}</main></div></div>
}
