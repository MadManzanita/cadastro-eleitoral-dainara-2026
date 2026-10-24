"use client";
import { useRef, useState } from "react";
import { normalizePlace } from "../../lib/neighborhood-counts.mjs";

export default function TrustTransfers({ db, remote, reload }) {
  const [selected,setSelected]=useState([]), [query,setQuery]=useState(""), [type,setType]=useState(""), [leader,setLeader]=useState("");
  const [target,setTarget]=useState(""), [destinationSearch,setDestinationSearch]=useState(""), [confirm,setConfirm]=useState(false), [busy,setBusy]=useState(false), [notice,setNotice]=useState("");
  const lock=useRef(false);
  const rows=[...db.activists.map(p=>({...p,type:"activist",key:`activist:${p.id}`})),...db.families.map(p=>({...p,type:"family",key:`family:${p.id}`}))];
  const list=rows.filter(p=>(!type||p.type===type)&&(!leader||p.leaderId===leader)&&normalizePlace(`${p.name} ${p.cpf||""}`).includes(normalizePlace(query)));
  const chosen=rows.filter(p=>selected.includes(p.key));
  const activistIds=chosen.filter(p=>p.type==="activist").map(p=>p.id);
  const familyIds=chosen.filter(p=>p.type==="family").map(p=>p.id);
  const dependents=db.families.filter(p=>activistIds.includes(p.activistId)&&!familyIds.includes(p.id));
  const destinations=[...db.leaderships.map(p=>({...p,key:`leader:${p.id}`,label:`Liderança — ${p.name}`})),...db.activists.filter(p=>!activistIds.includes(p.id)).map(p=>({...p,key:`activist:${p.id}`,label:`Ativista — ${p.name} (${db.leaderships.find(l=>l.id===p.leaderId)?.name||""})`}))];
  const destination=destinations.find(p=>p.key===target);
  const visibleDestinations=destinations.filter(p=>p.key===target||normalizePlace(p.label).includes(normalizePlace(destinationSearch)));
  const toggle=(key)=>{setConfirm(false);setSelected(s=>s.includes(key)?s.filter(k=>k!==key):[...s,key]);};
  const submit=async()=>{
    if(lock.current||!destination||!chosen.length)return;
    lock.current=true;setBusy(true);setNotice("");
    let completed=false;
    try {
      const [targetRole,targetId]=target.split(":");
      const result=await remote("/api/trust-transfers",{method:"POST",body:JSON.stringify({activistIds,familyIds,targetRole,targetId})});
      completed=true;setSelected([]);setConfirm(false);setTarget("");
      setNotice(`Transferência concluída: ${result.converted} ativista(s) convertido(s) e ${result.moved} pessoa(s) da rede transferida(s).`);
      await reload();
    } catch(error) {setConfirm(false);setNotice(completed?"Transferência concluída. Atualize a página para visualizar os dados atualizados.":error.message);}
    finally {lock.current=false;setBusy(false);}
  };
  return <section className="panel">
    <h2>Transferir para a rede de confiança</h2>
    <p>Selecione ativistas e/ou pessoas da rede. Ativistas selecionados deixam de ter acesso de ativista; as pessoas vinculadas a eles acompanham a transferência.</p>
    {notice&&<div className="result" role="status">{notice}</div>}
    <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
      <div className="form-grid three">
        <label className="field"><span>Buscar nome ou CPF</span><input value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <label className="field"><span>Tipo de cadastro</span><select value={type} onChange={e=>setType(e.target.value)}><option value="">Todos</option><option value="activist">Ativistas</option><option value="family">Rede de confiança</option></select></label>
        <label className="field"><span>Liderança de origem</span><select value={leader} onChange={e=>setLeader(e.target.value)}><option value="">Todas</option>{db.leaderships.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      <div className="assessor-actions">
        <button className="primary outline" onClick={()=>{setSelected([...new Set([...selected,...list.map(p=>p.key)])]);setConfirm(false);}}>Selecionar resultados ({list.length})</button>
        <button className="primary outline" onClick={()=>{setSelected([]);setConfirm(false);}}>Limpar seleção</button>
      </div>
      <p>{chosen.length} selecionado(s) no total, incluindo seleções fora do filtro. Limite: 500 por operação.</p>
      <div style={{maxHeight:420,overflowY:"auto"}}>
        {list.map(p=><label className="list-item" key={p.key} style={{justifyContent:"flex-start",gap:12}}>
          <input type="checkbox" checked={selected.includes(p.key)} onChange={()=>toggle(p.key)} style={{width:18,height:18,flexShrink:0}} aria-label={`Selecionar ${p.name}`}/>
          <div><b>{p.name}</b><small>{p.type==="activist"?"Ativista":"Rede de confiança"} • {db.leaderships.find(l=>l.id===p.leaderId)?.name} • {p.neighborhood||"Sem bairro"}</small></div>
        </label>)}
        {!list.length&&<p>Nenhum cadastro encontrado.</p>}
      </div>
      <h3>Rede de destino</h3>
      <div className="form-grid">
        <label className="field"><span>Buscar responsável de destino</span><input value={destinationSearch} onChange={e=>setDestinationSearch(e.target.value)}/></label>
        <label className="field"><span>Liderança ou ativista de destino</span><select value={target} onChange={e=>{setTarget(e.target.value);setConfirm(false);}}><option value="">Selecione</option>{visibleDestinations.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
      </div>
      {chosen.length>500&&<p role="alert">Reduza a seleção para até 500 cadastros.</p>}
      {!confirm?<button className="primary" disabled={!destination||!chosen.length||chosen.length>500} onClick={()=>setConfirm(true)}>Conferir transferência</button>:
        <div className="panel" style={{ background: "#fff5f9", marginTop: 16 }} role="region" aria-label="Conferir transferência">
          <p>Destino: <b>{destination?.label}</b></p>
          <p>{activistIds.length} ativista(s) serão convertidos em rede de confiança, {familyIds.length} pessoa(s) selecionada(s) serão transferidas e {dependents.length} pessoa(s) vinculada(s) acompanharão a operação.</p>
          <p>Cadastros que já pertencem ao destino permanecem como estão. O histórico será registrado.</p>
          <button className="primary" disabled={!destination||busy} onClick={submit}>{busy?"Transferindo…":"Confirmar transferência"}</button>{" "}
          <button className="primary outline" onClick={()=>setConfirm(false)}>Cancelar</button>
        </div>}
    </fieldset>
  </section>;
}
