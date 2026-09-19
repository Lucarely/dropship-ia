// middleware.js  (raiz do projeto Next.js)
//
// Roda no servidor, antes de cada requisição às rotas listadas em
// `config.matcher`. Usa a sessão gravada em cookie (ver
// lib/supabaseBrowser.js) para decidir:
//   - /painel/* sem sessão  -> redireciona para /login
//   - /login com sessão já ativa -> redireciona para /painel/pedidos
//
// Isso é proteção de ROTA. A proteção de DADO continua sendo o RLS
// do banco (01_schema.sql) — mesmo que alguém burle o redirecionamento,
// a API do Supabase não devolve linha nenhuma sem uma sessão válida
// com papel autorizado.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith('/painel');
  const isLoginPage = pathname === '/login';

  if (isProtected && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPage && session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/painel/pedidos';
    redirectUrl.searchParams.delete('redirectTo');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/painel/:path*', '/login'],
};
