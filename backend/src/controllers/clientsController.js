import supabase from '../lib/supabase.js';

async function addAudit(action, detail, userEmail = 'system') {
  await supabase.from('audit_log').insert({ action, detail, user_email: userEmail });
}

function toDbRow(body) {
  return {
    first_name:     body.firstName,
    last_name:      body.lastName,
    address:        body.address,
    contact_number: body.contactNumber,
    facebook_url:   body.facebookUrl ?? null,
    notes:          body.notes       ?? null,
  };
}

function toApiShape(row) {
  if (!row) return null;
  return {
    id:            row.id,
    firstName:     row.first_name,
    lastName:      row.last_name,
    address:       row.address,
    contactNumber: row.contact_number,
    facebookUrl:   row.facebook_url ?? '',
    notes:         row.notes        ?? '',
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

// ── GET /api/clients ───────────────────────────────────────────────────────
export async function getClients(req, res) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) return res.status(500).json({ data: null, error: error.message });
  res.json({ data: data.map(toApiShape), error: null });
}

// ── GET /api/clients/:id ───────────────────────────────────────────────────
// Returns client + their full appointment history
export async function getClient(req, res) {
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (clientErr) return res.status(404).json({ data: null, error: 'Client not found' });

  // Fetch their appointment history
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', req.params.id)
    .order('date', { ascending: false });

  res.json({
    data: {
      ...toApiShape(client),
      appointments: (appointments || []).map(a => ({
        id:        a.id,
        date:      a.date,
        startTime: a.start_time,
        endTime:   a.end_time,
        procedure: a.procedure,
        doctor:    a.doctor,
        status:    a.status,
        notes:     a.notes,
      })),
    },
    error: null,
  });
}

// ── POST /api/clients ──────────────────────────────────────────────────────
export async function createClient(req, res) {
  const body = req.body;

  if (!body.firstName || !body.lastName || !body.contactNumber) {
    return res.status(400).json({ data: null, error: 'Missing required fields: firstName, lastName, contactNumber' });
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(toDbRow(body))
    .select()
    .single();

  if (error) return res.status(500).json({ data: null, error: error.message });

  await addAudit('CREATE', `Client added: ${data.first_name} ${data.last_name}`, req.user?.email);
  res.status(201).json({ data: toApiShape(data), error: null });
}

// ── PUT /api/clients/:id ───────────────────────────────────────────────────
export async function updateClient(req, res) {
  const body = req.body;
  const updates = {};

  if (body.firstName     !== undefined) updates.first_name     = body.firstName;
  if (body.lastName      !== undefined) updates.last_name      = body.lastName;
  if (body.address       !== undefined) updates.address        = body.address;
  if (body.contactNumber !== undefined) updates.contact_number = body.contactNumber;
  if (body.facebookUrl   !== undefined) updates.facebook_url   = body.facebookUrl;
  if (body.notes         !== undefined) updates.notes          = body.notes;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ data: null, error: error.message });

  await addAudit('UPDATE', `Client updated: ${data.first_name} ${data.last_name}`, req.user?.email);
  res.json({ data: toApiShape(data), error: null });
}

// ── DELETE /api/clients/:id ────────────────────────────────────────────────
export async function deleteClient(req, res) {
  const { data: existing } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', req.params.id)
    .single();

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ data: null, error: error.message });

  if (existing) {
    await addAudit('DELETE', `Client deleted: ${existing.first_name} ${existing.last_name}`, req.user?.email);
  }

  res.json({ data: { id: req.params.id }, error: null });
}