import supabase from '../lib/supabase.js';

// GET all users
export async function getUsers(req, res, next) {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    const cleanUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      role: u.user_metadata?.role || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at
    }));
    
    res.json({ data: cleanUsers, error: null });
  } catch (err) {
    next(err);
  }
}

// PUT modify user role
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ data: null, error: 'Invalid role' });
    }

    const { data: { user }, error: fetchError } = await supabase.auth.admin.getUserById(id);
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { ...user.user_metadata, role }
    });
    
    if (error) throw error;
    res.json({ data: { message: 'Role updated successfully' }, error: null });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
       return res.status(400).json({ data: null, error: 'Cannot delete yourself' });
    }
    const { data, error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.json({ data: { message: 'User deleted successfully' }, error: null });
  } catch (err) {
    next(err);
  }
}
