# Recuperação de senha por SMS

Inclui liderança (`/portal`) e ativista (`/familia?lideranca=...`). Não altera o acesso administrativo.

## Ativação

1. Aplicar `supabase/migrations/008_password_recovery.sql` no SQL Editor do **mesmo projeto Supabase usado pelo site**, depois das migrações 001–007 existentes. A migração cria tabelas e funções exclusivas da recuperação e não apaga cadastros.
2. Na Vercel, conferir `SMSGO_KEY` nas variáveis do servidor para Production. Usar a chave da conta SMSGo com créditos; não colocar no GitHub, no navegador, nem em variável com prefixo `NEXT_PUBLIC_`. Se houver Preview, usar a chave de teste e banco de teste nesse ambiente.
3. Manter `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `SESSION_SECRET` já usados pelo site. A última precisa ter pelo menos 32 caracteres. Não trocar a chave de sessão existente apenas para esta instalação.
4. Publicar os arquivos e realizar um novo deploy na Vercel.
5. Validar com uma liderança e um ativista de teste autorizados: solicitar SMS, informar código e nova senha, confirmar que a nova senha entra e a anterior falha. Não usar dados ou celulares de terceiros para teste.

## Funcionamento

- Link “Esqueci minha senha” nos dois acessos (também na identificação do ativista).
- CPF identifica a conta; para ativistas, o vínculo da liderança vem do link.
- O código de seis números vai **somente** para o celular que já está no cadastro, com DDD brasileiro. O formulário não aceita um telefone alternativo.
- A nova senha mantém o formato atual de oito números, com confirmação.
- Validade de cinco minutos, até cinco tentativas. Reenviar invalida o código anterior.
- Limite de uma solicitação por minuto e cinco por hora por conta; até vinte por hora por IP. O telefone também tem limite de cinco envios por hora, compartilhado entre contas.
- Apenas hashes dos códigos ficam no banco; a validação e a troca da credencial acontecem na mesma transação. As tabelas/funções não são acessíveis por usuários anônimos ou autenticados comuns.
- Se o celular mudou depois do envio, o código é recusado. Lideranças arquivadas e seus ativistas não podem recuperar acesso.
- Registros de recuperação com mais de dois dias são removidos durante novas solicitações. Nenhum cadastro é removido.
- O serviço de SMS é usado apenas para enviar o código. CPF, nova senha e demais dados do cadastro não são enviados ao SMSGo.

## Limitações e suporte

Celular ausente, telefone fixo ou número desatualizado precisam ser corrigidos pela coordenação, após conferir a identidade da pessoa. Receber SMS depende da operadora e do saldo/provedor. A resposta inicial não confirma se o CPF existe.

Esta alteração mantém o mecanismo atual de sessões. A senha antiga deixa de funcionar para novos logins, mas sessões já abertas seguem sua validade existente. O primeiro acesso do ativista e a redefinição feita pelo administrador continuam como antes.

## Verificação local

`pnpm install --frozen-lockfile`

`node --test tests/password-recovery.test.mjs`

`node node_modules/next/dist/bin/next build`

Os testes usam PostgreSQL local em memória (PGlite), dados fictícios e não enviam SMS. Exercitam a migração e suas permissões, alteração dos dois tipos de credencial, uso único, validade, bloqueio por tentativas, reenvio, alteração de telefone e limites. Entrega real e configuração de produção precisam ser verificadas no ambiente autorizado.
