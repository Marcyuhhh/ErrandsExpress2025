import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import './customer.css';

function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your profile');
        setLoading(false);
        return;
      }

      const response = await axiosInstance.get('/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data.user;
      setUserData(user);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user data:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
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

  if (loading) {
    return (
      <div className="customer-page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-page-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Profile</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page-container profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information and settings</p>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {userData?.profile_picture ? (
            <img src={userData.profile_picture} alt="Profile" />
          ) : (
            <div className="avatar-placeholder">
              {getInitials()}
            </div>
          )}
          {userData?.is_verified && <div className="verified-badge">✓</div>}
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">
            {userData?.firstname && userData?.lastname ? 
              `${userData.firstname} ${userData.lastname}` : 
              'User Name'
            }
          </h1>
          <p className="profile-handle">{getUserHandle()}</p>
          <div className="profile-badges">
            {userData?.is_verified ? (
              <span className="badge verified">✓ Verified Student</span>
            ) : (
              <span className="badge pending">⏳ Pending Verification</span>
            )}
            <span className="badge role">👤 Student</span>
          </div>
          
          {/* Points Display */}
          <div className="points-display">
            <div className="points-icon">⭐</div>
            <div className="points-info">
              <div className="points-count">{userData?.points || 0} Points</div>
              <div className="points-label">Total Earnings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="profile-grid">
        {/* Personal Information */}
        <div className="profile-section">
          <h2 className="section-title">👤 Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">📧</div>
              <div className="info-content">
                <h4>Email Address</h4>
                <p>{userData?.email || 'No email provided'}</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">🎂</div>
              <div className="info-content">
                <h4>Birthday</h4>
                <p>{formatBirthdate(userData?.birthdate)}</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">👤</div>
              <div className="info-content">
                <h4>Gender</h4>
                <p>{userData?.gender || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="profile-section">
          <h2 className="section-title">🎓 Academic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">🆔</div>
              <div className="info-content">
                <h4>Student ID</h4>
                <p>{userData?.school_id_no && userData.school_id_no !== 'TBU' ? 
                  userData.school_id_no : 'Not provided'}</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">📅</div>
              <div className="info-content">
                <h4>Member Since</h4>
                <p>{userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Unknown'}</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon status">
                {userData?.is_verified ? '✅' : '⏳'}
              </div>
              <div className="info-content">
                <h4>Verification Status</h4>
                <p>{userData?.is_verified ? 'Verified Student' : 'Pending Verification'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Status */}
      <div className="profile-section">
        <h2 className="section-title">📊 Profile Completion</h2>
        <div className="completion-section">
          <div className="completion-header">
            <span>Profile Completion</span>
            <span className="completion-percent">{isProfileComplete() ? '100%' : '75%'}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: isProfileComplete() ? '100%' : '75%' }}
            ></div>
          </div>
          {!isProfileComplete() && (
            <div className="completion-tips">
              <p>Complete your profile by:</p>
              <ul>
                {!userData?.school_id_no && <li>Adding your student ID</li>}
                {!userData?.verification_image && <li>Uploading verification documents</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;