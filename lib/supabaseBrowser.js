// lib/supabaseBrowser.js
//
// Cliente Supabase para uso NO NAVEGADOR (painel administrativo).
// Usa a ANON KEY, que é pública por design — a segurança real vem do
// RLS configurado no banco (01_schema.sql) + do login do usuário.
//
// NUNCA importe supabaseAdmin (service role) em nenhum arquivo que
// roda no cliente. Este arquivo é o único cliente Supabase permitido
// em componentes React do painel.
//
// PRECISO DE (variáveis de ambiente expostas ao navegador — no Next.js
// precisam do prefixo NEXT_PUBLIC_):
//   NEXT_PUBLIC_SUPABASE_URL      -> Supabase > Project Settings > API
//   NEXT_PUBLIC_SUPABASE_ANON_KEY -> mesma página, campo "anon public"

'use client';

// A partir da Etapa 5 (login), usamos @supabase/ssr em vez de
// @supabase/supabase-js puro: essa versão guarda a sessão em cookies
// (não só em localStorage), que é o que permite ao middleware.js
// (rodando no servidor, a cada requisição) saber se o usuário está
// logado antes de renderizar /painel/*.
//
// PRECISO DE: `npm install @supabase/ssr` no projeto.
import { createBrowserClient } from '@supabase/ssr';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'PRECISO DE: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY configurados no ambiente do frontend.'
  );
}

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
