import { useEffect, useRef } from 'react';
import { useApp } from '../../context/useApp.js';
import { useProcColors } from '../../hooks/useProcColors.js';
import AppointmentBlock from './AppointmentBlock.jsx';
import {
  fmtDate, isToday, getWeekDays, getHH, getColHeight,
  renderGridLinesHTML, renderTimeColHTML, computeLayout, getNowPHT,
} from '../../utils/calendarHelpers.js';

const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_SHORT    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL     = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Now Indicator ────────────────────────────────────────────────────────────
function NowIndicator({ ws, we, zoomLevel }) {
  const { h, m, dateStr } = getNowPHT();
  const hh  = getHH(zoomLevel);
  const top = ((h + m / 60) - ws) * hh;

  useEffect(() => {
    // Always clear previous lines first
    document.querySelectorAll('.cal-now-line').forEach(el => el.remove());

    if (h < ws || h >= we) return;

    [`col-${dateStr}`, `col-${dateStr}-dr1`, `col-${dateStr}-dr2`].forEach(colId => {
      const col = document.getElementById(colId);
      if (!col) return;

      const line = document.createElement('div');
      line.className = 'cal-now-line';
      line.style.top = top + 'px';
      col.appendChild(line);
    });

    return () => {
      document.querySelectorAll('.cal-now-line').forEach(el => el.remove());
    };
  }, [h, m, ws, we, zoomLevel, dateStr, top]);

  return null;
}

// ── Time Column (static HTML) ─────────────────────────────────────────────────
function TimeCol({ ws, we, zoomLevel }) {
  return (
    <div
      className="cal-time-col"
      dangerouslySetInnerHTML={{ __html: renderTimeColHTML(ws, we, zoomLevel) }}
    />
  );
}

// ── Day Column (week view) ────────────────────────────────────────────────────
function DayColumn({ date, ws, zoomLevel, blockedDates, appointments, showCancelled }) {
  const ds = fmtDate(date);
  const isBlocked = blockedDates.some(b => b.date === ds);

  let dayAppts = appointments.filter(a => a.date === ds);
  if (!showCancelled) dayAppts = dayAppts.filter(a => a.status !== 'cancelled');
  const layout = computeLayout(dayAppts);

  return (
    <div
      className={`cal-day-col${isBlocked ? ' blocked' : ''}`}
      id={`col-${ds}`}
      data-date={ds}
      style={{ height: getColHeight(ws, 20, zoomLevel) + 'px' }} // workEnd via settings
    >
      <div dangerouslySetInnerHTML={{ __html: renderGridLinesHTML(ws, 20, zoomLevel) }} />
      {dayAppts.map(a => (
        <AppointmentBlock key={a.id} appt={a} ws={ws} layout={layout} />
      ))}
      <div className="cal-drop-preview" id={`preview-${ds}`}></div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────
export function WeekView() {
  const { state, actions } = useApp();
  const { currentDate, settings, appointments, blockedDates } = state;
  const { workStart: ws, workEnd: we, showWeekends, showCancelled, zoomLevel } = settings;
  const calBodyRef = useRef(null);
  const days = getWeekDays(currentDate, showWeekends);

  // Scroll to ~8am on mount and when view changes
  useEffect(() => {
    if (calBodyRef.current) {
      calBodyRef.current.scrollTop = getHH(zoomLevel) * 0.8;
    }
  }, []);

  // Ctrl+wheel zoom
  useEffect(() => {
    const wrap = document.getElementById('calendar-wrap');
    if (!wrap) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      const z = Math.max(0.4, Math.min(3.0, (settings.zoomLevel || 1) + delta));
      actions.setSettings({ zoomLevel: z });
    };
    wrap.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => wrap.removeEventListener('wheel', handler, { capture: true });
  }, [settings.zoomLevel]);

  return (
    <>
      <div className="cal-header">
        <div className="cal-time-gutter">PHT</div>
        {days.map(d => {
          const ds = fmtDate(d);
          const isBlocked = blockedDates.some(b => b.date === ds);
          return (
            <div
              key={ds}
              className={`cal-day-head${isToday(ds) ? ' today' : ''}${isBlocked ? ' blocked-head' : ''}`}
              onClick={() => { actions.setCurrentDate(new Date(ds + 'T12:00:00')); actions.setCalView('day'); }}
            >
              <div className="day-label">{DAY_NAMES_SHORT[d.getDay()]}</div>
              <div className="day-num">{d.getDate()}</div>
              {isBlocked && <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '.04em' }}>BLOCKED</div>}
            </div>
          );
        })}
      </div>
      <div className="cal-body" ref={calBodyRef}>
        <TimeCol ws={ws} we={we} zoomLevel={zoomLevel} />
        <div className="cal-grid" id="cal-grid-body">
          {days.map(d => {
            const ds = fmtDate(d);
            const isBlocked = blockedDates.some(b => b.date === ds);
            let dayAppts = appointments.filter(a => a.date === ds);
            if (!showCancelled) dayAppts = dayAppts.filter(a => a.status !== 'cancelled');
            const layout = computeLayout(dayAppts);
            return (
              <div
                key={ds}
                className={`cal-day-col${isBlocked ? ' blocked' : ''}`}
                id={`col-${ds}`}
                data-date={ds}
                style={{ height: getColHeight(ws, we, zoomLevel) + 'px' }}
              >
                <div dangerouslySetInnerHTML={{ __html: renderGridLinesHTML(ws, we, zoomLevel) }} />
                {dayAppts.map(a => (
                  <AppointmentBlock key={a.id} appt={a} ws={ws} layout={layout} />
                ))}
                <div className="cal-drop-preview" id={`preview-${ds}`}></div>
              </div>
            );
          })}
        </div>
      </div>
      <NowIndicator ws={ws} we={we} zoomLevel={zoomLevel} />
    </>
  );
}

// ── Day View (Doctor Lanes) ───────────────────────────────────────────────────
export function DayView() {
  const { state, actions } = useApp();
  const { currentDate, settings, appointments, blockedDates } = state;
  const { workStart: ws, workEnd: we, showCancelled, zoomLevel, dr1Name, dr2Name } = settings;
  const calBodyRef = useRef(null);

  const d   = currentDate;
  const ds  = fmtDate(d);
  const isBlocked = blockedDates.some(b => b.date === ds);

  let dayAppts = appointments.filter(a => a.date === ds);
  if (!showCancelled) dayAppts = dayAppts.filter(a => a.status !== 'cancelled');
  const dr1Appts = dayAppts.filter(a => a.doctor === 'dr1' || !a.doctor);
  const dr2Appts = dayAppts.filter(a => a.doctor === 'dr2');
  const layout1 = computeLayout(dr1Appts);
  const layout2 = computeLayout(dr2Appts);
  const colH = getColHeight(ws, we, zoomLevel);

  useEffect(() => {
    if (calBodyRef.current) calBodyRef.current.scrollTop = getHH(zoomLevel) * 0.8;
  }, []);

  useEffect(() => {
    const wrap = document.getElementById('calendar-wrap');
    if (!wrap) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      const z = Math.max(0.4, Math.min(3.0, (settings.zoomLevel || 1) + delta));
      actions.setSettings({ zoomLevel: z });
    };
    wrap.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => wrap.removeEventListener('wheel', handler, { capture: true });
  }, [settings.zoomLevel]);

  return (
    <>
      <div className="cal-header">
        <div className="cal-time-gutter">PHT</div>
        <div className={`cal-day-head${isToday(ds) ? ' today' : ''}`} style={{ flex: 1, flexDirection: 'row', gap: 8, padding: '8px 16px' }}>
          <div className="day-num">{d.getDate()}</div>
          <div className="day-label" style={{ fontSize: 12 }}>{DAY_NAMES_FULL[d.getDay()]}, {MONTHS_SHORT[d.getMonth()]} {d.getDate()}</div>
        </div>
      </div>
      <div className="cal-body" ref={calBodyRef}>
        <TimeCol ws={ws} we={we} zoomLevel={zoomLevel} />
        <div className="cal-grid" id="cal-grid-body" style={{ flexDirection: 'column' }}>
          <div className="doc-lane-head" style={{ flexShrink: 0 }}>
            <div className="doc-lane-label dr1"><i className="fa fa-user-md"></i> {dr1Name || 'Dr. A'}</div>
            <div className="doc-lane-label dr2"><i className="fa fa-user-md"></i> {dr2Name || 'Dr. B'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
            <div
              className={`cal-day-col${isBlocked ? ' blocked' : ''}`}
              id={`col-${ds}-dr1`}
              data-date={ds}
              data-doctor="dr1"
              style={{ height: colH + 'px' }}
            >
              <div dangerouslySetInnerHTML={{ __html: renderGridLinesHTML(ws, we, zoomLevel) }} />
              {dr1Appts.map(a => <AppointmentBlock key={a.id} appt={a} ws={ws} layout={layout1} />)}
              <div className="cal-drop-preview" id={`preview-${ds}-dr1`}></div>
            </div>
            <div
              className={`cal-day-col${isBlocked ? ' blocked' : ''}`}
              id={`col-${ds}-dr2`}
              data-date={ds}
              data-doctor="dr2"
              style={{ height: colH + 'px' }}
            >
              <div dangerouslySetInnerHTML={{ __html: renderGridLinesHTML(ws, we, zoomLevel) }} />
              {dr2Appts.map(a => <AppointmentBlock key={a.id} appt={a} ws={ws} layout={layout2} />)}
              <div className="cal-drop-preview" id={`preview-${ds}-dr2`}></div>
            </div>
          </div>
        </div>
      </div>
      <NowIndicator ws={ws} we={we} zoomLevel={zoomLevel} />
    </>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
export function MonthView() {
  const { state, actions } = useApp();
  const { currentDate, appointments, blockedDates, settings } = state;
  const { showCancelled } = settings;
  const PROC_COLORS = useProcColors();

  const d   = currentDate;
  const yr  = d.getFullYear();
  const mo  = d.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim  = new Date(yr, mo + 1, 0).getDate();
  const dipm = new Date(yr, mo, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const cells = [];
  for (let i = offset - 1; i >= 0; i--) cells.push({ day: dipm - i, current: false });
  for (let i = 1; i <= dim; i++) cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - dim - offset + 1, current: false });

  function clickMonthCell(ds) {
    actions.setCurrentDate(new Date(ds + 'T12:00:00'));
    actions.setCalView('day');
  }

  return (
    <>
      <div className="cal-header" style={{ height: 40 }}>
        <div className="cal-time-gutter" style={{ display: 'none' }}></div>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(dn => (
          <div key={dn} className="month-day-head" style={{ flex: 1 }}>{dn}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="month-grid" style={{ minHeight: 480 }}>
          {cells.map((cell, idx) => {
            const ds = cell.current ? fmtDate(new Date(yr, mo, cell.day)) : '';
            const isBlocked = cell.current && blockedDates.some(b => b.date === ds);
            let dayAppts = cell.current ? appointments.filter(a => a.date === ds) : [];
            if (!showCancelled) dayAppts = dayAppts.filter(a => a.status !== 'cancelled');

            return (
              <div
                key={idx}
                className={`month-cell${isToday(ds) ? ' today' : ''}${!cell.current ? ' other-month' : ''}${isBlocked ? ' blocked' : ''}`}
                onClick={() => cell.current && clickMonthCell(ds)}
              >
                <div className="month-date">{cell.day}</div>
                {dayAppts.slice(0, 3).map(a => {
                  const c = PROC_COLORS[a.procedure] || PROC_COLORS.other;
                  const bg  = a.status === 'cancelled' ? '#f1f5f9' : c.bg;
                  const bor = a.status === 'cancelled' ? '#94a3b8' : c.border;
                  const tx  = a.status === 'cancelled' ? '#94a3b8' : c.text;
                  return (
                    <div
                      key={a.id}
                      className={`month-appt${a.status === 'cancelled' ? ' cancelled-appt' : ''}`}
                      style={{ background: bg, color: tx, borderLeft: `3px solid ${bor}` }}
                      onClick={e => { e.stopPropagation(); actions.setPopover({ id: a.id, x: e.clientX + 16, y: e.clientY - 80 }); }}
                    >
                      {a.firstName} {a.lastName}
                    </div>
                  );
                })}
                {dayAppts.length > 3 && (
                  <div className="month-more">+{dayAppts.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Calendar Wrap ─────────────────────────────────────────────────────────────
export default function CalendarWrap() {
  const { state } = useApp();
  const { calView } = state;

  useEffect(() => {
    // Keyboard shortcuts
    function onKey(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="calendar-wrap" id="calendar-wrap">
      {calView === 'week'  && <WeekView />}
      {calView === 'day'   && <DayView />}
      {calView === 'month' && <MonthView />}
    </div>
  );
}