import { useApp } from '../../context/useApp.js';
import MiniCalendar from '../calendar/MiniCalendar.jsx';
import { supabase } from '../../services/supabaseClient.js';

export default function Sidebar({ user, sidebarOpen, onClose }) {
  const { state, actions } = useApp();
  const { activeView, clients } = state;

  function nav(view) {
    actions.setActiveView(view);
    onClose();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const role = user?.user_metadata?.role || 'user';
  
  let navItems = [
    { view: 'calendar',   icon: 'fa-calendar-alt', label: 'Calendar' }
  ];

  if (role === 'admin' || role === 'super_admin') {
    navItems.push({ view: 'clients',    icon: 'fa-users',         label: 'Clients', badge: clients.length });
    navItems.push({ view: 'analytics',  icon: 'fa-chart-bar',     label: 'Analytics', section: 'Reports' });
  }

  if (role === 'super_admin') {
    navItems.push({ view: 'audit',      icon: 'fa-history',       label: 'Audit Log' });
    navItems.push({ view: 'settings',   icon: 'fa-cog',           label: 'Settings', section: 'System' });
    navItems.push({ view: 'users',      icon: 'fa-user-shield',   label: 'Users' });
  }

  const roleDisplay = role === 'super_admin' ? 'Super Admin' : (role === 'admin' ? 'Administrator' : 'Staff');
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563EB&color=fff`;

  return (
    <>
      <div className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <i className="fa-solid fa-tooth"></i>
          <span>Dental Scheduler</span>
          <span className="close-sidebar" onClick={onClose}>
            <i className="fa fa-times"></i>
          </span>
        </div>

        <MiniCalendar />

        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          {navItems.map((item) => (
            <div key={item.view}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <div
                className={`nav-item ${activeView === item.view ? 'active' : ''}`}
                onClick={() => nav(item.view)}
              >
                <i className={`fa ${item.icon}`}></i>
                {item.label}
                {item.badge !== undefined && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </div>
            </div>
          ))}
          <div
            className="nav-item"
            style={{ color: '#ef4444', marginTop: 'auto' }}
            onClick={handleLogout}
          >
            <i className="fa fa-sign-out-alt"></i>
            Logout
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <img src={avatarUrl} alt="avatar" />
            <div className="sidebar-user-info">
              <strong>{displayName}</strong>
              <span>{roleDisplay}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}