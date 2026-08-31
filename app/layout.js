import "./globals.css";

export const metadata = {
  title: "Cadastro Eleitoral • Coordenadora Dainara Torres",
  description: "Portal de acesso, cadastro e gestão de lideranças e ativistas.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
