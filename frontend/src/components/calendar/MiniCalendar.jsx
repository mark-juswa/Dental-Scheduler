import { useApp } from '../../context/useApp.js';
import { fmtDate, isToday } from '../../utils/calendarHelpers.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADS = ['M','T','W','T','F','S','S'];

export default function MiniCalendar() {
  const { state, actions } = useApp();
  const { miniCalDate, appointments, calView } = state;

  const yr = miniCalDate.getFullYear();
  const mo = miniCalDate.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const apptDates = new Set(appointments.map(a => a.date));

  function nav(dir) {
    actions.setMiniCalDate(new Date(yr, mo + dir, 1));
  }

  function clickDay(ds) {
    actions.setCurrentDate(new Date(ds + 'T12:00:00'));
    if (calView !== 'day') actions.setCalView('day');
    if (state.activeView !== 'calendar') actions.setActiveView('calendar');
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <div className="mini-cal-nav" onClick={() => nav(-1)}>
          <i className="fa fa-chevron-left" style={{ fontSize: 8 }}></i>
        </div>
        <span>{MONTHS[mo]} {yr}</span>
        <div className="mini-cal-nav" onClick={() => nav(1)}>
          <i className="fa fa-chevron-right" style={{ fontSize: 8 }}></i>
        </div>
      </div>
      <div className="mini-cal-grid">
        {DAY_HEADS.map((d, i) => (
          <div key={i} className="mini-cal-day-head">{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e-${i}`} className="mini-cal-day other-m"></div>
        ))}
        {Array.from({ length: dim }, (_, i) => i + 1).map(day => {
          const ds = fmtDate(new Date(yr, mo, day));
          const cls = [
            'mini-cal-day',
            isToday(ds) ? 'today' : '',
            apptDates.has(ds) && !isToday(ds) ? 'has-appt' : '',
          ].filter(Boolean).join(' ');
          return (
            <div key={day} className={cls} onClick={() => clickDay(ds)}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}