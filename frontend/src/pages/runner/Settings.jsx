import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import './Settings.css';

function RunnerSettings() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gcashSettings, setGcashSettings] = useState({
    gcash_number: '',
    gcash_name: ''
  });
  const [gcashLoading, setGcashLoading] = useState(false);
  const [gcashMessage, setGcashMessage] = useState('');

  useEffect(() => {
    fetchUserData();
    // Debug authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Auth Debug - Token exists:', !!token);
    console.log('Auth Debug - User exists:', !!user);
    if (token) {
      console.log('Auth Debug - Token preview:', token.substring(0, 50) + '...');
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your profile');
        setLoading(false);
        return;
      }

      console.log('Fetching user data with token...');
      const response = await axiosInstance.get('/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Dashboard response:', response.data);
      const user = response.data.user;
      setUserData(user);
      setGcashSettings({
        gcash_number: user.gcash_number || '',
        gcash_name: user.gcash_name || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user data:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError('Failed to load profile data');
      }
      setLoading(false);
    }
  };

  const isProfileComplete = () => {
    return userData?.school_id_no && 
           userData?.verification_image && 
           userData?.firstname && 
           userData?.lastname &&
           userData?.verification_image !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  };

  const getInitials = () => {
    if (!userData) return 'UN';
    const firstName = userData.firstname || '';
    const lastName = userData.lastname || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getUserHandle = () => {
    if (!userData) return '@user';
    const firstName = userData.firstname || 'user';
    return `@${firstName.toLowerCase()}`;
  };

  const formatBirthdate = (birthdate) => {
    if (!birthdate) return 'Not provided';
    const date = new Date(birthdate);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleGcashChange = (e) => {
    const { name, value } = e.target;
    setGcashSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGcashSubmit = async (e) => {
    e.preventDefault();
    setGcashLoading(true);
    setGcashMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.put('/profile', gcashSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update user data with new GCash settings
      setUserData(prev => ({
        ...prev,
        gcash_number: gcashSettings.gcash_number,
        gcash_name: gcashSettings.gcash_name
      }));

      // Update localStorage
      const updatedUser = { ...userData, ...gcashSettings };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setGcashMessage('GCash settings updated successfully!');
      setTimeout(() => setGcashMessage(''), 3000);
    } catch (err) {
      console.error('Error updating GCash settings:', err);
      setGcashMessage('Failed to update GCash settings. Please try again.');
      setTimeout(() => setGcashMessage(''), 5000);
    } finally {
      setGcashLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Unable to Load Profile</h3>
          <p className="empty-state-description">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container runner-layout animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information and settings</p>
      </div>

      {/* Profile Header */}
      <div className="card profile-hero-card" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div className="card-body">
          <div className="flex items-center gap-xl">
            <div className="profile-avatar-container" style={{ position: 'relative' }}>
              {userData?.profile_picture ? (
                <img 
                  src={userData.profile_picture} 
                  alt="Profile" 
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid var(--border-medium)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
              ) : (
                <div 
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-3xl)',
                    fontWeight: 'bold',
                    color: 'white',
                    border: '4px solid var(--border-medium)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {getInitials()}
                </div>
              )}
              {userData?.is_verified && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '32px',
                    height: '32px',
                    background: 'var(--success)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'bold',
                    border: '3px solid white',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  ✓
                </div>
              )}
            </div>
            
            <div className="profile-info-section flex-1">
              <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--spacing-sm)' }}>
                {userData?.firstname && userData?.lastname ? 
                  `${userData.firstname} ${userData.lastname}` : 
                  'User Name'
                }
              </h1>
              <p className="text-lg text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>{getUserHandle()}</p>
              <div className="flex gap-sm" style={{ marginBottom: 'var(--spacing-md)' }}>
                {userData?.is_verified ? (
                  <span className="status-badge status-verified">✓ Verified Student</span>
                ) : (
                  <span className="status-badge status-pending">⏳ Pending Verification</span>
                )}
                <span className="status-badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}>
                  🏃‍♂️ Runner
                </span>
              </div>
              
              {/* Balance Display */}
              <div className="balance-container" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-md)',
                background: 'var(--gradient-warning)',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer'
              }}
              onClick={() => window.location.href = '/runner/balance'}>
                <div style={{ fontSize: 'var(--text-2xl)' }}>💰</div>
                <div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>
                    ₱{userData?.balance || '0.00'}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', opacity: 0.9 }}>
                    Errands Balance
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-2 gap-xl">
        {/* Personal Information */}
        <div className="card animate-scale-in">
          <div className="card-header">
            <h2 className="card-title">👤 Personal Information</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-lg">
              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>📧</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Email Address</h4>
                  <p className="text-secondary">{userData?.email || 'No email provided'}</p>
                </div>
              </div>

              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>🎂</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Birthday</h4>
                  <p className="text-secondary">{formatBirthdate(userData?.birthdate)}</p>
                </div>
              </div>

              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>👤</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Gender</h4>
                  <p className="text-secondary">{userData?.gender || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <h2 className="card-title">🎓 Academic Information</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-lg">
              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>🆔</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Student ID</h4>
                  <p className="text-secondary">{userData?.school_id_no && userData.school_id_no !== 'TBU' ? 
                    userData.school_id_no : 'Not provided'}</p>
                </div>
              </div>

              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>📅</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Member Since</h4>
                  <p className="text-secondary">{userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Unknown'}</p>
                </div>
              </div>

              <div className="info-item flex items-center gap-md">
                <div className="info-icon" style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  background: userData?.is_verified ? 'var(--success-light)' : 'var(--warning-light)',
                  color: userData?.is_verified ? 'var(--success)' : 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--text-lg)'
                }}>{userData?.is_verified ? '✅' : '⏳'}</div>
                <div className="info-content flex-1">
                  <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>Verification Status</h4>
                  <p className="text-secondary">{userData?.is_verified ? 'Verified Student' : 'Pending Verification'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GCash Settings */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h2 className="card-title">📱 GCash Payment Settings</h2>
        </div>
        <div className="card-body">
          <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
            Set up your GCash information so customers can send you payments for completed errands.
          </p>
          
          <form onSubmit={handleGcashSubmit}>
            <div className="grid grid-2 gap-lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div className="form-group">
                <label className="form-label">GCash Number</label>
                <input
                  type="text"
                  name="gcash_number"
                  value={gcashSettings.gcash_number}
                  onChange={handleGcashChange}
                  placeholder="09XXXXXXXXX"
                  className="form-input"
                  maxLength="11"
                />
                <small className="form-help">Enter your 11-digit GCash mobile number</small>
              </div>
              
              <div className="form-group">
                <label className="form-label">GCash Account Name</label>
                <input
                  type="text"
                  name="gcash_name"
                  value={gcashSettings.gcash_name}
                  onChange={handleGcashChange}
                  placeholder="Juan Dela Cruz"
                  className="form-input"
                />
                <small className="form-help">Enter the name registered to your GCash account</small>
              </div>
            </div>
            
            {/* GCash Preview */}
            <div className="gcash-preview" style={{
              padding: 'var(--spacing-lg)',
              background: 'var(--bg-muted)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Preview</h4>
              <div className="gcash-info-preview">
                <div className="gcash-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span>GCash Number:</span>
                  <span className="font-semibold">{gcashSettings.gcash_number || 'Not set'}</span>
                </div>
                <div className="gcash-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Account Name:</span>
                  <span className="font-semibold">{gcashSettings.gcash_name || 'Not set'}</span>
                </div>
              </div>
            </div>
            
            {gcashMessage && (
              <div className={`alert ${gcashMessage.includes('success') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 'var(--spacing-lg)' }}>
                {gcashMessage}
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={gcashLoading}
            >
              {gcashLoading ? 'Saving...' : 'Save GCash Settings'}
            </button>
          </form>
        </div>
      </div>

      {/* Profile Completion Status */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h2 className="card-title">📊 Profile Completion</h2>
        </div>
        <div className="card-body">
          <div className="profile-completion">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
              <span className="font-semibold">Profile Completion</span>
              <span className="font-bold">{isProfileComplete() ? '100%' : '75%'}</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: isProfileComplete() ? '100%' : '75%', 
                height: '100%', 
                background: 'var(--gradient-primary)',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            {!isProfileComplete() && (
              <div className="completion-tips" style={{ marginTop: 'var(--spacing-md)' }}>
                <p className="text-sm text-secondary">Complete your profile by:</p>
                <ul style={{ marginTop: 'var(--spacing-sm)', paddingLeft: 'var(--spacing-lg)' }}>
                  {!userData?.school_id_no && <li className="text-sm text-secondary">Adding your student ID</li>}
                  {!userData?.verification_image && <li className="text-sm text-secondary">Uploading verification documents</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunnerSettings; 