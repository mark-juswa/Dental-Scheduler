import supabase from '../lib/supabase.js';

// ── Helpers ────────────────────────────────────────────────────────────────

async function addAudit(action, detail, userEmail = 'system') {
  await supabase.from('audit_log').insert({ action, detail, user_email: userEmail });
}

// camelCase → snake_case for DB insert/update
function toDbRow(body) {
  return {
    first_name:     body.firstName,
    last_name:      body.lastName,
    address:        body.address,
    contact_number: body.contactNumber,
    facebook_url:   body.facebookUrl   ?? null,
    date:           body.date,
    start_time:     body.startTime,
    end_time:       body.endTime,
    procedure:      body.procedure,
    doctor:         body.doctor        ?? 'dr1',
    status:         body.status        ?? 'pending',
    notes:          body.notes         ?? null,
    client_id:      body.clientId      ?? null,
  };
}

// snake_case → camelCase for API response
function toApiShape(row) {
  if (!row) return null;
  return {
    id:            row.id,
    firstName:     row.first_name,
    lastName:      row.last_name,
    address:       row.address,
    contactNumber: row.contact_number,
    facebookUrl:   row.facebook_url   ?? '',
    date:          row.date,
    startTime:     row.start_time,
    endTime:       row.end_time,
    procedure:     row.procedure,
    doctor:        row.doctor,
    status:        row.status,
    notes:         row.notes          ?? '',
    clientId:      row.client_id      ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

// ── GET /api/appointments ──────────────────────────────────────────────────
// Optional query params: ?date=YYYY-MM-DD  ?from=  ?to=  ?doctor=  ?status=
export async function getAppointments(req, res) {
  const { date, from, to, doctor, status } = req.query;

  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (date)   query = query.eq('date', date);
  if (from)   query = query.gte('date', from);
  if (to)     query = query.lte('date', to);
  if (doctor) query = query.eq('doctor', doctor);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) return res.status(500).json({ data: null, error: error.message });
  res.json({ data: data.map(toApiShape), error: null });
}

// ── GET /api/appointments/:id ──────────────────────────────────────────────
export async function getAppointment(req, res) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ data: null, error: 'Appointment not found' });
  res.json({ data: toApiShape(data), error: null });
}

// ── POST /api/appointments ─────────────────────────────────────────────────
export async function createAppointment(req, res) {
  const body = req.body;

  // Basic validation
  if (!body.firstName || !body.lastName || !body.date || !body.startTime || !body.endTime || !body.procedure) {
    return res.status(400).json({ data: null, error: 'Missing required fields: firstName, lastName, date, startTime, endTime, procedure' });
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert(toDbRow(body))
    .select()
    .single();

  if (error) return res.status(500).json({ data: null, error: error.message });

  await addAudit('CREATE', `Created: ${data.first_name} ${data.last_name} on ${data.date} ${data.start_time}`, req.user?.email);

  res.status(201).json({ data: toApiShape(data), error: null });
}

// ── PUT /api/appointments/:id ──────────────────────────────────────────────
// Partial update — used for edits, drag/drop, resize, status changes
export async function updateAppointment(req, res) {
  const body = req.body;

  // Build partial update — only include fields that were sent
  const updates = {};
  if (body.firstName     !== undefined) updates.first_name     = body.firstName;
  if (body.lastName      !== undefined) updates.last_name      = body.lastName;
  if (body.address       !== undefined) updates.address        = body.address;
  if (body.contactNumber !== undefined) updates.contact_number = body.contactNumber;
  if (body.facebookUrl   !== undefined) updates.facebook_url   = body.facebookUrl;
  if (body.date          !== undefined) updates.date           = body.date;
  if (body.startTime     !== undefined) updates.start_time     = body.startTime;
  if (body.endTime       !== undefined) updates.end_time       = body.endTime;
  if (body.procedure     !== undefined) updates.procedure      = body.procedure;
  if (body.doctor        !== undefined) updates.doctor         = body.doctor;
  if (body.status        !== undefined) updates.status         = body.status;
  if (body.notes         !== undefined) updates.notes          = body.notes;
  if (body.clientId      !== undefined) updates.client_id      = body.clientId;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ data: null, error: error.message });

  // Determine what kind of update for audit detail
  let auditDetail = `Updated: ${data.first_name} ${data.last_name}`;
  if (body.date || body.startTime) auditDetail = `Moved: ${data.first_name} ${data.last_name} → ${data.date} ${data.start_time}`;
  else if (body.endTime && !body.startTime) auditDetail = `Resized: ${data.first_name} ${data.last_name} → end ${data.end_time}`;
  else if (body.status) auditDetail = `Status: ${data.first_name} ${data.last_name} → ${data.status}`;

  await addAudit('UPDATE', auditDetail, req.user?.email);

  res.json({ data: toApiShape(data), error: null });
}

// ── DELETE /api/appointments/:id ───────────────────────────────────────────
export async function deleteAppointment(req, res) {
  // Fetch first so we can log the name
  const { data: existing } = await supabase
    .from('appointments')
    .select('first_name, last_name')
    .eq('id', req.params.id)
    .single();

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ data: null, error: error.message });

  if (existing) {
    await addAudit('DELETE', `Deleted: ${existing.first_name} ${existing.last_name}`, req.user?.email);
  }

  res.json({ data: { id: req.params.id }, error: null });
}