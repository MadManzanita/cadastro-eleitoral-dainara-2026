export const AMAZONAS_MUNICIPALITIES = [
  "Alvarães","Amaturá","Anamã","Anori","Apuí","Atalaia do Norte","Autazes","Barcelos","Barreirinha","Benjamin Constant","Beruri","Boa Vista do Ramos","Boca do Acre","Borba","Caapiranga","Canutama","Carauari","Careiro","Careiro da Várzea","Coari","Codajás","Eirunepé","Envira","Fonte Boa","Guajará","Humaitá","Ipixuna","Iranduba","Itacoatiara","Itamarati","Itapiranga","Japurá","Juruá","Jutaí","Lábrea","Manacapuru","Manaquiri","Manaus","Manicoré","Maraã","Maués","Nhamundá","Nova Olinda do Norte","Novo Airão","Novo Aripuanã","Parintins","Pauini","Presidente Figueiredo","Rio Preto da Eva","Santa Isabel do Rio Negro","Santo Antônio do Içá","São Gabriel da Cachoeira","São Paulo de Olivença","São Sebastião do Uatumã","Silves","Tabatinga","Tapauá","Tefé","Tonantins","Uarini","Urucará","Urucurituba"
];

export const MANAUS_ZONES = {
  "Alvorada":"Centro-Oeste","Lírio do Vale":"Centro-Oeste","Da Paz":"Centro-Oeste","Chapada":"Centro-Oeste","Dom Pedro I":"Centro-Oeste","Planalto":"Centro-Oeste","Nova Esperança":"Centro-Oeste","São Geraldo":"Centro-Oeste","Redenção":"Centro-Oeste","São Jorge":"Centro-Oeste","Vila da Prata":"Centro-Oeste",
  "Adrianópolis":"Centro-Sul","Parque 10 de Novembro":"Centro-Sul","Nossa Senhora das Graças":"Centro-Sul","Flores":"Centro-Sul","Aleixo":"Centro-Sul",
  "Armando Mendes":"Leste","Tancredo Neves":"Leste","São José Operário":"Leste","Puraquequara":"Leste","Mauazinho":"Leste","Jorge Teixeira":"Leste","Distrito Industrial II":"Leste","Gilberto Mestrinho":"Leste","Colônia Antônio Aleixo":"Leste","Zumbi dos Palmares":"Leste","Coroado":"Leste",
  "Cidade de Deus":"Norte","Lago Azul":"Norte","Santa Etelvina":"Norte","Novo Israel":"Norte","Novo Aleixo":"Norte","Nova Cidade":"Norte","Monte das Oliveiras":"Norte","Colônia Terra Nova":"Norte","Colônia Santo Antônio":"Norte","Cidade Nova":"Norte",
  "Compensa":"Oeste","Ponta Negra":"Oeste","Tarumã-Açu":"Oeste","Tarumã":"Oeste","São Raimundo":"Oeste","Santo Antônio":"Oeste","Santo Agostinho":"Oeste","Glória":"Oeste",
  "Betânia":"Sul","Vila Buriti":"Sul","São Lázaro":"Sul","São Francisco":"Sul","Santa Luzia":"Sul","Raiz":"Sul","Presidente Vargas":"Sul","Praça 14 de Janeiro":"Sul","Petrópolis":"Sul","Nossa Senhora Aparecida":"Sul","Morro da Liberdade":"Sul","Japiim":"Sul","Educandos":"Sul","Distrito Industrial I":"Sul","Crespo":"Sul","Colônia Oliveira Machado":"Sul","Centro":"Sul","Cachoeirinha":"Sul"
};

// A lista abaixo é a base territorial de Manaus publicada pela Prefeitura/IMPLURB.
export const MANAUS_NEIGHBORHOODS = Object.keys(MANAUS_ZONES).sort((a,b) => a.localeCompare(b, "pt-BR"));

// Para os demais municípios, a interface deverá carregar uma base de bairros/localidades
// validada antes da produção. Não foram inventados bairros para municípios sem fonte validada.
export const AMAZONAS_TERRITORIES = Object.fromEntries(
  AMAZONAS_MUNICIPALITIES.map((municipio) => [
    municipio,
    municipio === "Manaus" ? MANAUS_NEIGHBORHOODS : ["Outro bairro/localidade"]
  ])
);
