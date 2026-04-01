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
  firstName: '', middleName: '', lastName: '',
  contactNumber: '', facebookUrl: '',
  date: '', startTime: '09:00', endTime: '10:00',
  procedure: '', doctor: 'dr1', status: 'pending', notes: '',
};

/* ── Reusable field wrapper with label + error/hint ── */
function Field({ label, required, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '.01em' }}>
        {label}
        {required && <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error
        ? <span style={{ fontSize: 11, color: 'var(--err)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa fa-exclamation-circle" style={{ fontSize: 10 }} /> {error}
        </span>
        : hint
          ? <span style={{ fontSize: 11, color: 'var(--text-m)' }}>{hint}</span>
          : null
      }
    </div>
  );
}

/* ── Section card with icon header ── */
function Section({ icon, iconBg, iconColor, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', background: 'var(--surface-2)', borderBottom: '1.5px solid var(--border)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
          <i className={`fa ${icon}`} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-m)', fontWeight: 400 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
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
        firstName: a.firstName, middleName: a.middleName || '', lastName: a.lastName,
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

  /* Dynamic input style — turns red on error */
  function inputCss(field) {
    const hasErr = !!errors[field];
    return {
      padding: '10px 13px', border: hasErr ? '2px solid var(--err)' : '1.5px solid var(--border)',
      borderRadius: 10, background: hasErr ? 'var(--err-l)' : 'var(--surface-2)',
      color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none',
      fontFamily: 'var(--font)', transition: 'border-color .15s, background .15s',
    };
  }

  function selectCss(field) {
    return {
      ...inputCss(field),
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, cursor: 'pointer',
    };
  }

  /* A responsive 2-column row */
  function Row2({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
  }
  /* A responsive 3-column row */
  function Row3({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>{children}</div>;
  }

  function validate() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.contactNumber.trim()) e.contactNumber = 'Contact number is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.startTime) e.startTime = 'Start time is required';
    if (!form.endTime) e.endTime = 'End time is required';
    if (!form.procedure) e.procedure = 'Please select a procedure';
    if (!addr.region) e.address = 'Region is required';
    else if (!addr.province) e.address = 'Province is required';
    else if (!addr.city) e.address = 'City / Municipality is required';
    return e;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    const { firstName, middleName, lastName, contactNumber, date, startTime, endTime, procedure, doctor, status, facebookUrl, notes } = form;
    const address = buildAddressString(addr);

    if (parseTime(startTime).total >= parseTime(endTime).total) {
      setErrors(e => ({ ...e, endTime: 'End time must be after start time' })); return;
    }
    if (parseTime(endTime).total > 24 * 60) {
      setErrors(e => ({ ...e, endTime: 'Time cannot exceed midnight' })); return;
    }

    const hasConflict = checkConflict(appointments, apptModalId || '__new__', date, startTime, endTime, doctor, settings.conflictDetect);
    if (hasConflict) {
      const docN = doctor === 'dr1' ? (settings.dr1Name || 'Dr. A') : (settings.dr2Name || 'Dr. B');
      setConflict(`Time slot conflicts with another appointment for ${docN}!`);
      return;
    }

    setSaving(true);
    try {
      const body = { firstName, middleName, lastName, address, contactNumber, facebookUrl, date, startTime, endTime, procedure, doctor, status, notes };

      if (isNew) {
        const created = await appointmentsApi.create(body);
        actions.addAppointment(created);
        try {
          const clients = await clientsApi.getAll();
          const existing = clients.find(c => c.firstName === firstName && c.lastName === lastName);
          if (!existing) {
            const nc = await clientsApi.create({ firstName, middleName, lastName, address, contactNumber, facebookUrl, notes: '' });
            actions.addClient(nc);
          } else {
            const uc = await clientsApi.update(existing.id, { middleName, address, contactNumber, facebookUrl });
            actions.updateClient(uc);
          }
        } catch { /* best-effort */ }
        showToast('Appointment created!', 'success');
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
          actions.closeConfirm(); actions.closeApptModal();
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
          actions.closeConfirm(); actions.closeApptModal();
          showToast('Appointment cancelled', 'warning');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  const isCancelled = appointments.find(a => a.id === apptModalId)?.status === 'cancelled';

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && actions.closeApptModal()}>
      <div className="modal modal-lg">

        {/* ── Header ── */}
        <div className="modal-header" style={{
          background: isNew ? 'linear-gradient(135deg,#1e3a8a,#0e7490)' : 'var(--surface-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: isNew ? '#fff' : 'var(--primary)' }}>
              <i className={`fa ${isNew ? 'fa-calendar-plus' : 'fa-calendar-check'}`} />
            </div>
            <div>
              <h3 style={{ color: isNew ? '#fff' : 'var(--text)', marginBottom: 1 }}>{isNew ? 'New Appointment' : 'Edit Appointment'}</h3>
              <p style={{ fontSize: 11, fontWeight: 400, color: isNew ? 'rgba(255,255,255,.7)' : 'var(--text-m)' }}>
                {isNew ? 'Fill in the patient details and schedule below' : 'Update the appointment information'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={() => actions.closeApptModal()}
            style={{ background: isNew ? 'rgba(255,255,255,.15)' : 'var(--surface)', borderColor: isNew ? 'rgba(255,255,255,.2)' : 'var(--border)', color: isNew ? '#fff' : 'var(--text-m)' }}>
            <i className="fa fa-times" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body" style={{ padding: 20, background: 'var(--bg)' }}>

          {/* ── SECTION 1: Patient Information ── */}
          <Section icon="fa-user" iconBg="var(--primary-l)" iconColor="var(--primary)"
            title="Patient Information" subtitle="Personal details of the patient">

            {/* Name row — 3 columns: First | Middle | Last */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="First Name" required error={errors.firstName}>
                <input style={inputCss('firstName')} value={form.firstName}
                  onChange={e => set('firstName', e.target.value)} placeholder="e.g. Juan" />
              </Field>
              <Field label="Middle Name" hint="Optional">
                <input style={inputCss('middleName')} value={form.middleName}
                  onChange={e => set('middleName', e.target.value)} placeholder="e.g. Santos" />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input style={inputCss('lastName')} value={form.lastName}
                  onChange={e => set('lastName', e.target.value)} placeholder="e.g. Dela Cruz" />
              </Field>
            </div>

            {/* Address */}
            <Field label="Home Address" required error={errors.address}>
              <div style={{ border: errors.address ? '2px solid var(--err)' : '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: errors.address ? 'var(--err-l)' : 'transparent' }}>
                <PhilippineAddressSelect value={addr} onChange={v => { setAddr(v); if (errors.address) setErrors(e => ({ ...e, address: '' })); }} isNew={isNew} />
              </div>
            </Field>

            {/* Contact + Facebook */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Contact Number" required error={errors.contactNumber}>
                <input style={inputCss('contactNumber')} type="tel" value={form.contactNumber}
                  onChange={e => set('contactNumber', e.target.value)} placeholder="09XX-XXX-XXXX" />
              </Field>
              <Field label="Facebook / Messenger Link" hint="Optional — for sending reminders">
                <input style={inputCss('facebookUrl')} value={form.facebookUrl}
                  onChange={e => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." />
              </Field>
            </div>
          </Section>

          {/* ── SECTION 2: Appointment Schedule ── */}
          <Section icon="fa-calendar-alt" iconBg="var(--ok-l)" iconColor="var(--ok)"
            title="Appointment Schedule" subtitle="When and what is the appointment for?">

            {/* Date + Start + End */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12 }}>
              <Field label="Appointment Date" required error={errors.date}>
                <input id="appt-date" style={inputCss('date')} type="date"
                  value={form.date} onChange={e => set('date', e.target.value)} />
              </Field>
              <Field label="Start Time" required error={errors.startTime}>
                <input style={inputCss('startTime')} type="time" step="60"
                  value={form.startTime} onChange={e => set('startTime', e.target.value)} />
              </Field>
              <Field label="End Time" required error={errors.endTime}>
                <input style={inputCss('endTime')} type="time" step="60"
                  value={form.endTime} onChange={e => set('endTime', e.target.value)} />
              </Field>
            </div>

            {/* Procedure */}
            <Field label="Type of Procedure / Treatment" required error={errors.procedure}>
              <select style={selectCss('procedure')} value={form.procedure} onChange={e => set('procedure', e.target.value)}>
                <option value="">— Select the treatment —</option>
                {DEFAULT_PROCEDURES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                {(settings.customProcedures || []).length > 0 && <option disabled>──── Custom ────</option>}
                {(settings.customProcedures || []).map(cp => <option key={cp.key} value={cp.key}>{cp.label}</option>)}
              </select>
            </Field>

            {/* Doctor + Status side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Assigned Doctor" required>
                <select style={selectCss('doctor')} value={form.doctor} onChange={e => set('doctor', e.target.value)}>
                  <option value="dr1">{settings.dr1Name || 'Dr. A'}</option>
                  <option value="dr2">{settings.dr2Name || 'Dr. B'}</option>
                </select>
              </Field>
              <Field label="Appointment Status">
                <select style={selectCss('status')} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
            </div>

            {/* Notes */}
            <Field label="Additional Notes" hint="Allergies, special instructions, or anything the doctor should know">
              <textarea style={{ ...inputCss('notes'), resize: 'vertical', minHeight: 76 }}
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="e.g. Patient is allergic to penicillin, prefers morning appointments…" />
            </Field>
          </Section>

          {/* ── Conflict alert ── */}
          {conflict && (
            <div style={{ background: 'var(--err-l)', border: '2px solid var(--err)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, color: '#991b1b' }}>
              <i className="fa fa-exclamation-triangle" style={{ fontSize: 16, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Schedule Conflict Detected</div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: .85 }}>{conflict}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => actions.closeApptModal()}>
            <i className="fa fa-times" /> Close
          </button>
          {!isNew && !isCancelled && (
            <button className="btn btn-warning btn-sm" onClick={handleCancel}>
              <i className="fa fa-ban" /> Cancel Appt
            </button>
          )}
          {!isNew && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <i className="fa fa-trash" /> Delete
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ padding: '9px 24px', fontWeight: 800, fontSize: 14, minWidth: 170 }}>
            {saving
              ? <><i className="fa fa-spinner fa-spin" /> Saving…</>
              : isNew
                ? <><i className="fa fa-calendar-plus" /> Create Appointment</>
                : <><i className="fa fa-check" /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}