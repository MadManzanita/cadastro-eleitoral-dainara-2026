"use client";

import { useEffect, useState } from "react";
import { formatTermAddress } from "../../lib/term-document.mjs";
import styles from "./page.module.css";

const cpfBR = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : String(value || "");
};

function FieldValue({ children, wide = false }) {
  return <span className={`${styles.fieldValue} ${wide ? styles.fieldWide : ""}`}>{children || "\u00a0"}</span>;
}
function TermPages({ person }) {
  return (
    <section className={styles.termSet} data-record-key={person.key}>
      <article className={`${styles.paper} ${styles.pageOne}`}>
        <h1>TERMO DE ADESÃO AO SERVIÇO VOLUNTÁRIO - CABO ELEITORAL - ELEIÇÕES 2026</h1>
        <div className={styles.titleRule} />

        <div className={styles.identity}>
          <p>CANDIDATO:</p>
          <p>Nome: <strong>ELEIÇÃO 2026 SANDOVAL FERNANDO CARDOSO DE FREITAS DEPUTADO ESTADUAL</strong></p>
          <p className={styles.identityGap}>CNPJ: <strong>68.237.323/0001-37</strong></p>
          <p>VOLUNTÁRIO:</p>
          <p>Nome: <FieldValue wide>{person.name}</FieldValue></p>
          <p>CPF: <FieldValue>{cpfBR(person.cpf)}</FieldValue></p>
          <p>RG: <FieldValue /></p>
          <p className={styles.identityGap}>Endereço: <FieldValue wide>{formatTermAddress(person)}</FieldValue></p>
        </div>

        <div className={styles.legalText}>
          <p>As partes acima qualificadas celebram entre si, na melhor forma de direito, o presente TERMO DE ADESÃO que, de acordo com a Lei Federal nº 9.608, de 18 de fevereiro de 1998, a prestação de serviços voluntário é atividade não remunerada, com finalidade cívico-política, e não gera vínculo empregatício, nos termos do art. 100 da Lei Federal nº 9.504/97, nem obrigação de natureza trabalhista, previdenciária ou afim, e reger-se-á pelas seguintes cláusulas:</p>
          <p>CLÁUSULA 1ª — Fica desde já ajustado que os serviços prestados pelo voluntário são de caráter gratuito, não cabendo, pois, remuneração a título de contraprestação. Para os efeitos da Resolução TSE nº 23.607, de 17 de dezembro de 2019, atualizada pela Resolução TSE nº 23.752, de 26 de fevereiro de 2026, o serviço voluntário prestado fica estimado em R$ 1.440,00 (Mil quatrocentos e quarenta reais).</p>
          <p>CLÁUSULA 2ª — O VOLUNTÁRIO se compromete a colaborar, por sua livre e espontânea vontade, com o CANDIDATO, para o seguinte serviço: atividades de merchandising que inclui: pedido de voto, visitação a eleitores, distribuição e exposição em seu perfil digital do material de campanha de cunho eleitoral no Bairro <span className={styles.neighborhood}>{person.neighborhood || "\u00a0"}</span> e adjacência.</p>
          <p>CLÁUSULA 3ª — O VOLUNTÁRIO se compromete a colaborar com o CANDIDATO nos serviços descritos na cláusula anterior nos dias e horários por ele definidos de acordo com a sua conveniência.</p>
          <p>CLÁUSULA 4ª — O VOLUNTÁRIO declara para fins de Prestação de Serviços em Campanha Eleitoral/2026, que não é Beneficiário de qualquer Auxílio proveniente do Governo Federal, Estadual ou Municipal, e conhecer a INSTRUÇÃO NORMATIVA Nº 2/SEDS/SENARC/DEBEN/MC, DE 31 DE DEZEMBRO DE 2020.</p>
          <p>CLÁUSULA 5ª — O CANDIDATO compromete-se a disponibilizar ao VOLUNTÁRIO os materiais de campanha necessários para divulgação prevista na cláusula 2ª deste TERMO DE ADESÃO.</p>
          <p>CLÁUSULA 6ª — Durante a vigência deste TERMO DE ADESÃO, o VOLUNTÁRIO se compromete a não infringir quaisquer normas eleitorais.</p>
          <p>§ 1º - O VOLUNTÁRIO declara conhecer os termos da Resolução TSE nº 23.760, de 2 de março de 2026, que trata do Calendário Eleitoral das Eleições 2026, bem como as regras proibitivas no tocante à propaganda eleitoral na eleição 2026, em conformidade com a Resolução TSE nº 23.757, de 2 de março de 2026, especialmente sobre a proibição de derrame do material impresso nas ruas da cidade.</p>
          <p>§ 2º - O VOLUNTÁRIO consente a utilização de seus dados e os documentos relativos à contratação para a divulgação no sítio do Tribunal Superior Eleitoral e dos tribunais regionais eleitorais, com observância às regras da Lei Geral de Proteção de Dados Pessoais (LGPD) (Resolução TSE n. 23.650/2021; Lei nº 13.709/2018).</p>
          <p>CLÁUSULA 7ª — Deverá o VOLUNTÁRIO zelar pela conservação dos bens, pela economia de material, sendo-lhe vedado o uso de pessoal ou recursos materiais do candidato em serviços ou atividades particulares.</p>
        </div>
      </article>

      <article className={`${styles.paper} ${styles.pageTwo}`}>
        <div className={styles.legalText}>
          <p>CLÁUSULA 8ª — O VOLUNTÁRIO responderá civil e penalmente pelos danos causados ao patrimônio do candidato que esteja sob guarda e/ou responsabilidade, devendo restituir os bens que lhe forem entregues nas mesmas condições que os recebeu.</p>
          <p>CLÁUSULA 9ª — O presente contrato terá vigência compreendida entre a data de assinatura e 03 de outubro de 2026 (data do primeiro turno das Eleições Gerais de 2026, conforme a Resolução TSE nº 23.760, de 2 de março de 2026) ou, havendo segundo turno, 25 de outubro de 2026.</p>
          <p>Estando as partes plenamente de acordo com o acima exposto, subscrevem o presente em 02 (duas) vias de igual teor e forma.</p>
          <p className={styles.date}>Manaus/AM, 09 de setembro de 2026.</p>
        </div>
        <div className={styles.candidateSignature}>
          <p>CANDIDATO: <strong>ELEIÇÃO 2026 SANDOVAL FERNANDO CARDOSO DE FREITAS</strong></p>
          <p><strong>DEPUTADO ESTADUAL</strong></p>
        </div>
        <div className={styles.volunteerSignature}>
          <p><strong>VOLUNTÁRIO: {person.name}</strong></p>
        </div>
      </article>
    </section>
  );
}

export default function TermsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const requested = new URLSearchParams(window.location.search).getAll("person");
        const response = await fetch(`/api/terms${window.location.search}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Não foi possível preparar os termos.");
        const returned = (payload.items || []).map((item) => item.key);
        if (returned.length !== requested.length || returned.some((key, index) => key !== requested[index])) {
          throw new Error("A conferência do lote falhou. Nenhum termo foi liberado para impressão.");
        }
        if (!active) return;
        setItems(payload.items);
        setStatus("ready");
      } catch (cause) {
        if (!active) return;
        setError(cause.message);
        setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <main className={styles.state}><h1>Preparando os termos…</h1><p>Conferindo cada cadastro antes da impressão.</p></main>;
  if (status === "error") return <main className={styles.state}><h1>Não foi possível gerar os termos</h1><p>{error}</p><a href="/portal">Voltar ao painel</a></main>;

  return (
    <main className={styles.screen}>
      <header className={styles.toolbar}>
        <div>
          <span>Termos de adesão</span>
          <h1>{items.length} {items.length === 1 ? "cadastro conferido" : "cadastros conferidos"}</h1>
          <p>Confira a lista abaixo. Cada pessoa terá duas páginas, sem combinar dados de cadastros diferentes.</p>
        </div>
        <div className={styles.toolbarActions}>
          <a className={styles.secondaryButton} href="/portal">Voltar ao painel</a>
          <a className={styles.secondaryButton} href="/modelos/modelo-termo-adesao.docx" download>Baixar modelo original</a>
          <button className={styles.printButton} onClick={() => window.print()}>Imprimir {items.length} {items.length === 1 ? "termo" : "termos"}</button>
        </div>
        <ol className={styles.reviewList}>
          {items.map((item) => <li key={item.key}><strong>{item.name}</strong><span>{item.type === "leadership" ? "Liderança" : "Ativista"} • CPF {cpfBR(item.cpf)}</span></li>)}
        </ol>
      </header>
      <div className={styles.documents}>{items.map((item) => <TermPages key={item.key} person={item} />)}</div>
    </main>
  );
}
