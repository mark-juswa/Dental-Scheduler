import supabase from '../lib/supabase.js';

// ── Helpers ────────────────────────────────────────────────────────────────
async function addAudit(action, detail, userEmail = 'system') {
  await supabase.from('audit_log').insert({ action, detail, user_email: userEmail });
}

// ── GET /api/backup/export ──────────────────────────────────────────────────
export async function exportBackup(req, res) {
  try {
    const promises = [
      supabase.from('appointments').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('blocked_dates').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(2000)
    ];

    const [apptsRes, clientsRes, blockedRes, settingsRes, auditRes] = await Promise.all(promises);

    const errors = [apptsRes.error, clientsRes.error, blockedRes.error, settingsRes.error, auditRes.error].filter(Boolean);
    if (errors.length > 0) {
      return res.status(500).json({ data: null, error: 'Database export errors', details: errors });
    }

    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        appointments: apptsRes.data,
        clients: clientsRes.data,
        blocked_dates: blockedRes.data,
        settings: settingsRes.data,
        audit_log: auditRes.data
      }
    };

    if (req.query.updateDate === 'true') {
      const { data: existingSettings } = await supabase.from('settings').select('value').eq('key', 'clinic').single();
      const mergedValue = { ...(existingSettings?.value || {}), lastBackupDate: new Date().toISOString() };
      await supabase.from('settings').upsert({ key: 'clinic', value: mergedValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }

    await addAudit('EXPORT', 'Requested full system backup JSON', req.user?.email);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=DentalBackup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
}

// ── POST /api/backup/restore ────────────────────────────────────────────────
export async function restoreBackup(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const raw = req.file.buffer.toString('utf8');
    const backup = JSON.parse(raw);

    if (!backup.data || typeof backup.data !== 'object') {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    const { clients, appointments, blocked_dates, settings } = backup.data;

    let restoredStats = { clients: 0, appointments: 0, blocked_dates: 0 };

    if (settings && settings.length > 0) {
      const clinicSettings = settings.find(s => s.key === 'clinic');
      if (clinicSettings) {
        await supabase.from('settings').upsert(clinicSettings, { onConflict: 'key' });
      }
    }

    if (clients && clients.length > 0) {
      const { error: cErr } = await supabase.from('clients').upsert(clients, { onConflict: 'id' });
      if (!cErr) restoredStats.clients = clients.length;
    }

    if (appointments && appointments.length > 0) {
      const { error: aErr } = await supabase.from('appointments').upsert(appointments, { onConflict: 'id' });
      if (!aErr) restoredStats.appointments = appointments.length;
    }

    if (blocked_dates && blocked_dates.length > 0) {
      const { error: bErr } = await supabase.from('blocked_dates').upsert(blocked_dates, { onConflict: 'id' });
      if (!bErr) restoredStats.blocked_dates = blocked_dates.length;
    }

    await addAudit('RESTORE', `Restored backup payload. Appts: ${restoredStats.appointments}`, req.user?.email);

    res.json({ data: restoredStats, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
}

// ── DELETE /api/backup/purge ────────────────────────────────────────────────
export async function purgeBackup(req, res) {
  const { months } = req.query;
  const m = parseInt(months, 10);
  if (!m || isNaN(m)) return res.status(400).json({ error: 'Invalid months parameter' });

  try {
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - m);
    const isoString = threshold.toISOString().split('T')[0];

    // Delete appointments older than the threshold
    const { count: countAppt, error: errAppt } = await supabase
      .from('appointments')
      .delete({ count: 'exact' })
      .lt('date', isoString);

    if (errAppt) throw errAppt;

    // Delete audit_logs older than threshold
    const { count: countAudit, error: errAudit } = await supabase
      .from('audit_log')
      .delete({ count: 'exact' })
      .lt('created_at', threshold.toISOString());

    if (errAudit) throw errAudit;

    await addAudit('PURGE', `Purged ${countAppt || 0} appointments and ${countAudit || 0} logs older than ${m} months`, req.user?.email);

    res.json({ data: { appointmentsDeleted: countAppt || 0, logsDeleted: countAudit || 0 }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: err.message });
  }
}
