import { useState, useEffect } from 'react';
import { useApp } from '../../context/useApp.js';
import { backupApi } from '../../services/apiServices.js';
import { showToast } from '../../ui/toastService.js';

export default function BackupReminder({ role }) {
  const { state, actions } = useApp();
  const { settings } = state;
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== 'super_admin') return;
    if (!settings) return;

    const last = settings.lastBackupDate ? new Date(settings.lastBackupDate) : null;
    const now = new Date();
    
    // Show if never backed up, OR if older than 180 days
    let needsBackup = false;
    if (!last) {
      needsBackup = true;
    } else {
      const diffTime = Math.abs(now - last);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 180) needsBackup = true;
    }

    if (needsBackup && !sessionStorage.getItem('backup_reminded')) {
      setShow(true);
    }
  }, [settings, role]);

  async function handleBackup() {
    try {
      setLoading(true);
      const blob = await backupApi.export(true);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DentalBackup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      showToast('Backup downloaded successfully!', 'success');
      
      actions.setSettings({ ...settings, lastBackupDate: new Date().toISOString() });
      setShow(false);
    } catch (err) {
      showToast('Failed to generate backup: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('backup_reminded', 'true');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 3000 }}>
      <div className="modal modal-sm" style={{ padding: '24px', textAlign: 'center' }}>
        <i className="fa fa-hdd" style={{ fontSize: 42, color: 'var(--primary)', marginBottom: 16 }}></i>
        <h2 style={{ fontSize: 20, marginBottom: 8, fontWeight: 800 }}>Routine Backup Required</h2>
        <p style={{ color: 'var(--text-m)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          It has been over 6 months since your last system backup. To ensure no data is ever lost, please download a fresh backup file to your computer.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleBackup} 
            disabled={loading}
          >
            {loading ? <><i className="fa fa-spinner fa-spin"></i> Generating...</> : <><i className="fa fa-download"></i> Download Full Backup Now</>}
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleDismiss}
            style={{ fontSize: 13, border: 'none' }}
          >
            Remind Me Next Session
          </button>
        </div>
      </div>
    </div>
  );
}
