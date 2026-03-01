import { useState, useEffect } from 'react';
import { useApp } from '../context/useApp.js';
import { auditApi } from '../services/apiServices.js';
import { showToast } from '../ui/toastService.js';

const PHT = 'Asia/Manila';

export default function AuditPage() {
  const { actions } = useApp();
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.getAll()
      .then(data => { setAuditLog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function clearAll() {
    actions.openConfirm({
      title: 'Clear Audit Log',
      msg: 'Delete all audit records?',
      onOk: async () => {
        try {
          await auditApi.clear();
          setAuditLog([]);
          actions.closeConfirm();
          showToast('Cleared', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  return (
    <div className="view active" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div className="view-scroll">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Audit Log</h2>
            <p style={{ fontSize: 12, color: 'var(--text-m)' }}>All system actions and changes</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            <i className="fa fa-trash"></i> Clear All
          </button>
        </div>
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="empty-state"><i className="fa fa-spinner fa-spin"></i><p>Loading…</p></div>
            ) : !auditLog.length ? (
              <div className="empty-state"><i className="fa fa-history"></i><p>No audit records</p></div>
            ) : auditLog.map(l => {
              const dt = new Intl.DateTimeFormat('en-PH', { timeZone: PHT, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(l.timestamp));
              return (
                <div key={l.id} className="audit-row">
                  <div className="audit-icon" style={{ background: l.bg, color: l.color }}>
                    <i className={`fa ${l.icon}`}></i>
                  </div>
                  <div className="audit-content">
                    <strong>
                      {l.action}{' '}
                      <span style={{ fontWeight: 400, color: 'var(--text-m)', fontSize: 12 }}>— {l.detail}</span>
                    </strong>
                    <span>
                      <i className="fa fa-clock" style={{ fontSize: 9, marginRight: 3 }}></i>
                      {dt} PHT
                      {l.userEmail && <span style={{ marginLeft: 6, opacity: 0.6 }}>by {l.userEmail}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}