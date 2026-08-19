# Cadastro Eleitoral • Coordenadora Dainara Torres

Base para GitHub + Vercel + Supabase.

Inclui:
- Interface rosa pastel/branco responsiva.
- Fluxos de Liderança e Administrador.
- Código de liberação para novos acessos.
- Cadastro de lideranças e ativistas e vínculo entre eles.
- Validação local de CPF e do formato do título.
- Botão para consulta oficial do TSE.
- Estrutura PostgreSQL/Supabase com RLS.
- `.env.example` sem credenciais.

## Configuração
1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Rode `npm install` e `npm run dev`.
5. No Vercel, configure as mesmas variáveis e faça o deploy.

Nunca publique `SUPABASE_SERVICE_ROLE_KEY`.

A validação local do título não informa regularidade, suspensão ou cancelamento; o botão TSE abre a consulta oficial.
