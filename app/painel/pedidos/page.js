// app/painel/pedidos/page.js
//
// Tela do painel administrativo: lista de pedidos com filtros, busca
// e o botão "Aprovar pedido". Usa APENAS o cliente Supabase do
// navegador (anon key + sessão do usuário) — a leitura de dados é
// protegida pelas policies de RLS criadas em 01_schema.sql
// (current_role_is('viewer') para SELECT em public.orders etc.).
//
// A partir da Etapa 5, o acesso a esta rota já é protegido pelo
// middleware.js (redireciona para /login sem sessão). O que fazemos
// aqui além disso: buscar o papel (role) do usuário logado em
// public.profiles, para decidir se ele vê o botão "Aprovar pedido"
// (admin/operator) ou só visualiza (viewer) — sem duplicar a regra de
// segurança, que continua sendo aplicada de verdade pelo endpoint da
// Etapa 3 e pelo RLS do banco.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import '../../../styles/orders-panel.css';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import { OrdersToolbar } from '../../../components/orders/OrdersToolbar';
import { OrdersList } from '../../../components/orders/OrdersList';
import { Toast } from '../../../components/ui/Toast';
import { LogoutButton } from '../../../components/auth/LogoutButton';

// Quantos pedidos mais recentes carregamos de uma vez. Para operações
// maiores, o próximo passo natural é paginação server-side — não
// implementada agora porque ainda não há volume real para justificar.
const PAGE_SIZE = 200;

function matchesFilter(status, filterKey) {
  if (filterKey === 'todos') return true;
  if (filterKey === 'enviados') return status === 'enviado_fornecedor' || status === 'em_transito';
  if (filterKey === 'problemas') return status === 'problema' || status === 'cancelado';
  return status === filterKey;
}

function matchesSearch(order, term) {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  return (
    (order.order_number || '').toLowerCase().includes(needle) ||
    (order.platform_order_id || '').toLowerCase().includes(needle) ||
    (order.customerName || '').toLowerCase().includes(needle) ||
    (order.customerEmail || '').toLowerCase().includes(needle)
  );
}

export default function OrdersPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState(null); // 'admin' | 'operator' | 'viewer' | null

  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const session = data?.session;
      setAuthenticated(!!session);

      if (session) {
        // profiles tem policy "profiles_self_select": o usuário sempre
        // pode ler o próprio papel, mesmo sem ser admin.
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || null);
      }

      setAuthChecked(true);
    });
  }, []);

  const canApprove = role === 'admin' || role === 'operator';

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabaseBrowser
      .from('orders')
      .select(`
        id, platform_order_id, order_number, status, total_cents, currency,
        payment_status, created_at, updated_at,
        customers ( name, email ),
        order_items ( id, suppliers ( name ) )
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((o) => {
      const supplierNames = Array.from(
        new Set((o.order_items || []).map((item) => item.suppliers?.name).filter(Boolean))
      );
      return {
        id: o.id,
        platform_order_id: o.platform_order_id,
        order_number: o.order_number,
        status: o.status,
        total_cents: o.total_cents,
        currency: o.currency,
        payment_status: o.payment_status,
        created_at: o.created_at,
        updated_at: o.updated_at,
        customerName: o.customers?.name || null,
        customerEmail: o.customers?.email || null,
        itemCount: (o.order_items || []).length,
        supplierLabel: supplierNames.length > 0 ? supplierNames.join(' + ') : 'A definir',
      };
    });

    setRawOrders(normalized);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) loadOrders();
  }, [authenticated, loadOrders]);

  const visibleOrders = useMemo(
    () => rawOrders.filter((o) => matchesFilter(o.status, filter) && matchesSearch(o, search)),
    [rawOrders, filter, search]
  );

  function handleApproved(orderId) {
    setRawOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'aprovado', updated_at: new Date().toISOString() } : o))
    );
    setToast({ kind: 'success', message: 'Pedido aprovado.' });
  }

  function handleApproveError(message) {
    setToast({ kind: 'error', message });
  }

  if (!authChecked) {
    return (
      <div className="op-panel">
        <div className="op-skeleton-row" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="op-panel">
        <div className="op-state">
          <strong>Sua sessão não está mais ativa</strong>
          Isso não deveria acontecer — o middleware já deveria ter te levado para /login. Se aparecer, atualize a página.
        </div>
      </div>
    );
  }

  return (
    <div className="op-panel">
      <header className="op-header op-header-row">
        <div>
          <h1>Pedidos</h1>
          <p>Toda venda entra como &quot;Aguardando aprovação&quot; — nada é enviado ao fornecedor sem sua confirmação.</p>
        </div>
        <LogoutButton />
      </header>

      <OrdersToolbar
        activeFilter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <OrdersList
        loading={loading}
        error={loadError}
        orders={visibleOrders}
        canApprove={canApprove}
        onApproved={handleApproved}
        onApproveError={handleApproveError}
      />

      <Toast message={toast?.message} kind={toast?.kind} onDismiss={() => setToast(null)} />
    </div>
  );
}
