// lib/supabaseServer.js
//
// Cliente Supabase para código que roda NO SERVIDOR dentro do Next.js
// (Server Components, Route Handlers) e que precisa saber "quem está
// logado" a partir dos cookies da requisição.
//
// Continua usando a ANON KEY (pública) + a sessão do cookie do
// usuário — RLS continua sendo quem decide o que essa sessão pode
// ler/escrever. Isto é DIFERENTE de lib/supabaseAdmin.js (service
// role), que é só para o webhook e outras rotas de backend que
// precisam ignorar RLS.
//
// PRECISO DE: as mesmas NEXT_PUBLIC_SUPABASE_URL e
// NEXT_PUBLIC_SUPABASE_ANON_KEY já usadas em lib/supabaseBrowser.js.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
