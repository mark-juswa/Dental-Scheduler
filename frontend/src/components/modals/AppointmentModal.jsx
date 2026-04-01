import { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp.js';
import { appointmentsApi, clientsApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';
import { todayPHT, parseTime, checkConflict } from '../../utils/calendarHelpers.js';
import { PROCEDURES as DEFAULT_PROCEDURES, STATUSES } from '../../utils/constants.js';
import PhilippineAddressSelect from './PhilippineAddressSelect.jsx';
import { buildAddressString, parseAddressString } from '../../utils/phAddress.js';

const EMPTY_ADDR = { region: '', regionCode: '', province: '', provinceCode: '', city: '', cityCode: '', barangay: '' };

const EMPTY = {
  firstName: '', lastName: '', contactNumber: '', facebookUrl: '',
  date: '', startTime: '09:00', endTime: '10:00', procedure: '', doctor: 'dr1', status: 'pending', notes: '',
};

const S = {
  sectionCard: {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: '14px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    background: 'var(--surface-2)',
    borderBottom: '1.5px solid var(--border)',
  },
  sectionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.02em',
  },
  sectionSubtitle: {
    fontSize: '11px',
    color: 'var(--text-m)',
    fontWeight: '400',
  },
  sectionBody: {
    padding: '18px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text)',
    marginBottom: '6px',
    letterSpacing: '0.01em',
  },
  required: {
    color: 'var(--err)',
    marginLeft: '3px',
  },
  helperText: {
    fontSize: '11px',
    color: 'var(--text-m)',
    marginTop: '4px',
  },
  errorText: {
    fontSize: '11px',
    color: 'var(--err)',
    marginTop: '4px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
};

function FieldGroup({ label, required, error, helper, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={S.label}>
        {label}
        {required && <span style={S.required}>*</span>}
      </label>
      {children}
      {error
        ? <p style={S.errorText}><i className="fa fa-exclamation-circle" style={{ fontSize: '10px' }}></i>{error}</p>
        : helper
        ? <p style={S.helperText}>{helper}</p>
        : null
      }
    </div>
  );
}

export default function AppointmentModal() {
  const { state, actions } = useApp();
  const { apptModalOpen, apptModalId, appointments, settings } = state;
  const isNew = !apptModalId;

  const [form, setForm] = useState({ ...EMPTY });
  const [addr, setAddr] = useState({ ...EMPTY_ADDR });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!apptModalOpen) return;
    setErrors({});
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
      setAddr(parseAddressString(a.address || ''));
    }
  }, [apptModalOpen, apptModalId]);

  if (!apptModalOpen) return null;

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
    setConflict('');
  }

  function inputStyle(fieldName) {
    return {
      width: '100%',
      padding: '10px 14px',
      border: errors[fieldName] ? '2px solid var(--err)' : '1.5px solid var(--border)',
      borderRadius: '10px',
      background: errors[fieldName] ? 'var(--err-l)' : 'var(--surface-2)',
      color: 'var(--text)',
      fontSize: '14px',
      transition: 'border-color .2s, box-shadow .2s, background .2s',
      outline: 'none',
      fontFamily: 'var(--font)',
    };
  }

  function selectStyle(fieldName) {
    return {
      ...inputStyle(fieldName),
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      paddingRight: '28px',
      cursor: 'pointer',
    };
  }

  function validate() {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    if (!form.date) newErrors.date = 'Please select a date';
    if (!form.startTime) newErrors.startTime = 'Start time is required';
    if (!form.endTime) newErrors.endTime = 'End time is required';
    if (!form.procedure) newErrors.procedure = 'Please select a procedure type';
    if (!addr.region) newErrors.address = 'Region is required';
    if (!addr.province) newErrors.address = 'Province is required';
    if (!addr.city) newErrors.address = 'City / Municipality is required';
    return newErrors;
  }

  async function handleSave() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    const { firstName, lastName, contactNumber, date, startTime, endTime, procedure, doctor, status, facebookUrl, notes } = form;
    const address = buildAddressString(addr);

    if (parseTime(startTime).total >= parseTime(endTime).total) {
      setErrors(e => ({ ...e, endTime: 'End time must be after start time' }));
      return;
    }
    if (parseTime(startTime).total >= 24 * 60 || parseTime(endTime).total > 24 * 60) {
      setErrors(e => ({ ...e, endTime: 'Times cannot exceed midnight' }));
      return;
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
        showToast('Appointment created successfully!', 'success');
      } else {
        const updated = await appointmentsApi.update(apptModalId, body);
        actions.updateAppointment(updated);
        showToast('Appointment updated!', 'success');
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
        <div className="modal-header" style={{ background: isNew ? 'linear-gradient(135deg, #1e3a8a, #0e7490)' : 'var(--surface-2)', borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: isNew ? '#fff' : 'var(--primary)' }}>
              <i className={isNew ? 'fa fa-calendar-plus' : 'fa fa-calendar-check'}></i>
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: isNew ? '#fff' : 'var(--text)', marginBottom: '1px' }}>
                {isNew ? 'New Appointment' : 'Edit Appointment'}
              </h3>
              <p style={{ fontSize: '11px', color: isNew ? 'rgba(255,255,255,0.7)' : 'var(--text-m)', fontWeight: '400' }}>
                {isNew ? 'Fill in the patient and schedule details below' : 'Update the appointment information'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={() => actions.closeApptModal()}
            style={{ background: isNew ? 'rgba(255,255,255,0.15)' : 'var(--surface)', borderColor: isNew ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: isNew ? '#fff' : 'var(--text-m)' }}>
            <i className="fa fa-times"></i>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', background: 'var(--bg)' }}>
          <div style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={{ ...S.sectionIcon, background: 'var(--primary-l)', color: 'var(--primary)' }}>
                <i className="fa fa-user"></i>
              </div>
              <div>
                <div style={S.sectionTitle}>Patient Information</div>
                <div style={S.sectionSubtitle}>Who is this appointment for?</div>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FieldGroup label="First Name" required error={errors.firstName}>
                  <input
                    style={inputStyle('firstName')}
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    placeholder="e.g. Juan"
                  />
                </FieldGroup>
                <FieldGroup label="Last Name" required error={errors.lastName}>
                  <input
                    style={inputStyle('lastName')}
                    value={form.lastName}
                    onChange={e => set('lastName', e.target.value)}
                    placeholder="e.g. Dela Cruz"
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Home Address" required error={errors.address} helper="Select Region → Province → City → Barangay">
                <div style={{ border: errors.address ? '2px solid var(--err)' : '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: errors.address ? 'var(--err-l)' : 'transparent' }}>
                  <PhilippineAddressSelect value={addr} onChange={v => { setAddr(v); if (errors.address) setErrors(e => ({ ...e, address: '' })); }} isNew={isNew} />
                </div>
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FieldGroup label="Contact Number" required error={errors.contactNumber} helper="e.g. 09XX-XXX-XXXX">
                  <input
                    style={inputStyle('contactNumber')}
                    type="tel"
                    value={form.contactNumber}
                    onChange={e => set('contactNumber', e.target.value)}
                    placeholder="09XX-XXX-XXXX"
                  />
                </FieldGroup>
                <FieldGroup label="Facebook / Messenger" helper="Optional — for appointment reminders">
                  <input
                    style={inputStyle('facebookUrl')}
                    value={form.facebookUrl}
                    onChange={e => set('facebookUrl', e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </FieldGroup>
              </div>
            </div>
          </div>

          <div style={S.sectionCard}>
            <div style={S.sectionHeader}>
              <div style={{ ...S.sectionIcon, background: 'var(--ok-l)', color: 'var(--ok)' }}>
                <i className="fa fa-calendar-alt"></i>
              </div>
              <div>
                <div style={S.sectionTitle}>Appointment Details</div>
                <div style={S.sectionSubtitle}>Schedule and treatment information</div>
              </div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                <FieldGroup label="Appointment Date" required error={errors.date}>
                  <input
                    id="appt-date"
                    style={inputStyle('date')}
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Start Time" required error={errors.startTime}>
                  <input
                    style={inputStyle('startTime')}
                    type="time"
                    step="60"
                    value={form.startTime}
                    onChange={e => set('startTime', e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="End Time" required error={errors.endTime}>
                  <input
                    style={inputStyle('endTime')}
                    type="time"
                    step="60"
                    value={form.endTime}
                    onChange={e => set('endTime', e.target.value)}
                  />
                </FieldGroup>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                <FieldGroup label="Procedure / Treatment" required error={errors.procedure}>
                  <select
                    style={selectStyle('procedure')}
                    value={form.procedure}
                    onChange={e => set('procedure', e.target.value)}
                  >
                    <option value="">— Select a procedure —</option>
                    {DEFAULT_PROCEDURES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    {(settings.customProcedures || []).length > 0 && (
                      <option disabled>──── Custom ────</option>
                    )}
                    {(settings.customProcedures || []).map(cp => (
                      <option key={cp.key} value={cp.key}>{cp.label}</option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Assigned Doctor" required>
                  <select style={selectStyle('doctor')} value={form.doctor} onChange={e => set('doctor', e.target.value)}>
                    <option value="dr1">{settings.dr1Name || 'Dr. A'}</option>
                    <option value="dr2">{settings.dr2Name || 'Dr. B'}</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Status">
                  <select style={selectStyle('status')} value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </FieldGroup>
              </div>

              <FieldGroup label="Additional Notes" helper="Allergies, special requests, or anything the doctor should know">
                <textarea
                  style={{ ...inputStyle('notes'), resize: 'vertical', minHeight: '80px' }}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="e.g. Patient is allergic to penicillin…"
                />
              </FieldGroup>
            </div>
          </div>

          {conflict && (
            <div style={{ background: 'var(--err-l)', border: '2px solid var(--err)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#991b1b', fontWeight: '700' }}>
              <i className="fa fa-exclamation-triangle" style={{ fontSize: '16px' }}></i>
              <div>
                <div>Schedule Conflict Detected</div>
                <div style={{ fontSize: '11px', fontWeight: '500', opacity: 0.85, marginTop: '2px' }}>{conflict}</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => actions.closeApptModal()}>
            <i className="fa fa-times"></i> Close
          </button>
          {!isNew && !isCancelled && (
            <button className="btn btn-warning btn-sm" onClick={handleCancel}>
              <i className="fa fa-ban"></i> Cancel Appt
            </button>
          )}
          {!isNew && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <i className="fa fa-trash"></i> Delete
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '9px 22px', fontSize: '14px', fontWeight: '800', minWidth: '160px' }}
          >
            {saving
              ? <><i className="fa fa-spinner fa-spin"></i> Saving…</>
              : isNew
              ? <><i className="fa fa-calendar-plus"></i> Create Appointment</>
              : <><i className="fa fa-check"></i> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}