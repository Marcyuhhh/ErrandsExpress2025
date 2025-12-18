import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [counts, setCounts] = useState({
    notifications: 0,
    messages: 0,
    reports: 0, // For admin
    pendingUsers: 0, // For admin - users awaiting verification
    pendingBalancePayments: 0, // For admin - runner balance withdrawals
    pendingErrandPayments: 0, // For admin - errand payments needing approval
  });
  const [loading, setLoading] = useState(true);

  const fetchNotificationCounts = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        setCounts({ 
          notifications: 0, 
          messages: 0, 
          reports: 0, 
          pendingUsers: 0, 
          pendingBalancePayments: 0, 
          pendingErrandPayments: 0 
        });
        setLoading(false);
        return;
      }

      const promises = [];

      // Fetch notification count
      promises.push(
        axiosInstance.get('/notifications/unread-count')
          .then(response => ({ type: 'notifications', count: response.data.unread_count }))
          .catch(() => ({ type: 'notifications', count: 0 }))
      );

      // Fetch message count
      promises.push(
        axiosInstance.get('/messages/unread-count')
          .then(response => ({ type: 'messages', count: response.data.unread_count }))
          .catch(() => ({ type: 'messages', count: 0 }))
      );

      // Fetch admin counts if user is admin
      if (user.is_admin || user.role === 'admin') {
        // Reports count
        promises.push(
          axiosInstance.get('/reports/pending-count')
            .then(response => ({ type: 'reports', count: response.data.pending_count }))
            .catch(() => ({ type: 'reports', count: 0 }))
        );

        // Pending users count
        promises.push(
          axiosInstance.get('/admin/users/pending')
            .then(response => ({ type: 'pendingUsers', count: response.data.length }))
            .catch(() => ({ type: 'pendingUsers', count: 0 }))
        );

        // Pending balance payments count
        promises.push(
          axiosInstance.get('/admin/balances/pending-payments')
            .then(response => ({ type: 'pendingBalancePayments', count: response.data.length }))
            .catch(() => ({ type: 'pendingBalancePayments', count: 0 }))
        );

        // Pending errand payments count
        promises.push(
          axiosInstance.get('/admin/errand-payments/pending')
            .then(response => ({ type: 'pendingErrandPayments', count: response.data.length }))
            .catch(() => ({ type: 'pendingErrandPayments', count: 0 }))
        );
      }

      const results = await Promise.all(promises);
      
      const newCounts = { 
        notifications: 0, 
        messages: 0, 
        reports: 0, 
        pendingUsers: 0, 
        pendingBalancePayments: 0, 
        pendingErrandPayments: 0 
      };
      results.forEach(result => {
        newCounts[result.type] = result.count;
      });

      setCounts(newCounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      setCounts({ 
        notifications: 0, 
        messages: 0, 
        reports: 0, 
        pendingUsers: 0, 
        pendingBalancePayments: 0, 
        pendingErrandPayments: 0 
      });
      setLoading(false);
    }
  };

  const refreshCounts = () => {
    fetchNotificationCounts();
  };

  // Fetch counts on mount
  useEffect(() => {
    fetchNotificationCounts();
  }, []);

  // Refresh counts every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh counts when user changes (login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      fetchNotificationCounts();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    counts,
    loading,
    refreshCounts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 