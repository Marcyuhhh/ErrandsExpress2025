import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import RunnerPost from '../../components/runner/runnerpostcard';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';

function RunnerHome() {
  const [stats, setStats] = useState({
    available: 0,
    accepted: 0,
    completed: 0
  });
  const [userBalance, setUserBalance] = useState(0);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    fetchUserBalance();
    fetchRunnerStats();

    // Set up polling to check for completion notifications and refresh stats
    const interval = setInterval(() => {
      checkForCompletionNotifications();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchUserBalance = async () => {
    try {
      const response = await axiosInstance.get('/balance');
      const balanceValue = parseFloat(response.data.balance) || 0;
      setUserBalance(balanceValue);
    } catch (error) {
      console.error('Error fetching user balance:', error);
      setUserBalance(0);
    }
  };

  const fetchRunnerStats = async () => {
    try {
      console.log('Fetching runner stats...');
      const response = await axiosInstance.get('/stats/runner');
      console.log('Runner stats response:', response.data);
      setUserPoints(response.data.points || 0);
      // Update the completed count in stats
      setStats(prevStats => ({
        ...prevStats,
        completed: response.data.completed_errands || 0
      }));
      console.log('Set userPoints to:', response.data.points || 0);
      console.log('Set completed to:', response.data.completed_errands || 0);
    } catch (error) {
      console.error('Error fetching runner stats:', error);
      setUserPoints(0);
    }
  };

  const checkForCompletionNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications/runner');
      const notifications = response.data;
      
      // Check for new completion notifications
      const completionNotifications = notifications.filter(
        n => n.type === 'errand_completed_confirmed' && !n.is_read
      );
      
      if (completionNotifications.length > 0) {
        console.log(`Found ${completionNotifications.length} new completion notifications`);
        
        // Refresh stats when new completion notifications are found
        await fetchRunnerStats();
        
        // Mark notifications as read
        for (const notification of completionNotifications) {
          try {
            await axiosInstance.patch(`/notifications/${notification.id}/read`);
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Helper function to safely format balance
  const formatBalance = (value) => {
    try {
      const numValue = parseFloat(value) || 0;
      return numValue.toFixed(2);
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0.00';
    }
  };

  // Update stats when posts change, but preserve completed count from backend
  const handleStatsUpdate = React.useCallback((newStats) => {
    setStats(prevStats => ({
      ...newStats,
      completed: prevStats.completed // Keep the completed count from backend
    }));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Runner Dashboard</h1>
        <p className="page-subtitle">Find and complete errands in your area to earn money</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview grid grid-4 gap-lg mb-2xl">
        <div className="card animate-scale-in">
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">📋</div>
            <h3 className="text-lg font-semibold">Available</h3>
            <p className="text-2xl font-bold text-info">{stats.available}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">⏳</div>
            <h3 className="text-lg font-semibold">Accepted</h3>
            <p className="text-2xl font-bold text-warning">{stats.accepted}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">✅</div>
            <h3 className="text-lg font-semibold">Completed</h3>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">⭐</div>
            <h3 className="text-lg font-semibold">Points Earned</h3>
            <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{userPoints}</p>
            <p className="text-xs text-secondary">1 point per completed errand</p>
          </div>
        </div>
      </div>

      {/* Available Errands Section */}
      <div className="errands-section">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-2xl font-bold">Available Errands</h2>
          <span className="status-badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}>
            🏃‍♂️ Runner Mode
          </span>
        </div>

        <div className="card">
          <div className="card-body p-0">
            <RunnerPost onStatsUpdate={handleStatsUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RunnerHome;