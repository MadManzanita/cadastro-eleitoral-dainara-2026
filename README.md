# Cadastro Eleitoral — Coordenadora Dainara Torres

Projeto Next.js para demonstração dos fluxos de liderança, ativistas e administração.

## Rodar localmente

```bash
npm install
npm run dev
```

## Acesso restrito

- Login de liderança: CPF válido + título com 8 dígitos + código de acesso autorizado.
- Login administrativo: CPF válido + título com 8 dígitos + código de acesso autorizado.
- Cadastros de liderança e administrador: código de liberação privado.

Antes de publicar, crie a variável de ambiente `RELEASE_CODE` no painel da Vercel. Não publique o arquivo `.env` nem o código de acesso no GitHub.

## Recursos incluídos no teste

- Cadastros de liderança, administrador e ativista;
- Vínculo de ativista com liderança, inclusive alteração do vínculo pelo administrador;
- Painéis com contadores, busca e visão de quantidade por liderança;
- Visualização e edição de cada cadastro;
- Exportação de lideranças e ativistas em CSV;
- Link para a consulta oficial do TSE nos cadastros de liderança e ativista.

Os dados desta demonstração ficam somente no navegador. Para uso oficial, a próxima etapa é migrá-los para um banco de dados protegido e implantar contas, sessões e permissões reais no servidor.
