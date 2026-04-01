import { useState } from 'react';
import { useApp } from '../context/useApp.js';
import { clientsApi } from '../services/apiServices.js';
import { showToast } from '../ui/toastService.js';
import { PROC_LABELS } from '../utils/constants.js';
import { useProcColors } from '../hooks/useProcColors.js';

export default function ClientsPage() {
  const { state, actions } = useApp();
  const PROC_COLORS = useProcColors();
  const { clients, appointments, settings } = state;
  const [search, setSearch] = useState('');
  const [historyClient, setHistoryClient] = useState(null);

  const dr1Name = settings.dr1Name || 'Dr. A';
  const dr2Name = settings.dr2Name || 'Dr. B';

  const q = search.toLowerCase();
  const filtered = clients.filter(c =>
    !q || (c.firstName + ' ' + c.lastName + c.contactNumber + (c.address || '')).toLowerCase().includes(q)
  );

  async function deleteClient(c) {
    actions.openConfirm({
      title: 'Delete Client',
      msg: `Remove ${c.firstName} ${c.lastName} from client records?`,
      onOk: async () => {
        try {
          await clientsApi.delete(c.id);
          actions.deleteClient(c.id);
          actions.closeConfirm();
          showToast('Client removed', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  function viewHistory(c) {
    setHistoryClient(c);
  }

  const clientAppts = (c) => appointments.filter(a => a.firstName === c.firstName && a.lastName === c.lastName);
  const lastVisit = (c) => {
    const done = clientAppts(c).filter(a => a.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));
    return done[0]?.date || null;
  };

  return (
    <div className="view active" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div className="view-scroll">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Client Records</h2>
            <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Manage all registered patients</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => actions.openClientModal()}>
            <i className="fa fa-plus"></i> Add Client
          </button>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>All Clients</h3>
            <div className="search-box" style={{ maxWidth: 200 }}>
              <i className="fa fa-search"></i>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="client-table">
              <thead>
                <tr>
                  <th>Name</th><th>Contact</th><th>Address</th>
                  <th>Last Visit</th><th>Visits</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><i className="fa fa-users"></i><p>No clients found</p></div>
                  </td></tr>
                ) : filtered.map(c => {
                  const appts = clientAppts(c);
                  const last = lastVisit(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div className="avatar">
                            {(c.firstName[0] || '').toUpperCase()}{(c.lastName[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ fontSize: 13 }}>{c.firstName} {c.middleName ? c.middleName + ' ' : ''}{c.lastName}</strong>
                            {c.facebookUrl && (
                              <><br /><a href={c.facebookUrl} target="_blank" rel="noopener" style={{ fontSize: 10, color: 'var(--accent)' }}><i className="fab fa-facebook"></i> FB</a></>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{c.contactNumber}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-m)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</td>
                      <td style={{ fontSize: 11 }}>{last || <span style={{ color: 'var(--text-l)' }}>Never</span>}</td>
                      <td><span className="status-badge status-confirmed">{appts.length}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-ghost btn-sm" onClick={() => viewHistory(c)} title="History"><i className="fa fa-history"></i></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => actions.openClientModal(c.id)} title="Edit"><i className="fa fa-edit"></i></button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteClient(c)} title="Delete"><i className="fa fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {historyClient && (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && setHistoryClient(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>History — {historyClient.firstName} {historyClient.middleName ? historyClient.middleName + ' ' : ''}{historyClient.lastName}</h3>
              <button className="close-btn" onClick={() => setHistoryClient(null)}><i className="fa fa-times"></i></button>
            </div>
            <div className="modal-body">
              {(() => {
                const appts = appointments.filter(a => a.firstName === historyClient.firstName && a.lastName === historyClient.lastName).sort((a, b) => b.date.localeCompare(a.date));
                if (!appts.length) return <div className="empty-state"><i className="fa fa-calendar-times"></i><p>No appointment history</p></div>;
                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="client-table">
                      <thead><tr><th>Date (PHT)</th><th>Time</th><th>Procedure</th><th>Doctor</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
                      <tbody>
                        {appts.map(a => {
                          const c = PROC_COLORS[a.procedure] || PROC_COLORS.other;
                          return (
                            <tr key={a.id}>
                              <td><strong>{a.date}</strong></td>
                              <td>{a.startTime}–{a.endTime}</td>
                              <td><span className="proc-chip" style={{ background: c.bg, color: c.text }}>{PROC_LABELS[a.procedure] || 'Other'}</span></td>
                              <td style={{ fontSize: 11, color: 'var(--text-m)' }}>{a.doctor === 'dr2' ? dr2Name : dr1Name}</td>
                              <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                              <td style={{ fontSize: 11, color: 'var(--text-m)' }}>{a.notes || '—'}</td>
                              <td>
                                <div className="action-btns">
                                  <button className="btn btn-ghost btn-sm" onClick={() => { actions.openApptModal(a.id); setHistoryClient(null); }}><i className="fa fa-edit"></i></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}