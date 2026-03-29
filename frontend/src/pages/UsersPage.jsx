import { useEffect, useState } from 'react';
import { usersApi } from '../services/apiServices.js';
import { showToast } from '../ui/toastService.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      showToast('Failed to load users: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(id, newRole) {
    try {
      await usersApi.updateRole(id, newRole);
      showToast('Role updated successfully', 'success');
      loadUsers();
    } catch (err) {
      showToast('Error updating role: ' + err.message, 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you certain you want to delete this user? This cannot be undone.')) return;
    try {
      await usersApi.delete(id);
      showToast('User deleted', 'success');
      loadUsers();
    } catch (err) {
      showToast('Error deleting user: ' + err.message, 'error');
    }
  }

  return (
    <div className="view active" id="view-users" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2>User Management</h2>
          <p style={{ color: 'var(--text-m)' }}>Manage access levels and roles for your staff.</p>
        </div>
        <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>
          <i className={`fa fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
        </button>
      </div>

      <div className="list-card">
        {users.map(u => (
          <div key={u.id} className="list-item" style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 16 }}>{u.full_name || 'No Name Provided'}</strong>
              <div style={{ color: 'var(--text-m)', fontSize: 14 }}>{u.email}</div>
            </div>
            
            <div style={{ marginRight: 24 }}>
              <select 
                className="form-input" 
                value={u.role} 
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                style={{ width: 150, padding: '8px 12px', height: 'auto' }}
              >
                <option value="user">Staff (Read-Only)</option>
                <option value="admin">Administrator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            
            <button 
              className="icon-btn" 
              style={{ color: 'var(--danger)', background: 'var(--danger-light)' }} 
              onClick={() => handleDelete(u.id)}
              title="Delete User"
            >
              <i className="fa fa-trash"></i>
            </button>
          </div>
        ))}

        {users.length === 0 && !loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-m)' }}>
            <p>No users found...</p>
          </div>
        )}
      </div>
    </div>
  );
}
