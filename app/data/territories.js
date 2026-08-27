export const AMAZONAS_MUNICIPALITIES = [
  "Alvarães","Amaturá","Anamã","Anori","Apuí","Atalaia do Norte","Autazes","Barcelos","Barreirinha","Benjamin Constant","Beruri","Boa Vista do Ramos","Boca do Acre","Borba","Caapiranga","Canutama","Carauari","Careiro","Careiro da Várzea","Coari","Codajás","Eirunepé","Envira","Fonte Boa","Guajará","Humaitá","Ipixuna","Iranduba","Itacoatiara","Itamarati","Itapiranga","Japurá","Juruá","Jutaí","Lábrea","Manacapuru","Manaquiri","Manaus","Manicoré","Maraã","Maués","Nhamundá","Nova Olinda do Norte","Novo Airão","Novo Aripuanã","Parintins","Pauini","Presidente Figueiredo","Rio Preto da Eva","Santa Isabel do Rio Negro","Santo Antônio do Içá","São Gabriel da Cachoeira","São Paulo de Olivença","São Sebastião do Uatumã","Silves","Tabatinga","Tapauá","Tefé","Tonantins","Uarini","Urucará","Urucurituba"
];

export const MANAUS_ZONES = {
  "Centro":"Sul","Nossa Senhora de Aparecida":"Sul","Presidente Vargas":"Sul","Praça 14 de Janeiro":"Sul","Cachoeirinha":"Sul","Raiz":"Sul","São Francisco":"Sul","Petrópolis":"Sul","Japiim":"Sul","Educandos":"Sul","Santa Luzia":"Sul","Morro da Liberdade":"Sul","Betânia":"Sul","Colônia Oliveira Machado":"Sul","São Lázaro":"Sul","Crespo":"Sul","Vila Buriti":"Sul","Distrito Industrial I":"Sul",
  "São Raimundo":"Oeste","Glória":"Oeste","Santo Antônio":"Oeste","Vila da Prata":"Oeste","Compensa":"Oeste","São Jorge":"Oeste","Santo Agostinho":"Oeste","Nova Esperança":"Oeste","Lírio do Vale":"Oeste","Ponta Negra":"Oeste","Tarumã":"Oeste","Tarumã-Açu":"Oeste",
  "Planalto":"Centro-Oeste","Alvorada":"Centro-Oeste","Redenção":"Centro-Oeste","Bairro da Paz":"Centro-Oeste","Dom Pedro":"Centro-Oeste",
  "Coroado":"Leste","Distrito Industrial II":"Leste","Mauazinho":"Leste","Colônia Antônio Aleixo":"Leste","Puraquequara":"Leste","Armando Mendes":"Leste","Zumbi dos Palmares":"Leste","São José Operário":"Leste","Tancredo Neves":"Leste","Jorge Teixeira":"Leste","Gilberto Mestrinho":"Leste",
  "Flores":"Centro-Sul","Parque 10 de Novembro":"Centro-Sul","Aleixo":"Centro-Sul","Adrianópolis":"Centro-Sul","Nossa Senhora das Graças":"Centro-Sul","São Geraldo":"Centro-Sul","Chapada":"Centro-Sul",
  "Colônia Santo Antônio":"Norte","Novo Israel":"Norte","Colônia Terra Nova":"Norte","Santa Etelvina":"Norte","Monte das Oliveiras":"Norte","Cidade Nova":"Norte","Novo Aleixo":"Norte","Cidade de Deus":"Norte","Nova Cidade":"Norte","Lago Azul":"Norte"
};

export const MANAUS_NEIGHBORHOODS = Object.keys(MANAUS_ZONES).sort((a,b) => a.localeCompare(b, "pt-BR"));
export const AMAZONAS_TERRITORIES = Object.fromEntries(AMAZONAS_MUNICIPALITIES.map((municipio) => [municipio, municipio === "Manaus" ? MANAUS_NEIGHBORHOODS : ["Centro", "Zona Rural / Localidade"]]));
export function getManausZone(neighborhood) { return MANAUS_ZONES[neighborhood] || ""; }
