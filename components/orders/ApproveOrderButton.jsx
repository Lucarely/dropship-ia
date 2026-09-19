// components/orders/ApproveOrderButton.jsx
//
// Botão que só aparece para pedidos em 'aguardando_aprovacao'. Ao
// confirmar, chama o endpoint real /api/orders/[id]/approve (Etapa 3)
// com o token de sessão do usuário logado — quem decide se a pessoa
// TEM permissão é o endpoint (checando profiles.role), não o botão.
'use client';

import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

export function ApproveOrderButton({ order, onApproved, onError }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        onError('Sua sessão expirou. Faça login novamente para aprovar pedidos.');
        setBusy(false);
        setConfirming(false);
        return;
      }

      const res = await fetch(`/api/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const message = await res.text();
        onError(message || 'Não foi possível aprovar o pedido.');
        setBusy(false);
        setConfirming(false);
        return;
      }

      const result = await res.json();
      onApproved(order.id, result);
    } catch (err) {
      onError('Erro de conexão ao tentar aprovar o pedido. Tente novamente.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button type="button" className="op-btn-approve" onClick={() => setConfirming(true)}>
        Aprovar pedido
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Aprovar pedido ${order.order_number || order.platform_order_id}?`}
        description="Isso marca o pedido como aprovado no seu controle interno. O envio ao fornecedor e qualquer pagamento continuam manuais até essa integração existir."
        confirmLabel="Sim, aprovar"
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
