import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import { useNotifications } from '../../contexts/NotificationContext';
import './Notification.css';

function RunnerNotification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { refreshCounts } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications');
      setNotifications(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
      // Refresh counts in the sidebar
      refreshCounts();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.patch('/notifications/read-all');
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      // Refresh counts in the sidebar
      refreshCounts();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'post_catered':
        return '🏃‍♂️';
      case 'post_completed':
        return '✅';
      case 'verification_approved':
        return '🎉';
      case 'verification_rejected':
        return '❌';
      case 'post_removed':
        return '🗑️';
      case 'payment_approved':
        return '💰';
      case 'payment_rejected':
        return '💳';
      case 'payment_verified':
        return '✅';
      default:
        return '📢';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container runner-layout animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">Stay updated with your errands and account activities</p>
      </div>

      {/* Quick Stats */}
      {notifications.length > 0 && (
        <div className="stats-overview grid grid-3 gap-lg" style={{ marginBottom: 'var(--spacing-2xl)' }}>
          <div className="card animate-scale-in">
            <div className="card-body text-center">
              <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>📬</div>
              <h3 className="text-lg font-semibold">Total</h3>
              <p className="text-2xl font-bold text-primary">{notifications.length}</p>
            </div>
          </div>
          <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <div className="card-body text-center">
              <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>🔔</div>
              <h3 className="text-lg font-semibold">Unread</h3>
              <p className="text-2xl font-bold text-warning">{notifications.filter(n => !n.is_read).length}</p>
            </div>
          </div>
          <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="card-body text-center">
              <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--spacing-sm)' }}>✅</div>
              <h3 className="text-lg font-semibold">Read</h3>
              <p className="text-2xl font-bold text-success">{notifications.filter(n => n.is_read).length}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <h3 className="empty-state-title">Unable to Load Notifications</h3>
              <p className="empty-state-description">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <>
          {/* Action Bar */}
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h2 className="text-2xl font-bold">Recent Notifications</h2>
            {notifications.some(n => !n.is_read) && (
              <button className="btn btn-primary" onClick={markAllAsRead}>
                ✅ Mark All as Read
              </button>
            )}
          </div>

          <div className="notifications-container scrollable-content">
            {notifications.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <h3 className="empty-state-title">No notifications yet</h3>
                    <p className="empty-state-description">
                      You'll receive notifications here when there are updates about your errands, 
                      verification status, or other important activities.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-lg">
                {notifications.map((notification, index) => (
                  <div 
                    key={notification.id} 
                    className={`card animate-fade-in ${!notification.is_read ? 'unread-notification' : ''}`}
                    style={{ 
                      animationDelay: `${index * 0.1}s`,
                      cursor: !notification.is_read ? 'pointer' : 'default'
                    }}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="card-body">
                      <div className="flex items-start gap-md">
                        <div 
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: !notification.is_read ? 'var(--warning-light)' : 'var(--bg-muted)',
                            color: !notification.is_read ? 'var(--warning)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-lg)',
                            flexShrink: 0
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-xs)' }}>
                            <h3 className="font-semibold text-primary">{notification.title}</h3>
                            <div className="flex items-center gap-sm">
                              <span className="text-sm text-secondary">{formatDate(notification.created_at)}</span>
                              {!notification.is_read && (
                                <div 
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--warning)'
                                  }}
                                ></div>
                              )}
                            </div>
                          </div>
                          <p className="text-secondary">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default RunnerNotification;
