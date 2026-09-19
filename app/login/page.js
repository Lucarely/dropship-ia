// app/login/page.js
//
// Login por e-mail/senha usando Supabase Auth de verdade
// (supabase.auth.signInWithPassword). Não existe usuário fictício
// aqui — a tela só funciona com uma conta real criada no seu projeto
// Supabase (Authentication > Users, ou convite por e-mail).
//
// Depois do login, o middleware.js já redireciona automaticamente
// quem tentar acessar /login estando logado; aqui também navegamos
// para /painel/pedidos (ou para a rota que o usuário tentou acessar
// antes de cair no login, via ?redirectTo=).

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '../../styles/orders-panel.css';
import '../../styles/login.css';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

function translateAuthError(message) {
  if (!message) return 'Não foi possível entrar. Tente novamente.';
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (message.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento e tente de novo.';
  return 'Não foi possível entrar. Tente novamente.';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(translateAuthError(signInError.message));
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get('redirectTo') || '/painel/pedidos';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="op-login-wrap">
      <form className="op-login-card" onSubmit={handleSubmit} noValidate>
        <h1>Entrar no painel</h1>
        <p>Use o e-mail e a senha da sua conta na operação.</p>

        <label htmlFor="op-email">E-mail</label>
        <input
          id="op-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label htmlFor="op-password">Senha</label>
        <input
          id="op-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {error && (
          <div className="op-login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <button type="submit" className="op-btn-approve op-login-submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="op-login-wrap" />}>
      <LoginForm />
    </Suspense>
  );
}
