# Cadastro Eleitoral • Coordenadora Dainara Torres

Protótipo funcional para GitHub + Vercel.

## Código de teste

`328974`

Ele libera:
- acesso administrativo;
- acesso da liderança;
- tornar-se administrador;
- tornar-se liderança.

## Funcionalidades do protótipo

- Login administrativo e de liderança.
- Cadastro e edição de lideranças.
- Cadastro e edição de ativistas.
- Vínculo automático de ativistas à liderança selecionada.
- Área da liderança mostrando apenas seus ativistas.
- Dashboard administrativo.
- Pesquisa de lideranças e ativistas.
- Página individual de liderança.
- Página individual de ativista.
- Validação de CPF.
- Validação estrutural do título eleitoral (8 dígitos).
- Link para consulta oficial do TSE nos formulários.
- Exportação CSV.
- Persistência local via `localStorage` para testes.

## Importante

Esta versão é um protótipo de teste. Os dados ainda ficam no navegador. Para produção, o próximo passo é conectar autenticação e banco centralizado ao Supabase, com autorização por perfil, backend protegido, backups e credenciais fora do código público.

## Executar

```bash
npm install
npm run dev
```
