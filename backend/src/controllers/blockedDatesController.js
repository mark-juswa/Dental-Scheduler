import supabase from '../lib/supabase.js';

async function addAudit(action, detail, userEmail = 'system') {
  await supabase.from('audit_log').insert({ action, detail, user_email: userEmail });
}

function toApiShape(row) {
  return {
    id:        row.id,
    date:      row.date,
    reason:    row.reason ?? '',
    createdAt: row.created_at,
  };
}

// ── GET /api/blocked-dates ─────────────────────────────────────────────────
export async function getBlockedDates(req, res) {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ data: null, error: error.message });
  res.json({ data: data.map(toApiShape), error: null });
}

// ── POST /api/blocked-dates ────────────────────────────────────────────────
export async function blockDate(req, res) {
  const { date, reason } = req.body;

  if (!date) return res.status(400).json({ data: null, error: 'date is required (YYYY-MM-DD)' });

  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ date, reason: reason ?? null })
    .select()
    .single();

  // Handle unique constraint violation (date already blocked)
  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ data: null, error: `Date ${date} is already blocked` });
    }
    return res.status(500).json({ data: null, error: error.message });
  }

  await addAudit('UPDATE', `Blocked date: ${date}${reason ? ' — ' + reason : ''}`, req.user?.email);
  res.status(201).json({ data: toApiShape(data), error: null });
}

// ── DELETE /api/blocked-dates/:id ─────────────────────────────────────────
export async function unblockDate(req, res) {
  const { data: existing } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('id', req.params.id)
    .single();

  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ data: null, error: error.message });

  if (existing) {
    await addAudit('UPDATE', `Unblocked date: ${existing.date}`, req.user?.email);
  }

  res.json({ data: { id: req.params.id }, error: null });
}