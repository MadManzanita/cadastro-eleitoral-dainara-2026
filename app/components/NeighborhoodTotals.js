"use client";
import { useState } from "react";
import { neighborhoodCounts, normalizePlace } from "../../lib/neighborhood-counts.mjs";

export default function NeighborhoodTotals({ db }) {
  const [selected, setSelected] = useState("");
  const [municipality, setMunicipality] = useState("");
  const groups = neighborhoodCounts(db);
  const towns = [...new Set(groups.map((g) => g.municipality))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const available = groups.filter((g) => !municipality || g.municipality === municipality);
  const neighborhoods = [...new Map(available.map((g) => [normalizePlace(g.neighborhood), g.neighborhood])).entries()];
  const matches = available.filter((g) => !selected || normalizePlace(g.neighborhood) === selected);
  const totals = matches.reduce((sum,g) => ({total:sum.total+g.total,leaderships:sum.leaderships+g.leaderships,activists:sum.activists+g.activists,families:sum.families+g.families}),{total:0,leaderships:0,activists:0,families:0});
  return <section className="panel">
    <h2>Cadastros por bairro</h2>
    <div className="form-grid">
      <label className="field"><span>Município</span><select value={municipality} onChange={(e)=>{setMunicipality(e.target.value);setSelected("");}}>
        <option value="">Todos os municípios</option>{towns.map((town)=><option key={town}>{town}</option>)}
      </select></label>
      <label className="field"><span>Bairro / localidade</span><select value={selected} onChange={(e)=>setSelected(e.target.value)}>
        <option value="">Todos os bairros</option>{neighborhoods.map(([key,name])=><option key={key} value={key}>{name}</option>)}
      </select></label>
    </div>
    <div className="cards" aria-live="polite">
      {[["Total no filtro",totals.total],["Lideranças",totals.leaderships],["Ativistas",totals.activists],["Rede de confiança",totals.families]].map(([label,count])=><div className="metric" key={label}><div className="label">{label}</div><div className="value">{count}</div></div>)}
    </div>
    <p>Contagem de cadastros ativos. Com todos os municípios, bairros com o mesmo nome são somados. Registros antigos sem município ficam em “Município não informado”.</p>
  </section>;
}
