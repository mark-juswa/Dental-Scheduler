import supabase from '../lib/supabase.js';

const SETTINGS_KEY = 'clinic';

const DEFAULT_SETTINGS = {
  workStart:       8,
  workEnd:         20,
  darkMode:        false,
  conflictDetect:  true,
  showWeekends:    true,
  showCancelled:   true,
  dr1Name:         'Dr. A',
  dr2Name:         'Dr. B',
  zoomLevel:       1.0,
};

// ── GET /api/settings ──────────────────────────────────────────────────────
export async function getSettings(req, res) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  if (error) {
    // Row doesn't exist yet — return defaults
    return res.json({ data: DEFAULT_SETTINGS, error: null });
  }

  // Merge with defaults so new fields are always present
  res.json({ data: { ...DEFAULT_SETTINGS, ...data.value }, error: null });
}

// ── PUT /api/settings ──────────────────────────────────────────────────────
export async function saveSettings(req, res) {
  const incoming = req.body;

  // Validate work hours
  if (incoming.workEnd !== undefined && incoming.workEnd > 24) {
    incoming.workEnd = 24;
  }
  if (incoming.workStart !== undefined && incoming.workStart < 0) {
    incoming.workStart = 0;
  }

  // Fetch current settings to merge (don't overwrite keys not sent)
  const { data: existing } = await supabase
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  const merged = {
    ...(DEFAULT_SETTINGS),
    ...(existing?.value ?? {}),
    ...incoming,
  };

  // Upsert — insert if not exists, update if exists
  const { data, error } = await supabase
    .from('settings')
    .upsert(
      { key: SETTINGS_KEY, value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    .select('value')
    .single();

  if (error) return res.status(500).json({ data: null, error: error.message });

  res.json({ data: data.value, error: null });
}