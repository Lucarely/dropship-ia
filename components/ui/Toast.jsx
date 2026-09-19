// components/ui/Toast.jsx
'use client';

import { useEffect } from 'react';

export function Toast({ message, kind = 'success', onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={`op-toast op-toast-${kind}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
