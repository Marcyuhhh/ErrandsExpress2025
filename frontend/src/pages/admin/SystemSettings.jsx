import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import './admin.css';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [gcashSettings, setGcashSettings] = useState({
    gcash_number: '',
    gcash_account_name: ''
  });

  useEffect(() => {
    fetchGCashSettings();
  }, []);

  const fetchGCashSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/system/gcash-info');
      setGcashSettings({
        gcash_number: response.data.gcash_info.number,
        gcash_account_name: response.data.gcash_info.account_name
      });
      setError('');
    } catch (err) {
      console.error('Error fetching GCash settings:', err);
      setError('Failed to load GCash settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGcashSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gcashSettings.gcash_number.trim() || !gcashSettings.gcash_account_name.trim()) {
      setError('Both GCash number and account name are required');
      return;
    }

    if (!/^09\d{9}$/.test(gcashSettings.gcash_number)) {
      setError('Please enter a valid GCash number (format: 09XXXXXXXXX)');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await axiosInstance.put('/admin/system/gcash-settings', gcashSettings);
      setMessage('GCash settings updated successfully!');
      setError('');
      
      // Update local state with response data
      setGcashSettings({
        gcash_number: response.data.gcash_info.number,
        gcash_account_name: response.data.gcash_info.account_name
      });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating GCash settings:', err);
      setError(err.response?.data?.error || 'Failed to update GCash settings');
      setMessage('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1>⚙️ System Settings</h1>
          <p>Configure system-wide settings and payment information</p>
        </div>
        <div className="admin-loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ System Settings</h1>
        <p>Configure system-wide settings and payment information</p>
      </div>

      <div className="admin-content">
        <div style={{ padding: '30px' }}>
          {/* Success Message */}
          {message && (
            <div className="admin-success">
              <strong>✅ Success:</strong> {message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="admin-error">
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {/* GCash Settings Section */}
          <div className="settings-section">
            <h2 style={{ 
              marginBottom: '20px', 
              color: 'var(--text-primary)', 
              borderBottom: '2px solid var(--border-light)', 
              paddingBottom: '10px' 
            }}>
              📱 GCash Payment Settings
            </h2>
            
            <div style={{ 
              background: 'var(--bg-muted)', 
              padding: '20px', 
              borderRadius: '8px', 
              marginBottom: '30px',
              border: '1px solid var(--border-light)'
            }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
                <strong>ℹ️ Important:</strong> These are the GCash payment details that runners will see when paying their balance.
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Make sure to enter your actual business GCash account information.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label htmlFor="gcash_number" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)' 
                  }}>
                    📱 GCash Number *
                  </label>
                  <input
                    type="text"
                    id="gcash_number"
                    name="gcash_number"
                    value={gcashSettings.gcash_number}
                    onChange={handleInputChange}
                    placeholder="09123456789"
                    maxLength="11"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Format: 09XXXXXXXXX (11 digits)
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="gcash_account_name" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)' 
                  }}>
                    👤 Account Name *
                  </label>
                  <input
                    type="text"
                    id="gcash_account_name"
                    name="gcash_account_name"
                    value={gcashSettings.gcash_account_name}
                    onChange={handleInputChange}
                    placeholder="Your Business Name"
                    maxLength="100"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid var(--border-light)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    This will be displayed to runners as the recipient name
                  </small>
                </div>
              </div>

              {/* Current Settings Preview */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '30px',
                border: '1px solid var(--border-light)'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>
                  📋 Current Settings Preview
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>GCash Number:</strong>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                      {gcashSettings.gcash_number || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Account Name:</strong>
                    <div style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                      {gcashSettings.gcash_account_name || 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={fetchGCashSettings}
                  disabled={saving}
                  style={{
                    background: 'var(--secondary)',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🔄 Reset
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? 'var(--secondary)' : 'var(--success)',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Information Section */}
          <div style={{ 
            marginTop: '40px', 
            padding: '20px', 
            background: 'var(--info-light)', 
            border: '1px solid var(--info)', 
            borderRadius: '8px',
            borderLeft: '4px solid var(--info)'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: 'var(--info-dark)' }}>
              📝 How This Works
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--info-dark)' }}>
              <li>Runners will see these details when they need to pay their balance</li>
              <li>They will send payments to the GCash number you specify above</li>
              <li>Changes take effect immediately across the entire system</li>
              <li>Make sure the account can receive payments from multiple users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings; 