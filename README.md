# dropship-ia

Operação de dropshipping automatizada com agentes de IA — Brasil.

Stack: Next.js 14, React 18, Supabase, Nuvemshop.

## Instalação local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

## Variáveis de ambiente

Crie um arquivo `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=https://slmxtfqzweuhdcycgidn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_URL=https://slmxtfqzweuhdcycgidn.supabase.co
SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key-secreta>
NUVEMSHOP_APP_ID=<seu-app-id>
NUVEMSHOP_CLIENT_SECRET=<seu-client-secret-secreto>
NUVEMSHOP_ACCESS_TOKEN=<seu-access-token-secreto>
```

Não commita `.env.local` — ele fica listado em `.gitignore`.

## Deploy na Vercel

Conecte este repositório GitHub em `vercel.com/new` e configure as variáveis de ambiente no painel da Vercel.

## Estrutura

- `app/` — Next.js App Router (pages, layouts, API routes)
- `lib/` — Funções utilitárias (Supabase clients, Nuvemshop integration)
- `components/` — Componentes React (autenticação, pedidos, UI)
- `styles/` — CSS com design tokens
- `01_schema.sql` — Schema do banco Supabase (aplicado uma vez, não é rodar de novo)

## Status atual

- ✅ Banco de dados (Supabase)
- ✅ Autenticação (Supabase Auth)
- ✅ Painel de pedidos
- ✅ Webhook da Nuvemshop (implementado, não testado com dado real)
- ⏳ Integração completa com Nuvemshop OAuth (em desenvolvimento)
- ⏳ Deploy público (Vercel)

## Regras

- Tudo é real — não use APIs fictícias, fornecedores fictícios ou dados falsos.
- Nenhuma ação financeira automática — tudo passa por aprovação humana.
- RLS sempre habilitado no banco.
- Nunca commita secrets.
