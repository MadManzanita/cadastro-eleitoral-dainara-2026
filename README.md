# Cadastro Eleitoral • Coordenadora Dainara Torres

Projeto-base funcional para testes, GitHub e Vercel.

## O que já está incluído
- Tela inicial com acesso de liderança, cadastro de liderança, acesso administrativo e cadastro de administrador.
- Código de liberação de teste: `328974` para liderança e administrador.
- Login de liderança e administrador com CPF + 8 dígitos do título.
- Cadastro completo de liderança, ativista e administrador.
- Validação matemática de CPF.
- Validação estrutural do título (8 a 12 dígitos); isso não confirma situação eleitoral regular.
- Consulta oficial do TSE somente nos formulários de liderança e ativista.
- Área da liderança com lista de ativistas, vínculo automático, cadastro de ativista e área de contatos de assessores.
- Área administrativa com dashboard, pesquisa, lista de lideranças, ativistas, vínculo, edição, atividade recente e exportação CSV.
- Layout rosa pastel/branco, responsivo.
- `localStorage` como banco temporário de demonstração para o sistema funcionar imediatamente.

## Arquitetura planejada para produção
A versão oficial deve trocar o `localStorage` por Supabase/PostgreSQL e autenticação real, com perfis e permissões diferentes para `admin` e `liderança`, RLS, backend protegido, variáveis de ambiente, HTTPS e backups.

O código de liberação está no código apenas para testes. Na produção ele deve ser validado no backend e não ficar exposto no repositório público.

## Rodar
```bash
npm install
npm run dev
```

## Vercel
Conecte o repositório ao Vercel. O `vercel.json` e o `package.json` já estão preparados para Next.js.
