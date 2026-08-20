import "./styles.css";

export const metadata = {
  title: "Cadastro Eleitoral | Coordenadora Dainara Torres",
  description: "Portal de cadastro e acompanhamento de equipes"
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
