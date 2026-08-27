const fs = require("fs");

const path = "app/portal/page.js";
let source = fs.readFileSync(path, "utf8");

if (source.includes("REDE DE CONFIANÇA")) {
  console.log("Family feature already present.");
  process.exit(0);
}

const old = '<button className="quick" onClick={()=>setView("assessors")}><b>☎ Assessoria</b><span>Veja os contatos disponibilizados pela coordenação.</span></button></div></>;';
const next = '<button className="quick" onClick={()=>setView("assessors")}><b>☎ Assessoria</b><span>Veja os contatos disponibilizados pela coordenação.</span></button><button className="quick" onClick={()=>window.open("/familia","_blank")}><b>♡ Rede de confiança</b><span>Acesse o cadastro das pessoas que têm o seu voto de confiança.</span></button></div></>;';

if (!source.includes(old)) throw new Error("Ponto de inserção do painel da liderança não encontrado.");
source = source.replace(old, next);
fs.writeFileSync(path, source);
console.log("Family feature added to the leadership dashboard.");
