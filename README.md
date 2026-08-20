# Cadastro Eleitoral — Coordenadora Dainara Torres

Projeto Next.js para demonstração dos fluxos de liderança, ativistas e administração.

## Rodar localmente

```bash
npm install
npm run dev
```

## Fluxos de teste

- Login de liderança: CPF válido + título com 8 dígitos + código `328974`.
- Login administrativo: CPF válido + título com 8 dígitos + código `328974`.
- Cadastros de liderança e administrador: código de liberação `328974`.

## Recursos incluídos no teste

- Cadastros de liderança, administrador e ativista;
- Vínculo de ativista com liderança, inclusive alteração do vínculo pelo administrador;
- Painéis com contadores, busca e visão de quantidade por liderança;
- Visualização e edição de cada cadastro;
- Exportação de lideranças e ativistas em CSV;
- Link para a consulta oficial do TSE nos cadastros de liderança e ativista.

Os dados desta demonstração ficam somente no navegador. Antes de uso real, implemente autenticação e banco de dados protegidos no servidor.
