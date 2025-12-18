import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import './admin.css';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [balanceTransactions, setBalanceTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, completed, pending

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axiosInstance.get('/admin/transactions');
      console.log('Transactions data:', response.data); // Debug log
      
      if (response.data.transactions) {
        setTransactions(response.data.transactions);
        setBalanceTransactions(response.data.balance_transactions || []);
        setSummary(response.data.summary || {});
      } else {
        // Fallback for old API response format
        setTransactions(response.data);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch transactions');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'completed') {
      // Check for multiple possible completed statuses
      return transaction.status === 'runner_completed' || 
             transaction.status === 'completed' ||
             transaction.status === 'complete';
    }
    if (filter === 'accepted') return transaction.status === 'accepted';
    if (filter === 'pending') return transaction.status === 'pending';
    return true; // all
  });

  // Function to get completed count for display
  const getCompletedCount = () => {
    return transactions.filter(t => 
      t.status === 'runner_completed' || 
      t.status === 'completed' ||
      t.status === 'complete'
    ).length;
  };

  if (loading) return <div className="admin-loading">Loading transactions...</div>;

  return (
    <div className="transaction-page-content">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {/* Statistics Cards - Reduced from 6 to 4 most important ones */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Errands</h3>
          <p className="stat-number">{summary.total_transactions || stats.total_posts || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-number">{summary.completed_transactions || stats.completed_posts || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Amount</h3>
          <p className="stat-number">₱{summary.total_transaction_amount ? summary.total_transaction_amount.toFixed(2) : '0.00'}</p>
        </div>
        <div className="stat-card">
          <h3>15% Commission Earned</h3>
          <p className="stat-number">₱{summary.system_profit ? summary.system_profit.toFixed(2) : '0.00'}</p>
          <small>From {getCompletedCount()} completed errands</small>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <button 
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          All ({transactions.length})
        </button>
        <button 
          className={filter === 'pending' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('pending')}
        >
          Pending ({transactions.filter(t => t.status === 'pending').length})
        </button>
        <button 
          className={filter === 'accepted' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('accepted')}
        >
          In Progress ({transactions.filter(t => t.status === 'accepted').length})
        </button>
        <button 
          className={filter === 'completed' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('completed')}
        >
          Completed ({getCompletedCount()})
        </button>
      </div>

      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="admin-empty">
            <h3>No transactions found</h3>
          </div>
        ) : (
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Errand Details</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>#{transaction.id}</td>
                    <td>
                      <div className="errand-details">
                        <p className="errand-content">{transaction.content}</p>
                        <small className="errand-destination">📍 {transaction.destination}</small>
                      </div>
                    </td>
                    <td>
                      <div className="user-info">
                        <div><strong>{transaction.user?.name}</strong></div>
                        {transaction.runner && (
                          <div><small>Runner: {transaction.runner.name}</small></div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${transaction.status}`}>
                        {transaction.status === 'pending' ? '⏳ Pending' :
                         transaction.status === 'accepted' ? '🏃‍♂️ In Progress' :
                         (transaction.status === 'runner_completed' || transaction.status === 'completed' || transaction.status === 'complete') ? '✅ Completed' : 
                         transaction.status}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
                        {transaction.completed_at && (
                          <small>Done: {new Date(transaction.completed_at).toLocaleDateString()}</small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;
