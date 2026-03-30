import { useState } from 'react';
import { useApp } from '../context/useApp.js';
import { settingsApi, blockedDatesApi } from '../services/apiServices.js';
import { showToast } from '../ui/toastService.js';
import { PROC_LABELS, DEFAULT_PROC_COLOR } from '../utils/constants.js';
import { useProcColors } from '../hooks/useProcColors.js';
import { appointmentsApi, backupApi } from '../services/apiServices.js';

// Built-in default procedure keys
const DEFAULT_PROCS = [
  'extraction','filling','oralProphylaxis','denture','ortho','prosto',
  'consultation','other','cleaning','rootCanal','orthodontics','whitening',
];

export default function SettingsPage() {
  const { state, actions } = useApp();
  const { settings, blockedDates } = state;
  const PROC_COLORS = useProcColors();
  const [blockDateInput, setBlockDateInput] = useState('');
  const [expandedProc, setExpandedProc] = useState(null); // which proc row is open
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [newProcColors, setNewProcColors] = useState({ ...DEFAULT_PROC_COLOR });

  // Build ALL_PROCS dynamically: defaults + custom
  const customProcedures = settings.customProcedures || [];
  const ALL_PROCS = [...DEFAULT_PROCS, ...customProcedures.map(cp => cp.key)];

  // Build a combined labels map: defaults + custom
  const allLabels = { ...PROC_LABELS };
  for (const cp of customProcedures) { allLabels[cp.key] = cp.label; }

  async function saveSetting(patch) {
    const merged = { ...settings, ...patch };
    actions.setSettings(patch);
    try {
      await settingsApi.save(merged);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function blockDate() {
    if (!blockDateInput) return;
    try {
      const bd = await blockedDatesApi.block(blockDateInput);
      actions.addBlockedDate(bd);
      setBlockDateInput('');
      showToast('Date blocked', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function unblockDate(id) {
    try {
      await blockedDatesApi.unblock(id);
      actions.removeBlockedDate(id);
      showToast('Date unblocked', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function exportData() {
    try {
      showToast('Generating backup...', 'success');
      const blob = await backupApi.export(true); // Updates the lastBackupDate
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `DentalBackup_${new Date().toISOString().split('T')[0]}.json`; 
      a.click();
      URL.revokeObjectURL(url);
      
      // Update local state to hide reminders gracefully
      actions.setSettings({ ...settings, lastBackupDate: new Date().toISOString() });
      showToast('Backup exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export backup: ' + err.message, 'error');
    }
  }

  async function handleRestore(e) {
    const file = e.target.files[0]; 
    if (!file) return;
    
    try {
      showToast('Restoring data...', 'success');
      const formData = new FormData();
      formData.append('backupFile', file);
      
      const stats = await backupApi.restore(formData);
      showToast(`Restored: ${stats.appointments} appts, ${stats.clients} clients.`, 'success');
      setTimeout(() => window.location.reload(), 1500); // hard reload to sync memory
    } catch (err) {
      showToast('Failed to restore: ' + err.message, 'error');
    }
    e.target.value = '';
  }

  function handlePurge() {
    actions.openConfirm({
      title: 'Archive & Purge Old Data',
      msg: 'This permanently deletes appointments and logs older than 12 months from the active cloud database. Make sure you downloaded a backup first!',
      onOk: async () => {
        try {
          const res = await backupApi.purge(12);
          actions.closeConfirm();
          showToast(`Purged ${res.appointmentsDeleted} appointments and ${res.logsDeleted} logs`, 'success');
          // Quietly removing from local state without full reload
          actions.setAppointments(state.appointments.filter(a => {
            const d = new Date(a.date);
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - 12);
            return d >= cutoff;
          }));
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  function resetData() {
    actions.openConfirm({
      title: 'Reset All Data',
      msg: 'This deletes ALL appointments from the server. Cannot be undone.',
      onOk: async () => {
        try {
          for (const a of state.appointments) { try { await appointmentsApi.delete(a.id); } catch { /* empty */ } }
          actions.setAppointments([]);
          actions.closeConfirm();
          showToast('Reset complete', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
  }

  // Save a single color channel for a procedure
  async function saveProcColor(proc, channel, value) {
    const existing = settings.procColors || {};
    const updated = {
      ...existing,
      [proc]: { ...(existing[proc] || {}), [channel]: value },
    };
    await saveSetting({ procColors: updated });
  }

  // Reset one procedure back to default colors
  async function resetProcColor(proc) {
    const existing = { ...(settings.procColors || {}) };
    delete existing[proc];
    await saveSetting({ procColors: existing });
    showToast(`${PROC_LABELS[proc]} reset to default`, 'success');
  }

  // Reset ALL procedure colors
  async function resetAllProcColors() {
    await saveSetting({ procColors: {} });
    showToast('All procedure colors reset to defaults', 'success');
  }

  // Check if a procedure has any custom color saved
  function isCustomized(proc) {
    const c = settings.procColors || {};
    return !!(c[proc] && Object.keys(c[proc]).length > 0);
  }

  // Check if a procedure is user-created (not a default)
  function isCustomProcedure(proc) {
    return !DEFAULT_PROCS.includes(proc);
  }

  // Add a new custom procedure
  async function addCustomProcedure() {
    const label = newProcName.trim();
    if (!label) { showToast('Enter a procedure name', 'warning'); return; }
    // Generate a camelCase key from the label
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\s+/, '');
    if (!key) { showToast('Invalid procedure name', 'warning'); return; }
    // Check for duplicates
    if (DEFAULT_PROCS.includes(key) || customProcedures.some(cp => cp.key === key)) {
      showToast('A procedure with this name already exists', 'warning'); return;
    }
    const newProc = { key, label, ...newProcColors };
    const updated = [...customProcedures, newProc];
    await saveSetting({ customProcedures: updated });
    setNewProcName('');
    setNewProcColors({ ...DEFAULT_PROC_COLOR });
    setShowAddForm(false);
    showToast(`"${label}" procedure added`, 'success');
  }

  // Delete a custom procedure
  async function deleteCustomProcedure(key) {
    const proc = customProcedures.find(cp => cp.key === key);
    const updated = customProcedures.filter(cp => cp.key !== key);
    // Also remove any procColors overrides for this key
    const colors = { ...(settings.procColors || {}) };
    delete colors[key];
    await saveSetting({ customProcedures: updated, procColors: colors });
    if (expandedProc === key) setExpandedProc(null);
    showToast(`"${proc?.label || key}" removed`, 'success');
  }

  return (
    <div className="view active" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <div className="view-scroll">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Settings</h2>
          <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Customize your scheduling system</p>
        </div>
        <div className="settings-grid">

          {/* Working Hours */}
          <div className="card">
            <div className="card-header"><h3><i className="fa fa-clock" style={{ color: 'var(--primary)', marginRight: 7 }}></i> Working Hours</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Day Start</label>
                <select className="form-input" value={settings.workStart} onChange={e => saveSetting({ workStart: parseInt(e.target.value) })}>
                  {[6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h < 12 ? `${h}:00 AM` : '12:00 PM'}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Day End</label>
                <select className="form-input" value={settings.workEnd} onChange={e => saveSetting({ workEnd: Math.min(24, parseInt(e.target.value)) })}>
                  {[17,18,19,20,21,22,23,24].map(h => <option key={h} value={h}>{h === 24 ? '12:00 AM (Midnight)' : h <= 12 ? `${h}:00 PM` : `${h-12}:00 PM`}</option>)}
                </select>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 4 }}>
                <i className="fa fa-info-circle" style={{ color: 'var(--primary)' }}></i> Events render at exact minute precision.
              </p>
            </div>
          </div>

          {/* Doctors */}
          <div className="card">
            <div className="card-header"><h3><i className="fa fa-user-md" style={{ color: '#7c3aed', marginRight: 7 }}></i> Doctors</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Doctor 1 Name</label>
                <input className="form-input" defaultValue={settings.dr1Name || 'Dr. A'} placeholder="Dr. A"
                  onBlur={e => saveSetting({ dr1Name: e.target.value || 'Dr. A' })} />
              </div>
              <div className="form-group">
                <label>Doctor 2 Name</label>
                <input className="form-input" defaultValue={settings.dr2Name || 'Dr. B'} placeholder="Dr. B"
                  onBlur={e => saveSetting({ dr2Name: e.target.value || 'Dr. B' })} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-m)' }}>Doctors have parallel calendar lanes in Day view.</p>
            </div>
          </div>

          {/* Blocked Dates */}
          <div className="card">
            <div className="card-header"><h3><i className="fa fa-ban" style={{ color: 'var(--err)', marginRight: 7 }}></i> Blocked Dates</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label>Block a Date (PHT)</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  <input type="date" className="form-input" value={blockDateInput} onChange={e => setBlockDateInput(e.target.value)} />
                  <button className="btn btn-danger btn-sm" onClick={blockDate}><i className="fa fa-plus"></i></button>
                </div>
              </div>
              <div className="blocked-dates-list">
                {!blockedDates.length
                  ? <span style={{ fontSize: 11, color: 'var(--text-l)' }}>No blocked dates</span>
                  : blockedDates.map(b => (
                    <div key={b.id} className="blocked-tag">
                      {b.date}
                      <button onClick={() => unblockDate(b.id)}><i className="fa fa-times"></i></button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="card">
            <div className="card-header"><h3><i className="fa fa-palette" style={{ color: 'var(--accent)', marginRight: 7 }}></i> Preferences</h3></div>
            <div className="card-body">
              {[
                { key: 'darkMode',        label: 'Dark Mode',                    sub: null },
                { key: 'conflictDetect',  label: 'Conflict Detection',           sub: 'Warn on double booking (same doctor)' },
                { key: 'showWeekends',    label: 'Show Weekends',                sub: null },
                { key: 'showCancelled',   label: 'Show Cancelled in Calendar',   sub: null },
              ].map(({ key, label, sub }) => (
                <div key={key} className="setting-row">
                  <div>
                    <strong style={{ fontSize: 13 }}>{label}</strong>
                    {sub && <p style={{ fontSize: 11, color: 'var(--text-m)' }}>{sub}</p>}
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={!!settings[key]} onChange={e => saveSetting({ [key]: e.target.checked })} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Management */}
          <div className="card">
            <div className="card-header"><h3><i className="fa fa-hdd" style={{ color: 'var(--warn)', marginRight: 7 }}></i> Data Management & Backups</h3></div>
            <div className="card-body">
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Full System Backup</strong>
                <p style={{ fontSize: 11, color: 'var(--text-m)', marginBottom: 8 }}>Export all appointments, clients, and settings.</p>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', marginBottom: 9 }} onClick={exportData}>
                  <i className="fa fa-download"></i> Download Full Backup (.json)
                </button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Restore from Backup</strong>
                <p style={{ fontSize: 11, color: 'var(--text-m)', marginBottom: 8 }}>Safely merges uploaded records into the system.</p>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => document.getElementById('import-file').click()}>
                  <i className="fa fa-upload"></i> Upload Backup File
                </button>
                <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 4, color: 'var(--err)' }}>Archive & Purge</strong>
                <p style={{ fontSize: 11, color: 'var(--text-m)', marginBottom: 8 }}>Delete old appointments safely to free up DB space.</p>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', borderColor: 'var(--err-l)', color: 'var(--err)' }} onClick={handlePurge}>
                  <i className="fa fa-eraser"></i> Purge Data Older Than 1 Year
                </button>
              </div>

              <hr className="divider" />
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={resetData}>
                <i className="fa fa-trash"></i> Factory Reset System
              </button>
            </div>
          </div>

          {/* Procedure Colors — accordion tree, full width */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3><i className="fa fa-palette" style={{ color: 'var(--primary)', marginRight: 7 }}></i> Procedure Colors</h3>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-m)' }}>Click a row to customize</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(f => !f)} title="Add custom procedure">
                  <i className={`fa fa-${showAddForm ? 'times' : 'plus'}`}></i> {showAddForm ? 'Cancel' : 'Add Procedure'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={resetAllProcColors} title="Reset all to defaults">
                  <i className="fa fa-undo"></i> Reset All
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {/* Add Procedure Inline Form */}
              {showAddForm && (
                <div style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  animation: 'fadeIn .15s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <i className="fa fa-plus-circle" style={{ color: 'var(--primary)', fontSize: 14, flexShrink: 0 }} />
                    <input
                      className="form-input"
                      placeholder="Procedure name (e.g. Implant)"
                      value={newProcName}
                      onChange={e => setNewProcName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomProcedure(); }}
                      style={{ flex: 1, minWidth: 160, fontSize: 13 }}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 24, flexWrap: 'wrap' }}>
                    {[
                      { channel: 'bg',     label: 'Background',     icon: 'fa-fill-drip'    },
                      { channel: 'border', label: 'Accent / Border', icon: 'fa-border-style' },
                      { channel: 'text',   label: 'Text',           icon: 'fa-font'         },
                    ].map(({ channel, label, icon }) => (
                      <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className={`fa ${icon}`} style={{ fontSize: 11, color: 'var(--text-m)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-m)' }}>{label}</span>
                        <label style={{
                          width: 30, height: 30,
                          borderRadius: 7,
                          background: newProcColors[channel],
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden', flexShrink: 0,
                        }}>
                          <input
                            type="color"
                            value={newProcColors[channel]}
                            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                            onChange={e => setNewProcColors(prev => ({ ...prev, [channel]: e.target.value }))}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Preview chip */}
                  {newProcName.trim() && (
                    <div style={{ paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-m)' }}>Preview:</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 10px', borderRadius: 20,
                        background: newProcColors.bg, color: newProcColors.text,
                        border: `1.5px solid ${newProcColors.border}`,
                      }}>{newProcName.trim()}</span>
                    </div>
                  )}
                  <div style={{ paddingLeft: 24 }}>
                    <button className="btn btn-primary btn-sm" onClick={addCustomProcedure} style={{ fontSize: 12 }}>
                      <i className="fa fa-check"></i> Add Procedure
                    </button>
                  </div>
                </div>
              )}
              {ALL_PROCS.map((proc, idx) => {
                const c = PROC_COLORS[proc] || PROC_COLORS.other;
                const customized = isCustomized(proc);
                const isCustom = isCustomProcedure(proc);
                const isOpen = expandedProc === proc;

                return (
                  <div key={proc} style={{
                    borderBottom: idx < ALL_PROCS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    {/* ── Collapsed row (always visible) ── */}
                    <div
                      onClick={() => setExpandedProc(isOpen ? null : proc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 18px',
                        cursor: 'pointer',
                        background: isOpen ? 'var(--surface-2)' : 'transparent',
                        transition: 'background .15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Chevron */}
                      <i
                        className={`fa fa-chevron-${isOpen ? 'down' : 'right'}`}
                        style={{ fontSize: 10, color: 'var(--text-l)', width: 10, transition: 'transform .2s', flexShrink: 0 }}
                      />

                      {/* Color dot preview */}
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: c.border, flexShrink: 0,
                        boxShadow: `0 0 0 3px ${c.bg}`,
                        border: `1.5px solid ${c.border}`,
                      }} />

                      {/* Label */}
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                        {allLabels[proc] || proc}
                      </span>

                      {/* Color swatches preview strip */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {['bg', 'border', 'text'].map(ch => (
                          <div key={ch} style={{
                            width: 18, height: 18,
                            borderRadius: 5,
                            background: c[ch],
                            border: '1.5px solid var(--border)',
                            flexShrink: 0,
                          }} title={`${ch}: ${c[ch]}`} />
                        ))}
                      </div>

                      {/* Sample chip */}
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 10px', borderRadius: 20,
                        background: c.bg, color: c.text,
                        border: `1.5px solid ${c.border}`,
                        whiteSpace: 'nowrap',
                        minWidth: 80, textAlign: 'center',
                      }}>
                        {allLabels[proc] || proc}
                      </span>

                      {/* Custom badge */}
                      {(customized || isCustom) && (
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          background: c.border, color: '#fff',
                          padding: '1px 7px', borderRadius: 20,
                          letterSpacing: '.05em', flexShrink: 0,
                        }}>{isCustom ? 'USER' : 'CUSTOM'}</span>
                      )}

                      {/* Delete button for custom procedures */}
                      {isCustom && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteCustomProcedure(proc); }}
                          title="Remove this procedure"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--err)', fontSize: 13, padding: '2px 4px',
                            opacity: 0.7, transition: 'opacity .15s', flexShrink: 0,
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                        >
                          <i className="fa fa-trash-alt"></i>
                        </button>
                      )}
                    </div>

                    {/* ── Expanded panel ── */}
                    {isOpen && (
                      <div style={{
                        background: 'var(--surface)',
                        borderTop: '1px solid var(--border)',
                        padding: '14px 18px 14px 42px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        animation: 'fadeIn .15s ease',
                      }}>
                        {/* Live preview block */}
                        <div style={{
                          background: c.bg,
                          borderLeft: `5px solid ${c.border}`,
                          borderRadius: 8,
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 4,
                        }}>
                          <i className="fa fa-tooth" style={{ color: c.border, fontSize: 14 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: c.text }}>Sample Patient Name</div>
                            <div style={{ fontSize: 10, color: c.text, opacity: .75 }}>09:00 – 10:00 · {allLabels[proc] || proc}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, background: c.border, color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
                            confirmed
                          </span>
                        </div>

                        {/* Color channel rows */}
                        {[
                          { channel: 'bg',     label: 'Background',     icon: 'fa-fill-drip',    hint: 'Card fill color' },
                          { channel: 'border', label: 'Accent / Border', icon: 'fa-border-style', hint: 'Left border & accent' },
                          { channel: 'text',   label: 'Text',           icon: 'fa-font',         hint: 'Label & detail text' },
                        ].map(({ channel, label, icon, hint }) => (
                          <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <i className={`fa ${icon}`} style={{ width: 14, color: 'var(--text-m)', fontSize: 12, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-m)' }}>{hint}</div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-m)', minWidth: 58 }}>
                              {c[channel]}
                            </span>
                            <label style={{
                              width: 36, height: 36,
                              borderRadius: 9,
                              background: c[channel],
                              border: '2px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,.12)',
                              transition: 'transform .1s, box-shadow .1s',
                              flexShrink: 0,
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                              title={`Pick ${label} color`}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.2)'; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,.12)'; }}
                            >
                              <input
                                type="color"
                                value={c[channel]}
                                style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                                onChange={e => saveProcColor(proc, channel, e.target.value)}
                              />
                            </label>
                          </div>
                        ))}

                        {/* Reset this procedure */}
                        {customized && (
                          <div style={{ paddingTop: 4, borderTop: '1px dashed var(--border)', marginTop: 2 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => { resetProcColor(proc); setExpandedProc(null); }}
                            >
                              <i className="fa fa-undo"></i> Reset {allLabels[proc] || proc} to default
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}