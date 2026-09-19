// components/orders/OrdersList.jsx
'use client';

import { StatusBadge } from './StatusBadge';
import { ApproveOrderButton } from './ApproveOrderButton';
import { formatCurrencyCents, formatDateTime } from '../../lib/format';

export function OrdersList({ loading, error, orders, canApprove, onApproved, onApproveError }) {
  if (loading) {
    return (
      <div aria-live="polite" aria-busy="true">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="op-skeleton-row" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="op-state op-state-error">
        <strong>Não foi possível carregar os pedidos</strong>
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="op-state">
        <strong>Nenhum pedido encontrado</strong>
        Assim que uma venda real chegar pela loja, ela aparece aqui automaticamente.
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="op-table-wrap">
        <table className="op-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Total</th>
              <th>Status</th>
              <th>Fornecedor</th>
              <th>Itens</th>
              <th>Pagamento</th>
              <th>Atualizado</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="op-cell-strong">{order.order_number || order.platform_order_id}</td>
                <td>
                  {order.customerName || <span className="op-cell-muted">Sem nome</span>}
                  <div className="op-cell-muted">{order.customerEmail || '—'}</div>
                </td>
                <td className="op-cell-muted">{formatDateTime(order.created_at)}</td>
                <td className="op-cell-strong">{formatCurrencyCents(order.total_cents, order.currency)}</td>
                <td><StatusBadge status={order.status} /></td>
                <td className="op-cell-muted">{order.supplierLabel}</td>
                <td>{order.itemCount}</td>
                <td className="op-cell-muted">{order.payment_status || '—'}</td>
                <td className="op-cell-muted">{formatDateTime(order.updated_at)}</td>
                <td>
                  {canApprove && order.status === 'aguardando_aprovacao' && (
                    <ApproveOrderButton order={order} onApproved={onApproved} onError={onApproveError} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="op-cards">
        {orders.map((order) => (
          <div className="op-card" key={order.id}>
            <div className="op-card-top">
              <div>
                <div className="op-card-number">{order.order_number || order.platform_order_id}</div>
                <div className="op-card-customer">
                  {order.customerName || 'Sem nome'} · {order.customerEmail || 'sem e-mail'}
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <dl className="op-card-grid">
              <dt>Data</dt>
              <dd>{formatDateTime(order.created_at)}</dd>
              <dt>Total</dt>
              <dd>{formatCurrencyCents(order.total_cents, order.currency)}</dd>
              <dt>Fornecedor</dt>
              <dd>{order.supplierLabel}</dd>
              <dt>Itens</dt>
              <dd>{order.itemCount}</dd>
              <dt>Pagamento</dt>
              <dd>{order.payment_status || '—'}</dd>
              <dt>Atualizado</dt>
              <dd>{formatDateTime(order.updated_at)}</dd>
            </dl>

            {canApprove && order.status === 'aguardando_aprovacao' && (
              <ApproveOrderButton order={order} onApproved={onApproved} onError={onApproveError} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
