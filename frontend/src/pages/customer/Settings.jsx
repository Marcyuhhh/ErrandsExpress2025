import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile data
  const [profile, setProfile] = useState({
    name: '',
    firstname: '',
    lastname: '',
    middle_initial: '',
    email: '',
    birthdate: '',
    gender: '',
    school_id_no: '',
    profile_picture: '',
    gcash_number: '',
    gcash_name: ''
  });

  // Password change data
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/dashboard');
      setProfile(response.data.user);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    }
  };

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await axiosInstance.put('/profile', profile);
      setMessage('Profile updated successfully!');
      
      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await axiosInstance.put('/profile', {
        current_password: passwordData.current_password,
        password: passwordData.new_password
      });
      
      setMessage('Password changed successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/auth');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({
          ...profile,
          profile_picture: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page-container customer-layout animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-sm justify-center" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <button
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`btn ${activeTab === 'gcash' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('gcash')}
        >
          📱 GCash Settings
        </button>
        <button
          className={`btn ${activeTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('password')}
        >
          🔒 Password
        </button>
      </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="settings-content">
          {activeTab === 'profile' && (
            <form className="settings-form" onSubmit={updateProfile}>
              <h3>Profile Information</h3>
              
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {profile.profile_picture ? (
                    <img src={profile.profile_picture} alt="Profile" />
                  ) : (
                    <div className="no-picture">
                      {profile.firstname ? profile.firstname.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="file-upload-btn">
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstname"
                    value={profile.firstname || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastname"
                    value={profile.lastname || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Middle Initial</label>
                  <input
                    type="text"
                    name="middle_initial"
                    value={profile.middle_initial || ''}
                    onChange={handleProfileChange}
                    maxLength="5"
                  />
                </div>
                <div className="form-group">
                  <label>School ID</label>
                  <input
                    type="text"
                    name="school_id_no"
                    value={profile.school_id_no || ''}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email || ''}
                  onChange={handleProfileChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Birth Date</label>
                <input
                  type="date"
                  name="birthdate"
                  value={profile.birthdate ? profile.birthdate.split('T')[0] : ''}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={profile.gender || ''}
                  onChange={handleProfileChange}
                >
                  <option value="">Select Gender (Optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form className="settings-form" onSubmit={changePassword}>
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  minLength="8"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  minLength="8"
                  required
                />
              </div>

              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}

          {activeTab === 'gcash' && (
            <form className="settings-form" onSubmit={updateProfile}>
              <h3>GCash Payment Settings</h3>
              <p className="form-description">
                Set up your GCash information for faster payment processing. This will be used to automatically fill payment details during transactions.
              </p>
              
              <div className="form-group">
                <label>GCash Number</label>
                <input
                  type="text"
                  name="gcash_number"
                  value={profile.gcash_number || ''}
                  onChange={handleProfileChange}
                  placeholder="09123456789"
                  maxLength="11"
                />
                <small className="form-help">Enter your 11-digit GCash mobile number</small>
              </div>

              <div className="form-group">
                <label>GCash Account Name</label>
                <input
                  type="text"
                  name="gcash_name"
                  value={profile.gcash_name || ''}
                  onChange={handleProfileChange}
                  placeholder="Juan Dela Cruz"
                  maxLength="100"
                />
                <small className="form-help">Enter the name registered to your GCash account</small>
              </div>

              <div className="gcash-preview">
                <h4>Preview</h4>
                <div className="gcash-info-preview">
                  <div className="gcash-item">
                    <span>GCash Number:</span>
                    <span>{profile.gcash_number || 'Not set'}</span>
                  </div>
                  <div className="gcash-item">
                    <span>Account Name:</span>
                    <span>{profile.gcash_name || 'Not set'}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save GCash Settings'}
              </button>
            </form>
          )}

          {activeTab === 'account' && (
            <div className="settings-form">
              <h3>Account Settings</h3>
              
              <div className="account-info">
                <div className="info-item">
                  <h4>Account Status</h4>
                  <p className={profile.is_verified ? 'verified' : 'unverified'}>
                    {profile.is_verified ? '✅ Verified' : '⚠️ Pending Verification'}
                  </p>
                </div>

                <div className="info-item">
                  <h4>Member Since</h4>
                  <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>

                <div className="info-item">
                  <h4>Account Type</h4>
                  <p>{profile.is_admin ? 'Administrator' : 'Regular User'}</p>
                </div>
              </div>

              <div className="danger-zone">
                <h4>Danger Zone</h4>
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-sidebar">
          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'gcash' ? 'active' : ''}`}
              onClick={() => setActiveTab('gcash')}
            >
              📱 GCash Settings
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              🔒 Password
            </button>
          </nav>
        </div>
      </div>
    );
  }

export default Settings;
