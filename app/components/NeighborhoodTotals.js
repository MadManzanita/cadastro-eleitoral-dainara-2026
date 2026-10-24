"use client";
import { useState } from "react";
import { neighborhoodCounts, neighborhoodSelection, normalizePlace } from "../../lib/neighborhood-counts.mjs";

export default function NeighborhoodTotals({ db }) {
  const [selected, setSelected] = useState("");
  const [municipality, setMunicipality] = useState("");
  const groups = neighborhoodCounts(db);
  const towns = [...new Set(groups.map((g) => g.municipality))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const available = groups.filter((g) => !municipality || g.municipality === municipality);
  const neighborhoods = [...new Map(available.map((g) => [normalizePlace(g.neighborhood), g.neighborhood])).entries()];
  const { totals, allMunicipalities, byMunicipality } = neighborhoodSelection(groups, municipality, selected);
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
    <p><b>{municipality || "Todos os municípios"}</b> · {selected ? neighborhoods.find(([key]) => key === selected)?.[1] : "Todos os bairros"}. Cada pessoa é contada pelo bairro do próprio cadastro.</p>
    <div className="cards" aria-live="polite">
      {[["Total no filtro",totals.total],["Lideranças",totals.leaderships],["Ativistas",totals.activists],["Rede de confiança",totals.families]].map(([label,count])=><div className="metric" key={label}><div className="label">{label}</div><div className="value">{count}</div></div>)}
    </div>
    {selected && <div aria-live="polite">
      <h3>Conferência deste bairro em todos os municípios</h3>
      <p><b>{allMunicipalities.total} cadastros</b> com este nome de bairro: {allMunicipalities.leaderships} lideranças, {allMunicipalities.activists} ativistas e {allMunicipalities.families} pessoas na rede de confiança.</p>
      {municipality && allMunicipalities.total > totals.total && <div className="result">
        {allMunicipalities.total - totals.total} cadastro(s) deste bairro estão fora dos números acima porque têm outro município ou não têm município informado.
        <p><button type="button" className="back" onClick={() => setMunicipality("")}>Ver este bairro em todos os municípios</button></p>
      </div>}
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
        <caption style={{ textAlign: "left", paddingBottom: 8 }}>Distribuição pelo município registrado</caption>
        <thead><tr>{["Município", "Lideranças", "Ativistas", "Rede de confiança", "Total"].map((label) => <th key={label} scope="col" style={{ padding: 8 }}>{label}</th>)}</tr></thead>
        <tbody>{byMunicipality.map((row) => <tr key={row.municipality}>
          <th scope="row" style={{ padding: 8 }}>{row.municipality}</th>
          {["leaderships", "activists", "families", "total"].map((key) => <td key={key} style={{ padding: 8 }}>{row[key]}</td>)}
        </tr>)}</tbody>
      </table></div>
      <p>“Município não informado” não significa Manaus. Esses cadastros entram no total do bairro em todos os municípios, mas não no total de uma cidade específica.</p>
    </div>}
    <p>Contagem de cadastros ativos. Com todos os municípios, bairros com o mesmo nome são somados. Registros antigos sem município ficam em “Município não informado”.</p>
  </section>;
}
