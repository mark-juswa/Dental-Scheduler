import { useState, useEffect } from 'react';
import { registerToast, unregisterToast } from './toastService.js';

export function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    registerToast((msg, type) => {
      const id = Date.now() + Math.random();

      setToasts(prev => [...prev, { id, msg, type }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3200);
    });

    return () => unregisterToast();
  }, []);

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle'
  };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`fa ${icons[t.type] || 'fa-info-circle'}`} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}