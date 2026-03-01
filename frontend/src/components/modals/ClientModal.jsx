import { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp.js';
import { clientsApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';
import PhilippineAddressSelect from './PhilippineAddressSelect.jsx';
import { buildAddressString, parseAddressString } from '../../utils/phAddress.js';

const EMPTY_CLIENT = { firstName: '', lastName: '', contactNumber: '', facebookUrl: '', notes: '' };
const EMPTY_ADDR = { region: '', regionCode: '', province: '', provinceCode: '', city: '', cityCode: '', barangay: '' };

// ── Client Modal ──────────────────────────────────────────────────────────────
export function ClientModal() {
  const { state, actions } = useApp();
  const { clientModalOpen, clientModalId, clients } = state;
  const isNew = !clientModalId;
  const [form, setForm] = useState({ ...EMPTY_CLIENT });
  const [addr, setAddr] = useState({ ...EMPTY_ADDR });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientModalOpen) return;
    if (isNew) { setForm({ ...EMPTY_CLIENT }); setAddr({ ...EMPTY_ADDR }); return; }
    const c = clients.find(cl => cl.id === clientModalId);
    if (!c) return;
    setForm({ firstName: c.firstName, lastName: c.lastName, contactNumber: c.contactNumber, facebookUrl: c.facebookUrl || '', notes: c.notes || '' });
    setAddr(parseAddressString(c.address || ''));
  }, [clientModalOpen, clientModalId]);

  if (!clientModalOpen) return null;

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSave() {
    const { firstName, lastName, contactNumber, facebookUrl, notes } = form;
    const address = buildAddressString(addr);
    if (!firstName || !lastName || !contactNumber) { showToast('Fill required fields', 'warning'); return; }
    if (!addr.city || !addr.province || !addr.region) { showToast('Please complete the address fields', 'warning'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const created = await clientsApi.create({ firstName, lastName, address, contactNumber, facebookUrl, notes });
        actions.addClient(created);
        showToast('Client added', 'success');
      } else {
        const updated = await clientsApi.update(clientModalId, { firstName, lastName, address, contactNumber, facebookUrl, notes });
        actions.updateClient(updated);
        showToast('Client updated', 'success');
      }
      actions.closeClientModal();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && actions.closeClientModal()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <h3>{isNew ? 'Add Client' : 'Edit Client'}</h3>
          <button className="close-btn" onClick={() => actions.closeClientModal()}><i className="fa fa-times"></i></button>
        </div>
        <div className="modal-body">
          <div className="field-grid-2">
            <div className="form-group"><label>First Name *</label><input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Juan" /></div>
            <div className="form-group"><label>Last Name *</label><input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dela Cruz" /></div>
          </div>
          <div className="form-group">
            <label>Address *</label>
            <PhilippineAddressSelect value={addr} onChange={setAddr} isNew={isNew} />
          </div>
          <div className="field-grid-2">
            <div className="form-group"><label>Contact *</label><input className="form-input" type="tel" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="09XX-XXX-XXXX" /></div>
            <div className="form-group"><label>Facebook URL</label><input className="form-input" value={form.facebookUrl} onChange={e => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." /></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Patient notes…" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => actions.closeClientModal()}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <i className="fa fa-save"></i> {saving ? 'Saving…' : 'Save Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
export function ConfirmModal() {
  const { state, actions } = useApp();
  const { confirmModal } = state;

  if (!confirmModal) return null;

  return (
    <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && actions.closeConfirm()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h3>{confirmModal.title || 'Confirm Action'}</h3>
          <button className="close-btn" onClick={() => actions.closeConfirm()}><i className="fa fa-times"></i></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-m)' }}>{confirmModal.msg}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => actions.closeConfirm()}>No</button>
          <button className="btn btn-danger btn-sm" onClick={() => confirmModal.onOk && confirmModal.onOk()}>
            Yes, Confirm
          </button>
        </div>
      </div>
    </div>
  );
}