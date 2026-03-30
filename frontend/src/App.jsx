import { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient.js';
import { useApp } from './context/useApp.js';
import { appointmentsApi, clientsApi, blockedDatesApi, settingsApi } from './services/apiServices.js';
import { useRealtime } from './hooks/useRealtime.js';
import { showToast } from './ui/toastService.js';
import { todayPHT } from './utils/calendarHelpers.js';

import Sidebar from './components/layout/Sidebar.jsx';
import Topbar from './components/layout/Topbar.jsx';
import AppointmentModal from './components/modals/AppointmentModal.jsx';
import AppointmentPopover from './components/popover/AppointmentPopover.jsx';
import BackupReminder from './components/modals/BackupReminder.jsx';

import LoginPage from './pages/LoginPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function AppShell({ user }) {
  const { state, actions } = useApp();
  const { activeView, appointments } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user.user_metadata?.role || 'user';

  useRealtime();

  // Load all data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        // Base arrays
        let appts = [], cls = [], bds = [], stg = {};
        
        // Everyone can fetch appointments and blocked dates
        appts = await appointmentsApi.getAll();
        bds = await blockedDatesApi.getAll();

        if (role === 'admin' || role === 'super_admin') {
          cls = await clientsApi.getAll();
        }
        if (role === 'super_admin') {
          stg = await settingsApi.get();
        }

        actions.setAppointments(appts);
        actions.setClients(cls);
        actions.setBlockedDates(bds);
        actions.setSettings(stg);
        actions.setLoading(false);

        const _pht = todayPHT();
        const time = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());
        showToast(`Welcome back! (PHT: ${time})`, 'success');
      } catch (err) {
        showToast('Failed to load data: ' + err.message, 'error');
        actions.setLoading(false);
      }
    }
    loadAll();
  }, []);

  // Now-line refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger re-render of NowIndicator by forcing calendar view re-render
      if (activeView === 'calendar') {
        document.querySelectorAll('.cal-now-line').forEach(el => el.remove());
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [activeView]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest('input,textarea,select')) return;
      if (e.key === 'Escape') {
        actions.closeApptModal();
        actions.closeClientModal();
        actions.closeConfirm();
        actions.closePopover();
      }
      if (e.key === 'n' && activeView === 'calendar') {
        const userRole = user?.user_metadata?.role || 'user';
        if (userRole !== 'user') actions.openApptModal();
      }
      if (e.key === 'ArrowLeft' && activeView === 'calendar') {
        const d = new Date(state.currentDate);
        if (state.calView === 'day') d.setDate(d.getDate() - 1);
        else if (state.calView === 'week') d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        actions.setCurrentDate(new Date(d));
      }
      if (e.key === 'ArrowRight' && activeView === 'calendar') {
        const d = new Date(state.currentDate);
        if (state.calView === 'day') d.setDate(d.getDate() + 1);
        else if (state.calView === 'week') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        actions.setCurrentDate(new Date(d));
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeView, state.calView, state.currentDate]);

  // Search — jump to first matching appointment
  function handleSearch(q) {
    if (!q || activeView !== 'calendar') return;
    const ql = q.toLowerCase();
    const matches = appointments.filter(a =>
      (a.firstName + ' ' + a.lastName + a.contactNumber + a.procedure).toLowerCase().includes(ql)
    );
    if (!matches.length) return;
    const first = matches.sort((a, b) => a.date.localeCompare(b.date))[0];
    actions.setCurrentDate(new Date(first.date + 'T12:00:00'));
    actions.setCalView('day');
    setTimeout(() => {
      const el = document.getElementById(`appt-${first.id}`);
      if (el) { el.style.outline = '3px solid var(--primary)'; setTimeout(() => el.style.outline = '', 2500); }
    }, 350);
  }

  const pageMap = {
    calendar:  <CalendarPage />,
    clients:   <ClientsPage />,
    analytics: <AnalyticsPage />,
    audit:     <AuditPage />,
    settings:  <SettingsPage />,
    users:     <UsersPage />,
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-area">
        <Topbar user={user} onHamburger={() => setSidebarOpen(true)} onSearch={handleSearch} />
        <div className="content-area">
          {pageMap[activeView]}
        </div>
      </main>
      <AppointmentModal />
      <ClientModal />
      <ConfirmModal />
      <AppointmentPopover />
      <BackupReminder role={role} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = no user

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still resolving auth
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontSize: 14, color: 'var(--text-m)', fontWeight: 600 }}>
          <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Loading…
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AppShell user={user} />;
}