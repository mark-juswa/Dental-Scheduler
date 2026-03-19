import { useApp } from '../context/useApp.js';
import { todayPHT, fmtDate } from '../utils/calendarHelpers.js';
import { PROC_LABELS, DOCTOR_COLORS } from '../utils/constants.js';
import { useProcColors } from '../hooks/useProcColors.js';
import { useMemo, useState } from 'react';

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

  // ── Doctor Overview state ─────────────────────────────────────────────────
  const [dateFilter, setDateFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  // Compute date range for the selected filter
  const dateRange = useMemo(() => {
    const todayDate = new Date(`${t}T00:00:00`);
    switch (dateFilter) {
      case 'today':
        return { from: t, to: t };
      case 'tomorrow': {
        const tmr = new Date(todayDate);
        tmr.setDate(tmr.getDate() + 1);
        const tmrStr = fmtDate(tmr);
        return { from: tmrStr, to: tmrStr };
      }
      case 'week': {
        const endOfWeek = new Date(todayDate);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return { from: t, to: fmtDate(endOfWeek) };
      }
      case 'month': {
        const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        return { from: t, to: fmtDate(endOfMonth) };
      }
      case 'all':
      default:
        return null; // no date filter
    }
  }, [dateFilter, t]);

  // Filter appointments by date range and search, then split by doctor
  const filteredAppts = useMemo(() => {
    let list = [...appointments];
    // Date filter
    if (dateRange) {
      list = list.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        (a.contactNumber || '').toLowerCase().includes(q)
      );
    }
    // Sort by date + time
    list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    return list;
  }, [appointments, dateRange, searchQuery]);

  const dr1Appts = filteredAppts.filter(a => a.doctor === 'dr1' || !a.doctor);
  const dr2Appts = filteredAppts.filter(a => a.doctor === 'dr2');

  // Date filter buttons config
  const dateFilters = [
    { key: 'today',    label: 'Today',      icon: 'fa-calendar-day' },
    { key: 'tomorrow', label: 'Tomorrow',   icon: 'fa-calendar-plus' },
    { key: 'week',     label: 'This Week',  icon: 'fa-calendar-week' },
    { key: 'month',    label: 'This Month', icon: 'fa-calendar-alt' },
    { key: 'all',      label: 'All',        icon: 'fa-infinity' },
  ];

  // Render a doctor panel
  function DoctorPanel({ doctor, name, appts, color }) {
    const panelPending   = appts.filter(a => a.status === 'pending').length;
    const panelCompleted = appts.filter(a => a.status === 'completed').length;
    const panelConfirmed = appts.filter(a => a.status === 'confirmed').length;
    const panelCancelled = appts.filter(a => a.status === 'cancelled').length;

    const miniStats = [
      { label: 'Total',     num: appts.length, col: color },
      { label: 'Pending',   num: panelPending,   col: '#d97706' },
      { label: 'Confirmed', num: panelConfirmed,  col: '#3b82f6' },
      { label: 'Completed', num: panelCompleted, col: '#059669' },
      { label: 'Cancelled', num: panelCancelled,  col: '#94a3b8' },
    ];

    return (
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div className="card-header" style={{ borderBottom: `3px solid ${color}` }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-user-md" style={{ color }}></i> {name}
          </h3>
          <span style={{
            fontSize: 11, fontWeight: 700, background: color, color: '#fff',
            padding: '2px 10px', borderRadius: 20,
          }}>{appts.length} appointment{appts.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Mini stats row */}
        <div style={{
          display: 'flex', gap: 2, padding: '10px 14px',
          borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
          {miniStats.map(s => (
            <div key={s.label} style={{
              flex: 1, minWidth: 60, textAlign: 'center', padding: '6px 4px',
              borderRadius: 8, background: 'var(--surface-2)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.col }}>{s.num}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-m)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Appointment list */}
        <div className="card-body" style={{ padding: 0, maxHeight: 400, overflowY: 'auto' }}>
          {appts.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-l)' }}>
              <i className="fa fa-calendar-times" style={{ fontSize: 28, marginBottom: 8, display: 'block', opacity: 0.5 }}></i>
              <p style={{ fontSize: 12, fontWeight: 600 }}>No appointments found</p>
              <p style={{ fontSize: 11 }}>Try changing the date filter or search</p>
            </div>
          ) : appts.map((a, idx) => {
            const c = PROC_COLORS[a.procedure] || PROC_COLORS.other;
            const isCancelled = a.status === 'cancelled';
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                borderBottom: idx < appts.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: isCancelled ? 0.55 : 1,
                transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Color dot */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: isCancelled ? '#f1f5f9' : c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCancelled ? '#94a3b8' : c.border, fontSize: 13, flexShrink: 0,
                  border: `1.5px solid ${isCancelled ? '#cbd5e1' : c.border}`,
                }}>
                  <i className="fa fa-tooth"></i>
                </div>

                {/* Name + date/time */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 12,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {a.firstName} {a.lastName}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-m)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span><i className="fa fa-calendar" style={{ marginRight: 3 }}></i>{a.date}</span>
                    <span><i className="fa fa-clock" style={{ marginRight: 3 }}></i>{a.startTime}–{a.endTime}</span>
                  </div>
                </div>

                {/* Procedure chip */}
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                  background: isCancelled ? '#f1f5f9' : c.bg,
                  color: isCancelled ? '#94a3b8' : c.text,
                  border: `1px solid ${isCancelled ? '#cbd5e1' : c.border}`,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {PROC_LABELS[a.procedure] || a.procedure || 'Other'}
                </span>

                {/* Status badge */}
                <span className={`status-badge status-${a.status}`} style={{ fontSize: 9, flexShrink: 0 }}>
                  {a.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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

        {/* ── Doctor Overview Section ────────────────────────────────────────── */}
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa fa-user-md" style={{ color: 'var(--primary)' }}></i> Doctor Overview
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-m)' }}>
            Per-doctor appointment breakdown with filters
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap', marginBottom: 14,
        }}>
          {/* Date filter pills */}
          <div style={{
            display: 'flex', gap: 4, background: 'var(--surface-2)',
            borderRadius: 10, padding: 3, flexShrink: 0,
          }}>
            {dateFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: '6px 14px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  background: dateFilter === f.key ? 'var(--primary)' : 'transparent',
                  color: dateFilter === f.key ? '#fff' : 'var(--text-m)',
                  transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className={`fa ${f.icon}`} style={{ fontSize: 10 }}></i> {f.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{
            flex: 1, minWidth: 180, position: 'relative',
          }}>
            <i className="fa fa-search" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, color: 'var(--text-l)', pointerEvents: 'none',
            }}></i>
            <input
              className="form-input"
              type="text"
              placeholder="Search patients by name or number…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: 30, fontSize: 12, height: 34,
                borderRadius: 8, width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-l)', fontSize: 12, padding: 2,
                }}
              >
                <i className="fa fa-times"></i>
              </button>
            )}
          </div>

          {/* Result count */}
          <span style={{ fontSize: 11, color: 'var(--text-m)', fontWeight: 600, flexShrink: 0 }}>
            {filteredAppts.length} result{filteredAppts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Doctor panels — side by side */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <DoctorPanel doctor="dr1" name={dr1Name} appts={dr1Appts} color={DOCTOR_COLORS.dr1} />
          <DoctorPanel doctor="dr2" name={dr2Name} appts={dr2Appts} color={DOCTOR_COLORS.dr2} />
        </div>

      </div>
    </div>
  );
}