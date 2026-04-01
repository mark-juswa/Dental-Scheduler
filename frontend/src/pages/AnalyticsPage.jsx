import { useApp } from '../context/useApp.js';
import { todayPHT, fmtDate } from '../utils/calendarHelpers.js';
import { useProcColors } from '../hooks/useProcColors.js';
import { useProcLabels } from '../hooks/useProcLabels.js';
import { useMemo, useState } from 'react';

export default function AnalyticsPage() {
  const { state } = useApp();
  const PROC_COLORS = useProcColors();
  const PROC_LABELS = useProcLabels();
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
    { icon: 'fa-calendar-check', color: '#2563eb', bg: '#dbeafe', num: total,         label: 'Total Appointments' },
    { icon: 'fa-clock',          color: '#d97706', bg: '#fef3c7', num: pending,        label: 'Pending' },
    { icon: 'fa-check-circle',   color: '#059669', bg: '#d1fae5', num: completed,      label: 'Completed' },
    { icon: 'fa-ban',            color: '#64748b', bg: '#f1f5f9', num: cancelled,      label: 'Cancelled' },
    { icon: 'fa-calendar-day',   color: '#0891b2', bg: '#cffafe', num: todayN,         label: 'Today (PHT)' },
    { icon: 'fa-users',          color: '#7c3aed', bg: '#ede9fe', num: clients.length, label: 'Total Clients' },
    { icon: 'fa-calendar-alt',   color: '#ea580c', bg: '#ffedd5', num: upcoming,       label: 'Upcoming 7 Days' },
  ];

  // Upcoming list (next 7 days)
  const upcomingList = appointments
    .filter(a => next7.includes(a.date) && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // ── Doctor Schedule state ──────────────────────────────────────────────────
  const [dateFilter, setDateFilter]   = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');

  const dateRange = useMemo(() => {
    const todayDate = new Date(`${t}T00:00:00`);
    switch (dateFilter) {
      case 'today':    return { from: t, to: t };
      case 'tomorrow': {
        const tmr = new Date(todayDate); tmr.setDate(tmr.getDate() + 1);
        const s = fmtDate(tmr); return { from: s, to: s };
      }
      case 'week': {
        const e = new Date(todayDate); e.setDate(e.getDate() + 6);
        return { from: t, to: fmtDate(e) };
      }
      case 'month': {
        const e = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        return { from: t, to: fmtDate(e) };
      }
      default: return null;
    }
  }, [dateFilter, t]);

  const filteredAppts = useMemo(() => {
    let list = [...appointments];
    if (dateRange) list = list.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        (a.contactNumber || '').toLowerCase().includes(q)
      );
    }
    if (doctorFilter !== 'all') list = list.filter(a => (a.doctor || 'dr1') === doctorFilter);
    list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    return list;
  }, [appointments, dateRange, searchQuery, doctorFilter]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    for (const a of filteredAppts) {
      if (!groups[a.date]) groups[a.date] = [];
      groups[a.date].push(a);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAppts]);

  const dateFilters = [
    { key: 'today',    label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week',     label: 'This Week' },
    { key: 'month',    label: 'This Month' },
    { key: 'all',      label: 'All' },
  ];
  const doctorFilters = [
    { key: 'all', label: 'All Doctors' },
    { key: 'dr1', label: dr1Name },
    { key: 'dr2', label: dr2Name },
  ];

  function formatDateHeader(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="view active" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div className="view-scroll">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Analytics</h2>
          <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Clinic performance overview</p>
        </div>

        {/* ── Stat Cards ── */}
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

        {/* ── Doctor Schedule ── */}
        <div className="card" style={{ marginTop: 20, marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa fa-user-md" style={{ color: 'var(--text-m)' }}></i> Doctor Schedule
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-m)', fontWeight: 600 }}>
              {filteredAppts.length} appointment{filteredAppts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="card-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Filter controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Date pills */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 8, padding: 3, flexShrink: 0 }}>
                {dateFilters.map(f => (
                  <button key={f.key} onClick={() => setDateFilter(f.key)} style={{
                    border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                    background: dateFilter === f.key ? 'var(--primary)' : 'transparent',
                    color: dateFilter === f.key ? '#fff' : 'var(--text-m)',
                    transition: 'all .15s',
                  }}>{f.label}</button>
                ))}
              </div>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                <i className="fa fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-l)', pointerEvents: 'none' }}></i>
                <input className="form-input" type="text" placeholder="Search patients…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 28, fontSize: 12, height: 32, borderRadius: 6, width: '100%' }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-l)', fontSize: 11, padding: 2 }}>
                    <i className="fa fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Doctor filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-m)' }}>Doctor:</span>
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 8, padding: 3 }}>
                {doctorFilters.map(f => (
                  <button key={f.key} onClick={() => setDoctorFilter(f.key)} style={{
                    border: 'none', cursor: 'pointer', padding: '5px 14px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                    background: doctorFilter === f.key ? 'var(--text)' : 'transparent',
                    color: doctorFilter === f.key ? 'var(--bg)' : 'var(--text-m)',
                    transition: 'all .15s',
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {/* Appointment list grouped by date */}
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {groupedByDate.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-l)' }}>
                  <i className="fa fa-calendar-times" style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.4 }}></i>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>No appointments found</p>
                  <p style={{ fontSize: 11, margin: '4px 0 0' }}>Try changing the date filter, doctor, or search</p>
                </div>
              ) : groupedByDate.map(([date, appts]) => (
                <div key={date} style={{ marginBottom: 6 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-m)',
                    padding: '8px 0 4px', borderBottom: '1px solid var(--border)',
                    textTransform: 'uppercase', letterSpacing: '.03em',
                    position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
                  }}>
                    {formatDateHeader(date)}
                    <span style={{ fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
                      — {appts.length} appointment{appts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {appts.map((a, idx) => {
                    const isCancelled = a.status === 'cancelled';
                    const docLabel = (a.doctor || 'dr1') === 'dr2' ? dr2Name : dr1Name;
                    return (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 8px',
                        borderBottom: idx < appts.length - 1 ? '1px solid var(--border)' : 'none',
                        opacity: isCancelled ? 0.5 : 1, transition: 'background .12s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-m)', minWidth: 90, flexShrink: 0, fontFamily: 'monospace' }}>
                          {a.startTime} – {a.endTime}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                          {a.firstName} {a.lastName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-m)', flexShrink: 0 }}>
                          {PROC_LABELS[a.procedure] || a.procedure || 'Other'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-m)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {docLabel}
                        </span>
                        <span className={`status-badge status-${a.status}`} style={{ fontSize: 9, flexShrink: 0 }}>
                          {a.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Upcoming Appointments (Next 7 Days) ── */}
        <div className="card" style={{ marginBottom: 18 }}>
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