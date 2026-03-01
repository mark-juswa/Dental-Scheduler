import { useApp } from '../context/useApp.js';
import { todayPHT, fmtDate } from '../utils/calendarHelpers.js';
import { PROC_LABELS } from '../utils/constants.js';
import { useProcColors } from '../hooks/useProcColors.js';
import { useMemo } from 'react';

export default function AnalyticsPage() {
  const { state } = useApp();
  const PROC_COLORS = useProcColors();
  const { appointments, clients, settings } = state;
  const dr1Name = settings.dr1Name || 'Dr. A';
  const dr2Name = settings.dr2Name || 'Dr. B';

  const t = todayPHT();
const next7 = useMemo(() => {
  const today = new Date(`${t}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return fmtDate(d);
  });
}, [t]);

  const total     = appointments.length;
  const pending   = appointments.filter(a => a.status === 'pending').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const todayN    = appointments.filter(a => a.date === t).length;
  const upcoming  = appointments.filter(a => next7.includes(a.date) && a.status !== 'cancelled').length;

  const statCards = [
    { icon: 'fa-calendar-check', color: '#2563eb', bg: '#dbeafe', num: total,          label: 'Total Appointments' },
    { icon: 'fa-clock',          color: '#d97706', bg: '#fef3c7', num: pending,         label: 'Pending' },
    { icon: 'fa-check-circle',   color: '#059669', bg: '#d1fae5', num: completed,       label: 'Completed' },
    { icon: 'fa-ban',            color: '#64748b', bg: '#f1f5f9', num: cancelled,       label: 'Cancelled' },
    { icon: 'fa-calendar-day',   color: '#0891b2', bg: '#cffafe', num: todayN,          label: 'Today (PHT)' },
    { icon: 'fa-users',          color: '#7c3aed', bg: '#ede9fe', num: clients.length,  label: 'Total Clients' },
    { icon: 'fa-calendar-alt',   color: '#ea580c', bg: '#ffedd5', num: upcoming,        label: 'Upcoming 7 Days' },
  ];

  // Procedure distribution
  const pc = {};
  appointments.forEach(a => { pc[a.procedure] = (pc[a.procedure] || 0) + 1; });
  const mx = Math.max(...Object.values(pc), 1);
  const procEntries = Object.entries(pc).sort((a, b) => b[1] - a[1]);

  // Status breakdown
  const statusColors = { pending: '#f59e0b', confirmed: '#3b82f6', completed: '#10b981', cancelled: '#94a3b8' };

  // Upcoming list
  const upcomingList = appointments
    .filter(a => next7.includes(a.date) && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div className="view active" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div className="view-scroll">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Analytics</h2>
          <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Clinic performance overview</p>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                <i className={`fa ${s.icon}`}></i>
              </div>
              <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-header"><h3>Appointments by Procedure</h3></div>
            <div className="card-body">
              {procEntries.length ? procEntries.map(([p, cnt]) => {
                const c = PROC_COLORS[p] || PROC_COLORS.other;
                return (
                  <div key={p} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: c.text }}>{PROC_LABELS[p] || p}</span>
                      <span style={{ color: 'var(--text-m)' }}>{cnt}</span>
                    </div>
                    <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                      <div style={{ width: `${(cnt / mx) * 100}%`, background: c.border, height: '100%', borderRadius: 4, transition: '.4s' }}></div>
                    </div>
                  </div>
                );
              }) : <div className="empty-state"><i className="fa fa-chart-bar"></i><p>No data yet</p></div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Status Breakdown</h3></div>
            <div className="card-body">
              {Object.entries(statusColors).map(([s, col]) => {
                const cnt = appointments.filter(a => a.status === s).length;
                const pct = total ? Math.round(cnt / total * 100) : 0;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: col }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{cnt} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-header"><h3>Upcoming Appointments — Next 7 Days (PHT)</h3></div>
          <div className="card-body">
            {!upcomingList.length ? (
              <div className="empty-state"><i className="fa fa-calendar-check"></i><p>No upcoming appointments</p></div>
            ) : upcomingList.map(a => {
              const c = PROC_COLORS[a.procedure] || PROC_COLORS.other;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.border, fontSize: 15, flexShrink: 0 }}>
                    <i className="fa fa-tooth"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <strong style={{ fontSize: 13 }}>{a.firstName} {a.lastName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-m)' }}>{a.date} · {a.startTime}–{a.endTime} · {a.doctor === 'dr2' ? dr2Name : dr1Name}</div>
                  </div>
                  <span className="proc-chip" style={{ background: c.bg, color: c.text }}>{PROC_LABELS[a.procedure] || 'Other'}</span>
                  <span className={`status-badge status-${a.status}`}>{a.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}