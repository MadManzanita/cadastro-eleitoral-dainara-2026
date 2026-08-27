# Cadastro Eleitoral • Coordenadora Dainara Torres

Versão funcional de teste, pronta para GitHub + Vercel.

## Código de teste

**328974** — 6 dígitos.

O mesmo código libera:
- Já sou liderança → Área da Liderança
- Acesso administrativo → Área Administrativa
- Se torne liderança → formulário completo de cadastro
- Se tornar administrador → formulário de cadastro de administrador

## O que está funcionando no modo de teste

### Acesso
- Dois perfis separados: Liderança e Administrador.
- Navegação funcional após clicar em Entrar.
- Sessão de teste por perfil.
- Logout.
- Liderança pode acessar apenas sua própria área.
- Administrador possui visão centralizada de todas as lideranças e ativistas.

### Liderança
- Cadastro/edição do próprio perfil.
- Cadastro de novos ativistas.
- Vínculo automático dos ativistas à liderança logada.
- Lista apenas dos próprios ativistas.
- Visualização individual de ativista.
- Edição dos próprios ativistas.
- Contatos da assessoria da coordenadora.
- Resumo da equipe.
- Acesso à Rede de confiança.

### Rede de confiança / Família
- Rota pública `/familia` para iniciar o cadastro da rede de confiança.
- O conceito de Família representa as pessoas que têm o voto de confiança do ativista, e não necessariamente parentes.
- O ativista é reconhecido pelo CPF.
- O acesso de teste usa código temporário de 6 dígitos; em produção será integrado ao SMSGo.
- Cada ativista pode gerar um link individual de sua rede de confiança.
- O cadastro da pessoa fica vinculado ao ativista e à liderança responsável.
- Dados cadastrais são convertidos para CAIXA ALTA.
- O schema de produção já possui a estrutura para `families` e `family_token`.

### Administrador
- Dashboard com total de lideranças, ativistas e equipes.
- Cadastros recentes.
- Atividade recente.
- Pesquisa de lideranças e ativistas por nome, CPF ou título.
- Lista geral de ativistas com liderança vinculada.
- Página individual da liderança.
- Lista de ativistas vinculados à liderança.
- Página individual de ativista.
- Edição de lideranças e ativistas.
- Cadastro de nova liderança.
- Cadastro de administrador.
- Exportação CSV de dados consolidados.

### Formulários
- Dados pessoais.
- Dados eleitorais.
- Título de eleitor com exatamente 12 dígitos.
- Dados de pagamento.
- Validação matemática de CPF.
- Link “Consultar situação no TSE” somente nos formulários de liderança/ativista.
- O sistema não considera um título estruturalmente válido como situação eleitoral regular.
- Campos cadastrais em CAIXA ALTA.

### Persistência de teste
Os dados ficam salvos no `localStorage` do navegador. Isso permite testar o fluxo sem Supabase.

## Produção

A pasta `supabase/` contém o schema inicial para a próxima etapa: autenticação real, banco centralizado, permissões por perfil, RLS, backups, persistência em nuvem e rede de confiança.

A integração de SMS continuará prevista para o SMSGo, com códigos temporários gerados no servidor.

Não coloque chaves secretas no código público. Use as variáveis de ambiente da Vercel.

## Vercel

O projeto é Next.js e possui `vercel.json` com o framework definido como `nextjs`.

Na Vercel, o **Root Directory** deve apontar para a pasta que contém `package.json` e `app/`.

Comandos:

```bash
npm install
npm run build
npm start
```
