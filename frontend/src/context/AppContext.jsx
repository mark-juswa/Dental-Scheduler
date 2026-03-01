import { useReducer } from 'react';
import { AppContext } from './AppContext.js';

const DEFAULT_SETTINGS = {
  workStart: 8, workEnd: 20, darkMode: false, conflictDetect: true,
  showWeekends: true, showCancelled: true, dr1Name: 'Dr. A', dr2Name: 'Dr. B', zoomLevel: 1.0,
  procColors: {}, // user-customized procedure colors; merged over PROC_COLORS defaults
};

const initialState = {
  // Data
  appointments: [],
  clients: [],
  blockedDates: [],   // array of { id, date, reason }
  settings: { ...DEFAULT_SETTINGS },

  // Calendar UI
  activeView: 'calendar',
  calView: 'week',
  currentDate: new Date(),
  miniCalDate: new Date(),

  // Modal state
  apptModalOpen: false,
  apptModalId: null,       // null = create, string = edit
  clientModalOpen: false,
  clientModalId: null,
  historyModalOpen: false,
  historyClientId: null,
  confirmModal: null,      // { title, msg, onOk }

  // Popover
  popover: null,           // { id, x, y }

  // Loading
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {

    // ── Data ────────────────────────────────────────────────────────────────
    case 'SET_APPOINTMENTS': return { ...state, appointments: action.payload };
    case 'ADD_APPOINTMENT':  return { ...state, appointments: [...state.appointments, action.payload] };
    case 'UPDATE_APPOINTMENT': return {
      ...state,
      appointments: state.appointments.map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a),
    };
    case 'DELETE_APPOINTMENT': return {
      ...state,
      appointments: state.appointments.filter(a => a.id !== action.payload),
    };

    case 'SET_CLIENTS': return { ...state, clients: action.payload };
    case 'ADD_CLIENT':  return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT': return {
      ...state,
      clients: state.clients.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c),
    };
    case 'DELETE_CLIENT': return {
      ...state,
      clients: state.clients.filter(c => c.id !== action.payload),
    };

    case 'SET_BLOCKED_DATES': return { ...state, blockedDates: action.payload };
    case 'ADD_BLOCKED_DATE':  return { ...state, blockedDates: [...state.blockedDates, action.payload] };
    case 'REMOVE_BLOCKED_DATE': return {
      ...state,
      blockedDates: state.blockedDates.filter(b => b.id !== action.payload),
    };

    case 'SET_SETTINGS': {
      const merged = { ...state.settings, ...action.payload };
      // Apply dark mode to html element
      document.documentElement.setAttribute('data-theme', merged.darkMode ? 'dark' : 'light');
      // Update --hh CSS var for zoom
      document.documentElement.style.setProperty('--hh', Math.round(72 * merged.zoomLevel) + 'px');
      return { ...state, settings: merged };
    }

    // ── Navigation ──────────────────────────────────────────────────────────
    case 'SET_ACTIVE_VIEW': return { ...state, activeView: action.payload };
    case 'SET_CAL_VIEW':    return { ...state, calView: action.payload };
    case 'SET_CURRENT_DATE': return { ...state, currentDate: action.payload };
    case 'SET_MINI_CAL_DATE': return { ...state, miniCalDate: action.payload };

    // ── Modals ───────────────────────────────────────────────────────────────
    case 'OPEN_APPT_MODAL':  return { ...state, apptModalOpen: true,   apptModalId: action.payload ?? null };
    case 'CLOSE_APPT_MODAL': return { ...state, apptModalOpen: false,  apptModalId: null };
    case 'OPEN_CLIENT_MODAL':  return { ...state, clientModalOpen: true,   clientModalId: action.payload ?? null };
    case 'CLOSE_CLIENT_MODAL': return { ...state, clientModalOpen: false,  clientModalId: null };
    case 'OPEN_HISTORY_MODAL':  return { ...state, historyModalOpen: true,  historyClientId: action.payload };
    case 'CLOSE_HISTORY_MODAL': return { ...state, historyModalOpen: false, historyClientId: null };
    case 'OPEN_CONFIRM':  return { ...state, confirmModal: action.payload };
    case 'CLOSE_CONFIRM': return { ...state, confirmModal: null };

    // ── Popover ──────────────────────────────────────────────────────────────
    case 'SET_POPOVER':   return { ...state, popover: action.payload };
    case 'CLOSE_POPOVER': return { ...state, popover: null };

    // ── Loading ──────────────────────────────────────────────────────────────
    case 'SET_LOADING': return { ...state, loading: action.payload };

    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Convenience action dispatchers
  const actions = {
    setAppointments:   (data) => dispatch({ type: 'SET_APPOINTMENTS', payload: data }),
    addAppointment:    (data) => dispatch({ type: 'ADD_APPOINTMENT',  payload: data }),
    updateAppointment: (data) => dispatch({ type: 'UPDATE_APPOINTMENT', payload: data }),
    deleteAppointment: (id)   => dispatch({ type: 'DELETE_APPOINTMENT', payload: id }),

    setClients:    (data) => dispatch({ type: 'SET_CLIENTS', payload: data }),
    addClient:     (data) => dispatch({ type: 'ADD_CLIENT',  payload: data }),
    updateClient:  (data) => dispatch({ type: 'UPDATE_CLIENT', payload: data }),
    deleteClient:  (id)   => dispatch({ type: 'DELETE_CLIENT', payload: id }),

    setBlockedDates:  (data) => dispatch({ type: 'SET_BLOCKED_DATES',  payload: data }),
    addBlockedDate:   (data) => dispatch({ type: 'ADD_BLOCKED_DATE',   payload: data }),
    removeBlockedDate:(id)   => dispatch({ type: 'REMOVE_BLOCKED_DATE', payload: id }),

    setSettings: (data) => dispatch({ type: 'SET_SETTINGS', payload: data }),

    setActiveView:   (v) => dispatch({ type: 'SET_ACTIVE_VIEW',   payload: v }),
    setCalView:      (v) => dispatch({ type: 'SET_CAL_VIEW',      payload: v }),
    setCurrentDate:  (d) => dispatch({ type: 'SET_CURRENT_DATE',  payload: d }),
    setMiniCalDate:  (d) => dispatch({ type: 'SET_MINI_CAL_DATE', payload: d }),

    openApptModal:  (id)  => dispatch({ type: 'OPEN_APPT_MODAL',   payload: id }),
    closeApptModal: ()    => dispatch({ type: 'CLOSE_APPT_MODAL' }),
    openClientModal:  (id)=> dispatch({ type: 'OPEN_CLIENT_MODAL',  payload: id }),
    closeClientModal: ()  => dispatch({ type: 'CLOSE_CLIENT_MODAL' }),
    openHistoryModal: (id)=> dispatch({ type: 'OPEN_HISTORY_MODAL', payload: id }),
    closeHistoryModal:()  => dispatch({ type: 'CLOSE_HISTORY_MODAL' }),
    openConfirm:  (cfg)   => dispatch({ type: 'OPEN_CONFIRM',  payload: cfg }),
    closeConfirm: ()      => dispatch({ type: 'CLOSE_CONFIRM' }),

    setPopover:   (data) => dispatch({ type: 'SET_POPOVER',   payload: data }),
    closePopover: ()     => dispatch({ type: 'CLOSE_POPOVER' }),
    setLoading:   (v)    => dispatch({ type: 'SET_LOADING',   payload: v }),
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

