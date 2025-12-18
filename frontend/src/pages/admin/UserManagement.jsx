import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // all, verified, unverified

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
    }
  };

  const toggleVerification = async (userId, currentStatus) => {
    try {
      await axiosInstance.patch(`/admin/users/${userId}/toggle-verification`);
      setSuccess(`User verification ${currentStatus ? 'revoked' : 'granted'} successfully`);
      fetchUsers(); // Refresh the list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update user verification');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers(); // Refresh the list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'verified') return user.is_verified;
    if (filter === 'unverified') return !user.is_verified;
    return true; // all
  });

  if (loading) return <div className="admin-loading">Loading users...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Users Management</h1>
        <p className="page-subtitle">Manage all registered users</p>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      <div className="flex gap-md" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button 
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          All Users ({users.length})
        </button>
        <button 
          className={filter === 'verified' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('verified')}
        >
          Verified ({users.filter(u => u.is_verified).length})
        </button>
        <button 
          className={filter === 'unverified' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('unverified')}
        >
          Unverified ({users.filter(u => !u.is_verified).length})
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>School ID</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-name">
                      <strong>{user.firstname} {user.lastname}</strong>
                      {user.is_admin && <span className="admin-badge">ADMIN</span>}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.school_id_no || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${user.is_verified ? 'verified' : 'unverified'}`}>
                      {user.is_verified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {!user.is_admin && (
                        <>
                          <button 
                            className={`btn-toggle ${user.is_verified ? 'revoke' : 'verify'}`}
                            onClick={() => toggleVerification(user.id, user.is_verified)}
                          >
                            {user.is_verified ? '🚫 Revoke' : '✅ Verify'}
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => deleteUser(user.id)}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Users;
