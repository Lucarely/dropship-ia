// components/auth/LogoutButton.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabaseBrowser.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" className="op-btn-ghost" onClick={handleLogout} disabled={loading}>
      {loading ? 'Saindo…' : 'Sair'}
    </button>
  );
}
