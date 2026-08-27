export const AMAZONAS_MUNICIPALITIES = [
  "Alvarães","Amaturá","Anamã","Anori","Apuí","Atalaia do Norte","Autazes","Barcelos","Barreirinha","Benjamin Constant","Beruri","Boa Vista do Ramos","Boca do Acre","Borba","Caapiranga","Canutama","Carauari","Careiro","Careiro da Várzea","Coari","Codajás","Eirunepé","Envira","Fonte Boa","Guajará","Humaitá","Ipixuna","Iranduba","Itacoatiara","Itamarati","Itapiranga","Japurá","Juruá","Jutaí","Lábrea","Manacapuru","Manaquiri","Manaus","Manicoré","Maraã","Maués","Nhamundá","Nova Olinda do Norte","Novo Airão","Novo Aripuanã","Parintins","Pauini","Presidente Figueiredo","Rio Preto da Eva","Santa Isabel do Rio Negro","Santo Antônio do Içá","São Gabriel da Cachoeira","São Paulo de Olivença","São Sebastião do Uatumã","Silves","Tabatinga","Tapauá","Tefé","Tonantins","Uarini","Urucará","Urucurituba"
];

export const MANAUS_ZONES = {
  "Adrianópolis":"Centro-Sul","Aleixo":"Centro-Sul","Chapada":"Centro-Sul","Flores":"Centro-Sul","Nossa Senhora das Graças":"Centro-Sul","Parque 10 de Novembro":"Centro-Sul",
  "Alvorada":"Centro-Oeste","Bairro da Paz":"Oeste","Compensa":"Oeste","Da Paz":"Oeste","Dom Pedro I":"Oeste","Glória":"Oeste","Lírio do Vale":"Oeste","Nova Esperança":"Oeste","Planalto":"Oeste","Ponta Negra":"Oeste","Redenção":"Oeste","Santo Agostinho":"Oeste","Santo Antônio":"Oeste","São Jorge":"Oeste","São Raimundo":"Oeste","Tarumã":"Oeste","Tarumã-Açu":"Oeste","Vila da Prata":"Oeste",
  "Armando Mendes":"Leste","Colônia Antônio Aleixo":"Leste","Coroado":"Leste","Distrito Industrial II":"Leste","Gilberto Mestrinho":"Leste","Jorge Teixeira":"Leste","Mauazinho":"Leste","Puraquequara":"Leste","São José Operário":"Leste","Tancredo Neves":"Leste","Zumbi dos Palmares":"Leste",
  "Cidade de Deus":"Norte","Cidade Nova":"Norte","Colônia Santo Antônio":"Norte","Colônia Terra Nova":"Norte","Lago Azul":"Norte","Monte das Oliveiras":"Norte","Nova Cidade":"Norte","Novo Aleixo":"Norte","Novo Israel":"Norte","Santa Etelvina":"Norte",
  "Betânia":"Sul","Cachoeirinha":"Sul","Centro":"Sul","Colônia Oliveira Machado":"Sul","Crespo":"Sul","Distrito Industrial I":"Sul","Educandos":"Sul","Japiim":"Sul","Morro da Liberdade":"Sul","Nossa Senhora Aparecida":"Sul","Petrópolis":"Sul","Praça 14 de Janeiro":"Sul","Presidente Vargas":"Sul","Raiz":"Sul","Santa Luzia":"Sul","São Francisco":"Sul","São Geraldo":"Sul","São Lázaro":"Sul","Vila Buriti":"Sul"
};

export const MANAUS_NEIGHBORHOODS = Object.keys(MANAUS_ZONES).sort((a,b) => a.localeCompare(b, "pt-BR"));

// O IBGE registra 469 bairros no Amazonas no Censo 2022. O próprio IBGE ressalta
// que nem todo município possui bairros legalmente instituídos. Por isso o campo
// do sistema é "Bairro / Localidade". Onde ainda não temos uma lista municipal
// validada, não inventamos nomes: usamos apenas opções neutras de localização.
export const AMAZONAS_TERRITORIES = Object.fromEntries(
  AMAZONAS_MUNICIPALITIES.map((municipio) => [
    municipio,
    municipio === "Manaus" ? MANAUS_NEIGHBORHOODS : ["Centro", "Zona Rural / Localidade"]
  ])
);

export function getManausZone(neighborhood) {
  return MANAUS_ZONES[neighborhood] || "";
}
