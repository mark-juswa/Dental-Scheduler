import supabase from '../lib/supabase.js';

function toApiShape(row) {
  // Reconstruct icon/color on the server so frontend stays stateless
  const icons = {
    CREATE: 'fa-plus-circle',
    UPDATE: 'fa-edit',
    DELETE: 'fa-trash',
    MOVE:   'fa-arrows-alt',
    RESIZE: 'fa-expand-alt',
    CANCEL: 'fa-ban',
  };
  const colors = {
    CREATE: '#059669',
    UPDATE: '#2563eb',
    DELETE: '#dc2626',
    MOVE:   '#d97706',
    RESIZE: '#0891b2',
    CANCEL: '#64748b',
  };
  const bgs = {
    CREATE: '#d1fae5',
    UPDATE: '#dbeafe',
    DELETE: '#fee2e2',
    MOVE:   '#fef3c7',
    RESIZE: '#cffafe',
    CANCEL: '#f1f5f9',
  };

  return {
    id:        row.id,
    action:    row.action,
    detail:    row.detail,
    userEmail: row.user_email,
    icon:      icons[row.action]  ?? 'fa-info-circle',
    color:     colors[row.action] ?? '#64748b',
    bg:        bgs[row.action]    ?? '#f1f5f9',
    timestamp: new Date(row.created_at).getTime(),
  };
}

// ── GET /api/audit ─────────────────────────────────────────────────────────
// Returns last 200 entries, newest first
export async function getAuditLog(req, res) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ data: null, error: error.message });
  res.json({ data: data.map(toApiShape), error: null });
}

// ── DELETE /api/audit ──────────────────────────────────────────────────────
export async function clearAuditLog(req, res) {
  const { error } = await supabase
    .from('audit_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (error) return res.status(500).json({ data: null, error: error.message });

  // Log the clearing action itself
  await supabase.from('audit_log').insert({
    action:     'DELETE',
    detail:     'Audit log cleared',
    user_email: req.user?.email ?? 'system',
  });

  res.json({ data: { cleared: true }, error: null });
}