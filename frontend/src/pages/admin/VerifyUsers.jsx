import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';

function Verify() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users/pending');
      // Filter for truly pending users (is_verified = false)
      const pendingUsers = response.data.filter(user => 
        !user.is_verified && !user.is_admin
      );
      setPendingUsers(pendingUsers);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      
      // Handle specific error cases
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('You need to be logged in as an admin to access this page. Please login with admin credentials.');
      } else if (err.response?.status === 500) {
        setError('Server error occurred. Please check if the backend is running and properly configured.');
      } else {
        setError('Failed to fetch pending users. Please try again.');
      }
      
      setLoading(false);
    }
  };

  const handleVerification = async (userId, action) => {
    try {
      await axiosInstance.patch(`/admin/users/${userId}/verify`, { action });
      setSuccess(`User ${action}d successfully`);
      fetchPendingUsers(); // Refresh the list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error verifying user:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Admin access required for this action.');
      } else {
        setError(`Failed to ${action} user`);
      }
      
      setTimeout(() => setError(''), 3000);
    }
  };

  const openImageModal = (imageUrl, imageType) => {
    setSelectedImage({ url: imageUrl, type: imageType });
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageModalOpen(false);
  };

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeImageModal();
      }
    };

    if (imageModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [imageModalOpen]);

  if (loading) return <div className="admin-loading">Loading pending users...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">User Verification</h1>
        <p className="page-subtitle">Review and approve user registrations for platform access</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-overview grid grid-3 gap-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div className="card animate-scale-in">
          <div className="card-body text-center">
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>⏳</div>
            <h3 className="text-lg font-semibold">Pending</h3>
            <p className="text-2xl font-bold text-warning">{pendingUsers.length}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body text-center">
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>👥</div>
            <h3 className="text-lg font-semibold">Total Users</h3>
            <p className="text-2xl font-bold text-info">{pendingUsers.length}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-body text-center">
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>🔍</div>
            <h3 className="text-lg font-semibold">Review Status</h3>
            <p className="text-sm font-medium text-primary">Active</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
          {error.includes('logged in as an admin') && (
            <div style={{ marginTop: '10px' }}>
              <small>
                Admin credentials: email: admin@errandsexpress.com, password: admin123456
              </small>
            </div>
          )}
        </div>
      )}
      
      {success && <div className="admin-success">{success}</div>}

      {/* Users Section */}
      <div className="users-section">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 className="text-2xl font-bold">Pending Verifications</h2>
          <span className="status-badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}>
            🛡️ Admin Panel
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h3 className="empty-state-title">No pending verifications</h3>
                <p className="empty-state-description">All users have been processed. New registration requests will appear here.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-auto gap-lg">
            {pendingUsers.map((user, index) => (
                             <div key={user.id} className="card animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="card-title">{user.firstname} {user.lastname}</h3>
                    <span className="status-badge status-pending">⏳ Pending Verification</span>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="grid grid-2 gap-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="user-info-section">
                      <div className="flex items-center gap-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--bg-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-sm)'
                        }}>📧</div>
                        <div>
                          <p className="text-sm text-secondary">Email</p>
                          <p className="font-medium">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-md">
                        <div style={{ 
                          width: '32px', 
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--bg-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-sm)'
                        }}>🆔</div>
                        <div>
                          <p className="text-sm text-secondary">School ID</p>
                          <p className="font-medium">{user.school_id_no || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-info-section">
                      <div className="flex items-center gap-md" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--bg-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-sm)'
                        }}>🎂</div>
                        <div>
                          <p className="text-sm text-secondary">Birthday</p>
                          <p className="font-medium">{new Date(user.birthdate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-md">
                        <div style={{ 
                          width: '32px', 
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--bg-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-sm)'
                        }}>📅</div>
                        <div>
                          <p className="text-sm text-secondary">Registered</p>
                          <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="user-photos">
                    {user.verification_image && user.verification_image !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' && (
                      <div className="user-photo-container">
                        <h4>ID Picture</h4>
                        <div className="user-image clickable" onClick={() => openImageModal(user.verification_image, 'ID Picture')}>
                          <img src={user.verification_image} alt="ID Document" />
                          <div className="image-overlay">
                            <span className="zoom-icon">🔍 Click to enlarge</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {user.profile_picture && user.profile_picture !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' && (
                      <div className="user-photo-container">
                        <h4>Profile Picture</h4>
                        <div className="user-image clickable" onClick={() => openImageModal(user.profile_picture, 'Profile Picture')}>
                          <img src={user.profile_picture} alt="Profile Picture" />
                          <div className="image-overlay">
                            <span className="zoom-icon">🔍 Click to enlarge</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(!user.verification_image || user.verification_image === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') && 
                     (!user.profile_picture || user.profile_picture === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') && (
                      <div className="no-photos">
                        <p>No verification photos uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className="flex gap-sm justify-center">
                    <button 
                      className="btn btn-success"
                      onClick={() => handleVerification(user.id, 'approve')}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleVerification(user.id, 'reject')}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {imageModalOpen && selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>{selectedImage.type}</h3>
              <button className="image-modal-close" onClick={closeImageModal}>
                ✕
              </button>
            </div>
            <div className="image-modal-content">
              <img src={selectedImage.url} alt={selectedImage.type} />
            </div>
            <div className="image-modal-footer">
              <p>Click outside or press Escape to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Verify;
