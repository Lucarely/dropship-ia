// components/orders/StatusBadge.jsx
'use client';

const LABELS = {
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  enviado_fornecedor: 'Enviado ao fornecedor',
  em_transito: 'Em trânsito',
  entregue: 'Entregue',
  problema: 'Problema',
  cancelado: 'Cancelado',
};

export function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  return <span className={`op-badge op-badge-${status}`}>{label}</span>;
}
