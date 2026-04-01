import { useApp } from '../../context/useApp.js';
import { PROC_LABELS } from '../../utils/constants.js';
import { useProcColors } from '../../hooks/useProcColors.js';
import { formatDatePHT } from '../../utils/calendarHelpers.js';
import { appointmentsApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';

export default function AppointmentPopover() {
  const { state, actions } = useApp();
  const { popover, appointments, settings } = state;
  const PROC_COLORS = useProcColors();

  if (!popover) return null;

  const appt = appointments.find(a => a.id === popover.id);
  if (!appt) return null;

  const c  = PROC_COLORS[appt.procedure] || PROC_COLORS.other;
  const bg = appt.status === 'cancelled'
    ? 'linear-gradient(135deg,#64748b,#94a3b8)'
    : `linear-gradient(135deg,${c.border},${c.border}cc)`;
  const dr1Name = settings.dr1Name || 'Dr. A';
  const dr2Name = settings.dr2Name || 'Dr. B';
  const docName = appt.doctor === 'dr2' ? dr2Name : dr1Name;

  async function quickSetStatus(status) {
    try {
      const updated = await appointmentsApi.update(appt.id, { status });
      actions.updateAppointment(updated);
      showToast(`Status updated to "${status}"`, status === 'cancelled' ? 'warning' : 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function onEdit() {
    actions.closePopover();
    actions.openApptModal(appt.id);
  }

  function onReschedule() {
    actions.closePopover();
    actions.openApptModal(appt.id);
    // Focus date field after modal opens
    setTimeout(() => {
      const f = document.getElementById('appt-date');
      if (f) { f.focus(); f.style.outline = '3px solid var(--primary)'; setTimeout(() => f.style.outline = '', 2000); }
    }, 100);
  }

  function onCancel() {
    actions.closePopover();
    if (appt.status === 'cancelled') { showToast('Already cancelled', 'warning'); return; }
    actions.openConfirm({
      title: 'Cancel Appointment',
      msg: `Cancel appointment for ${appt.firstName} ${appt.lastName}? It will remain visible in the calendar.`,
      onOk: async () => {
        try {
          const updated = await appointmentsApi.update(appt.id, { status: 'cancelled' });
          actions.updateAppointment(updated);
          actions.closeConfirm();
          showToast('Appointment cancelled', 'warning');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  function onDelete() {
    actions.closePopover();
    actions.openConfirm({
      title: 'Delete Appointment',
      msg: `Permanently delete appointment for ${appt.firstName} ${appt.lastName}? Cannot be undone.`,
      onOk: async () => {
        try {
          await appointmentsApi.delete(appt.id);
          actions.deleteAppointment(appt.id);
          actions.closeConfirm();
          showToast('Deleted', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  const statusBtns = [
    { s: 'pending',   label: 'Pending',   style: { background: '#fef3c7', color: '#92400e' } },
    { s: 'confirmed', label: 'Confirmed', style: { background: '#dbeafe', color: '#1e40af' } },
    { s: 'completed', label: 'Done',      style: { background: '#d1fae5', color: '#065f46' } },
    { s: 'cancelled', label: 'Cancel',    style: { background: '#f1f5f9', color: '#475569' } },
  ];

  return (
    <>
      <div id="pop-backdrop" style={{ display: 'block', position: 'fixed', inset: 0, zIndex: 1999 }} onClick={() => actions.closePopover()} />
      <div id="appt-popover" style={{ display: 'block', left: popover.x, top: popover.y }}>
        <div className="pop-header" style={{ background: bg }}>
          <button className="pop-close" onClick={() => actions.closePopover()}>
            <i className="fa fa-times"></i>
          </button>
          <div className="pop-proc-badge">
            <i className="fa fa-tooth"></i> {PROC_LABELS[appt.procedure] || 'Other'}
          </div>
          <div className="pop-name">{appt.firstName} {appt.middleName ? appt.middleName + ' ' : ''}{appt.lastName}</div>
          <div className="pop-sub">
            <span>🕐 {appt.startTime}–{appt.endTime}</span>
            <span style={{ background: 'rgba(255,255,255,.25)', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
              👨‍⚕️ {docName}
            </span>
          </div>
        </div>

        <div className="pop-body">
          <div className="pop-row">
            <div className="pop-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa fa-calendar-alt"></i></div>
            <div><div className="pop-label">Date (PHT)</div><div className="pop-val">{formatDatePHT(appt.date)}</div></div>
          </div>
          <div className="pop-row">
            <div className="pop-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="fa fa-phone"></i></div>
            <div><div className="pop-label">Contact</div><div className="pop-val">{appt.contactNumber || '—'}</div></div>
          </div>
          <div className="pop-row">
            <div className="pop-icon" style={{ background: '#fef3c7', color: '#d97706' }}><i className="fa fa-map-marker-alt"></i></div>
            <div><div className="pop-label">Address</div><div className="pop-val">{appt.address || '—'}</div></div>
          </div>
          {appt.facebookUrl && (
            <div className="pop-row">
              <div className="pop-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}><i className="fab fa-facebook"></i></div>
              <div>
                <div className="pop-label">Messenger</div>
                <div className="pop-val">
                  <a href={appt.facebookUrl} target="_blank" rel="noopener">
                    <i className="fa-brands fa-facebook-messenger"></i> Open Messenger
                  </a>
                </div>
              </div>
            </div>
          )}
          {appt.notes && (
            <div className="pop-notes">
              <i className="fa fa-sticky-note" style={{ marginRight: 5, color: 'var(--primary)' }}></i>
              {appt.notes}
            </div>
          )}
        </div>

        <div className="pop-status-row">
          <span className="pop-status-label">Status:</span>
          {statusBtns.map(({ s, label, style }) => (
            <button
              key={s}
              className={`pop-status-btn${appt.status === s ? ' active-status' : ''}`}
              style={style}
              onClick={() => quickSetStatus(s)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pop-actions">
          <button className="pop-action-btn p-edit" onClick={onEdit}><i className="fa fa-edit"></i> Edit</button>
          <button className="pop-action-btn p-reschedule" onClick={onReschedule}><i className="fa fa-calendar-alt"></i> Move</button>
          <button className="pop-action-btn p-cancel" onClick={onCancel}><i className="fa fa-ban"></i> Cancel</button>
          <button className="pop-action-btn p-delete" onClick={onDelete}><i className="fa fa-trash"></i> Delete</button>
        </div>
      </div>
    </>
  );
}