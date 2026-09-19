// components/orders/OrdersToolbar.jsx
'use client';

export const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { key: 'aprovado', label: 'Aprovados' },
  // "Enviados" agrupa os dois status de logística em andamento.
  { key: 'enviados', label: 'Enviados' },
  { key: 'entregue', label: 'Entregues' },
  // "Problemas" agrupa problema + cancelado.
  { key: 'problemas', label: 'Problemas' },
];

export function OrdersToolbar({ activeFilter, onFilterChange, search, onSearchChange }) {
  return (
    <div className="op-toolbar">
      <div className="op-filters" role="tablist" aria-label="Filtrar pedidos por status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={activeFilter === f.key}
            data-active={activeFilter === f.key}
            className="op-filter-btn"
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="op-search">
        <input
          type="search"
          inputMode="search"
          placeholder="Buscar por número, cliente ou e-mail"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar pedidos"
        />
      </div>
    </div>
  );
}
