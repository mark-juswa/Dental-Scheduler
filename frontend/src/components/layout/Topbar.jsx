import { useState } from 'react';
import { useApp } from '../../context/useApp.js';
import { getTopbarSubtitle } from '../../utils/calendarHelpers.js';

export default function Topbar({ onHamburger, onSearch }) {
  const { state, actions } = useApp();
  const { activeView, calView, currentDate, settings } = state;
  const [searchVal, setSearchVal] = useState('');

  const isCalendar = activeView === 'calendar';
  const subtitle = isCalendar ? getTopbarSubtitle(calView, currentDate, settings.showWeekends) : '';

  const titles = {
    calendar: 'Calendar', clients: 'Client Records',
    analytics: 'Analytics', audit: 'Audit Log', settings: 'Settings',
  };

  function navigate(dir) {
    const d = new Date(currentDate);
    if (calView === 'day') d.setDate(d.getDate() + dir);
    else if (calView === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    actions.setCurrentDate(new Date(d));
  }

  function goToday() {
    actions.setCurrentDate(new Date());
  }

  function adjustZoom(delta) {
    const z = Math.max(0.4, Math.min(3.0, (settings.zoomLevel || 1) + delta));
    actions.setSettings({ zoomLevel: z });
  }

  function handleSearch(e) {
    const q = e.target.value;
    setSearchVal(q);
    if (onSearch) onSearch(q);
  }

  function toggleDark() {
    actions.setSettings({ darkMode: !settings.darkMode });
  }

  return (
    <header className="topbar">
      <button className="hamburger" onClick={onHamburger}>
        <i className="fa fa-bars"></i>
      </button>

      <div className="topbar-title">
        {titles[activeView] || activeView}{' '}
        {subtitle && <span>{subtitle}</span>}
      </div>

      <div className="search-box" id="search-box">
        <i className="fa fa-search"></i>
        <input
          type="text"
          placeholder="Search patients, appointments…"
          value={searchVal}
          onChange={handleSearch}
        />
      </div>

      <div className="topbar-right">
        {isCalendar && (
          <>
            <div className="view-toggle" id="view-toggle">
              {['day', 'week', 'month'].map(v => (
                <button
                  key={v}
                  className={`view-btn ${calView === v ? 'active' : ''}`}
                  onClick={() => actions.setCalView(v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => navigate(-1)}>
              <i className="fa fa-chevron-left"></i>
            </button>
            <button
              className="icon-btn"
              onClick={goToday}
              style={{ fontSize: 10, fontWeight: 700, padding: '0 8px', width: 'auto' }}
            >
              Today
            </button>
            <button className="icon-btn" onClick={() => navigate(1)}>
              <i className="fa fa-chevron-right"></i>
            </button>
            <div className="zoom-group" id="zoom-controls">
              <button className="zoom-btn" onClick={() => adjustZoom(-0.25)} title="Zoom Out">−</button>
              <span className="zoom-label">{Math.round((settings.zoomLevel || 1) * 100)}%</span>
              <button className="zoom-btn" onClick={() => adjustZoom(0.25)} title="Zoom In">+</button>
            </div>
          </>
        )}

        <button className="icon-btn dark-toggle-btn" onClick={toggleDark}>
          <i className={`fa ${settings.darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
        <button className="icon-btn print-btn" onClick={() => window.print()}>
          <i className="fa fa-print"></i>
        </button>
        <button className="btn-new" onClick={() => actions.openApptModal()}>
          <i className="fa fa-plus"></i>
          <span>New Appointment</span>
        </button>
      </div>
    </header>
  );
}