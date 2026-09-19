// components/ui/ConfirmDialog.jsx
'use client';

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, busy }) {
  if (!open) return null;

  return (
    <div className="op-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="op-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="op-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="op-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="op-dialog-actions">
          <button type="button" className="op-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="op-btn-approve" onClick={onConfirm} disabled={busy}>
            {busy ? 'Aprovando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
