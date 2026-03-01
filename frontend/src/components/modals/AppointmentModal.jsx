import { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp.js';
import { appointmentsApi, clientsApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';
import { todayPHT, parseTime, checkConflict } from '../../utils/calendarHelpers.js';
import { PROCEDURES, STATUSES } from '../../utils/constants.js';
import PhilippineAddressSelect from './PhilippineAddressSelect.jsx';
import { buildAddressString, parseAddressString } from '../../utils/phAddress.js';

const EMPTY_ADDR = { region: '', regionCode: '', province: '', provinceCode: '', city: '', cityCode: '', barangay: '' };

const EMPTY = {
  firstName: '', lastName: '', contactNumber: '', facebookUrl: '',
  date: '', startTime: '09:00', endTime: '10:00', procedure: '', doctor: 'dr1', status: 'pending', notes: '',
};

export default function AppointmentModal() {
  const { state, actions } = useApp();
  const { apptModalOpen, apptModalId, appointments, settings } = state;
  const isNew = !apptModalId;

  const [form, setForm] = useState({ ...EMPTY });
  const [addr, setAddr] = useState({ ...EMPTY_ADDR });
  const [conflict, setConflict] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!apptModalOpen) return;
    setConflict('');
    if (isNew) {
      setForm({ ...EMPTY, date: todayPHT() });
      setAddr({ ...EMPTY_ADDR });
    } else {
      const a = appointments.find(ap => ap.id === apptModalId);
      if (!a) return;
      setForm({
        firstName: a.firstName, lastName: a.lastName,
        contactNumber: a.contactNumber, facebookUrl: a.facebookUrl || '',
        date: a.date, startTime: a.startTime, endTime: a.endTime,
        procedure: a.procedure, doctor: a.doctor || 'dr1', status: a.status, notes: a.notes || '',
      });
      // Parse saved address string back into structured dropdown state
      setAddr(parseAddressString(a.address || ''));
    }
  }, [apptModalOpen, apptModalId]);

  if (!apptModalOpen) return null;

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setConflict('');
  }

  async function handleSave() {
    const { firstName, lastName, contactNumber, date, startTime, endTime, procedure, doctor, status, facebookUrl, notes } = form;
    const address = buildAddressString(addr);
    if (!firstName || !lastName || !contactNumber || !date || !startTime || !endTime || !procedure) {
      showToast('Fill all required fields', 'warning'); return;
    }
    if (!addr.city || !addr.province || !addr.region) {
      showToast('Please complete the address fields', 'warning'); return;
    }
    if (parseTime(startTime).total >= parseTime(endTime).total) {
      showToast('End time must be after start time', 'warning'); return;
    }
    if (parseTime(startTime).total >= 24 * 60 || parseTime(endTime).total > 24 * 60) {
      showToast('Times cannot exceed midnight', 'warning'); return;
    }

    const hasConflict = checkConflict(
      appointments, apptModalId || '__new__', date, startTime, endTime, doctor, settings.conflictDetect
    );
    if (hasConflict) {
      const docN = doctor === 'dr1' ? (settings.dr1Name || 'Dr. A') : (settings.dr2Name || 'Dr. B');
      setConflict(`Time slot conflicts with another appointment for ${docN}!`);
      return;
    }

    setSaving(true);
    try {
      const body = { firstName, lastName, address, contactNumber, facebookUrl, date, startTime, endTime, procedure, doctor, status, notes };

      if (isNew) {
        const created = await appointmentsApi.create(body);
        actions.addAppointment(created);
        // Auto-create/sync client record
        try {
          const clients = await clientsApi.getAll();
          const existing = clients.find(c => c.firstName === firstName && c.lastName === lastName);
          if (!existing) {
            const nc = await clientsApi.create({ firstName, lastName, address, contactNumber, facebookUrl, notes: '' });
            actions.addClient(nc);
          } else {
            const uc = await clientsApi.update(existing.id, { address, contactNumber, facebookUrl });
            actions.updateClient(uc);
          }
        } catch { /* client sync is best-effort */ }
        showToast('Appointment created', 'success');
      } else {
        const updated = await appointmentsApi.update(apptModalId, body);
        actions.updateAppointment(updated);
        showToast('Appointment updated', 'success');
      }
      actions.closeApptModal();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    actions.openConfirm({
      title: 'Delete Appointment',
      msg: 'Permanently delete this appointment? This cannot be undone.',
      onOk: async () => {
        try {
          await appointmentsApi.delete(apptModalId);
          actions.deleteAppointment(apptModalId);
          actions.closeConfirm();
          actions.closeApptModal();
          showToast('Deleted', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  async function handleCancel() {
    const a = appointments.find(ap => ap.id === apptModalId);
    actions.openConfirm({
      title: 'Cancel Appointment',
      msg: `Cancel appointment for ${a?.firstName} ${a?.lastName}? It will remain visible in the calendar.`,
      onOk: async () => {
        try {
          const updated = await appointmentsApi.update(apptModalId, { status: 'cancelled' });
          actions.updateAppointment(updated);
          actions.closeConfirm();
          actions.closeApptModal();
          showToast('Appointment cancelled', 'warning');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  const isCancelled = appointments.find(a => a.id === apptModalId)?.status === 'cancelled';

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && actions.closeApptModal()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>{isNew ? 'New Appointment' : 'Edit Appointment'}</h3>
          <button className="close-btn" onClick={() => actions.closeApptModal()}><i className="fa fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <h4>Patient Information</h4>
            <div className="field-grid-2">
              <div className="form-group"><label>First Name <span className="text-red-600 font-semibold">*</span></label><input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Juan" /></div>
              <div className="form-group"><label>Last Name *</label><input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dela Cruz" /></div>
            </div>
            <div className="form-group">
              <label>Address *</label>
              <PhilippineAddressSelect value={addr} onChange={setAddr} isNew={isNew} />
            </div>
            <div className="field-grid-2">
              <div className="form-group"><label>Contact Number *</label><input className="form-input" type="tel" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="09XX-XXX-XXXX" /></div>
              <div className="form-group"><label>Facebook / Messenger URL</label><input className="form-input" value={form.facebookUrl} onChange={e => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." /></div>
            </div>
          </div>

          <div className="form-section">
            <h4>Appointment Details (PHT — Asia/Manila)</h4>
            <div className="field-grid-3">
              <div className="form-group"><label>Date * (PHT)</label><input id="appt-date" className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
              <div className="form-group"><label>Start Time *</label><input className="form-input" type="time" step="60" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></div>
              <div className="form-group"><label>End Time *</label><input className="form-input" type="time" step="60" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></div>
            </div>
            <div className="field-grid-3">
              <div className="form-group">
                <label>Procedure Type *</label>
                <select className="form-input" value={form.procedure} onChange={e => set('procedure', e.target.value)}>
                  <option value="">Select Procedure</option>
                  {PROCEDURES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Doctor *</label>
                <select className="form-input" value={form.doctor} onChange={e => set('doctor', e.target.value)}>
                  <option value="dr1">{settings.dr1Name || 'Dr. A'}</option>
                  <option value="dr2">{settings.dr2Name || 'Dr. B'}</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>Notes (Optional)</label><textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" /></div>
          </div>

          {conflict && (
            <div style={{ background: 'var(--err-l)', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
              <i className="fa fa-exclamation-triangle"></i>
              {conflict}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => actions.closeApptModal()}>Cancel</button>
          {!isNew && !isCancelled && <button className="btn btn-warning btn-sm" onClick={handleCancel}><i className="fa fa-ban"></i> Cancel Appt</button>}
          {!isNew && <button className="btn btn-danger btn-sm" onClick={handleDelete}><i className="fa fa-trash"></i> Delete</button>}
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <i className="fa fa-save"></i> {saving ? 'Saving…' : isNew ? 'Save' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}