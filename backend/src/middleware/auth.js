import supabase from '../lib/supabase.js';

// Validates the Supabase JWT sent by the frontend as:
// Authorization: Bearer <access_token>
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Use Supabase admin client to verify the user's JWT
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ data: null, error: 'Invalid or expired token' });
  }

  // Attach user to request for downstream use (e.g. audit log)
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  const role = req.user?.user_metadata?.role || 'user';
  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({ data: null, error: 'Forbidden: Requires admin privileges' });
  }
  next();
}

export function requireSuperAdmin(req, res, next) {
  const role = req.user?.user_metadata?.role || 'user';
  if (role !== 'super_admin') {
    return res.status(403).json({ data: null, error: 'Forbidden: Requires super admin privileges' });
  }
  next();
}