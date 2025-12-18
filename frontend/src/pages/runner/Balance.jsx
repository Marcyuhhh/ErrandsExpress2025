import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import Alert from '../../components/common/Alert.jsx';
import './Balance.css';

function RunnerBalance() {
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState('active');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState({ isVisible: false, type: 'info', title: '', message: '' });
  const [apiError, setApiError] = useState(null);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [gcashInfo, setGcashInfo] = useState({
    number: '09123456789',
    account_name: 'Errands Express System'
  });
  const [pendingPayment, setPendingPayment] = useState(null);

  const fetchGCashInfo = async () => {
    try {
      const response = await axiosInstance.get('/system/gcash-info');
      setGcashInfo(response.data.gcash_info);
    } catch (error) {
      console.error('Error fetching GCash info:', error);
      // Keep default values if fetch fails
    }
  };

  useEffect(() => {
    console.log('RunnerBalance component mounted');
    fetchBalance();
    fetchTransactions();
    fetchGCashInfo();
  }, []);

  const fetchBalance = async () => {
    try {
      console.log('Fetching balance...');
      const response = await axiosInstance.get('/balance');
      console.log('Balance response:', response.data);
      setBalance(response.data.balance || 0);
      setBalanceStatus(response.data.status || 'active');
      setPaymentStatus(response.data.payment_status || null);
      setTotalEarned(response.data.total_earned || 0);
      setTotalPaid(response.data.total_paid || 0);
      setLoading(false);
      setApiError(null);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setApiError('Failed to load balance data');
      setLoading(false);
      // Set default values for demo purposes
      setBalance(0);
      setBalanceStatus('active');
      setPaymentStatus({
        status: 'clear',
        message: 'No outstanding balance',
        urgency: 'none'
      });
      setTotalEarned(0);
      setTotalPaid(0);
    }
  };

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...');
      const response = await axiosInstance.get('/balance/transactions');
      console.log('Transactions response:', response.data);
      setTransactions(response.data || []);
      
      // Check for pending balance payment
      const pendingBalancePayment = response.data?.find(t => 
        t.type === 'balance_payment' && t.status === 'pending'
      );
      setPendingPayment(pendingBalancePayment || null);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
      setPendingPayment(null);
      // Add some demo transactions for testing
      setTransactions([
        {
          id: 1,
          type: 'errand_payment',
          amount: 25.00,
          status: 'approved',
          status_display: 'Approved',
          created_at: new Date().toISOString(),
          post_title: 'Grocery Shopping',
          customer_name: 'John Doe'
        },
        {
          id: 2,
          type: 'balance_payment',
          amount: 50.00,
          status: 'pending',
          status_display: 'Pending',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          approved_by: null
        }
      ]);
    }
  };

  const showAlert = (type, title, message, autoClose = true) => {
    setAlert({
      isVisible: true,
      type,
      title,
      message,
      autoClose
    });
  };

  const closeAlert = () => {
    setAlert({ ...alert, isVisible: false });
  };

  const handlePayBalanceNow = () => {
    if (balance <= 0) {
      showAlert('info', 'No Balance Due', 'You currently have no outstanding balance to pay.');
      return;
    }
    
    setShowPaymentModal(true);
    setPaymentStep(1);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showAlert('error', 'File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentProof(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitBalancePayment = async () => {
    if (!paymentProof) {
      showAlert('error', 'Proof Required', 'Please upload proof of payment before submitting.');
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await axiosInstance.post('/balance/pay', {
        proof_of_payment: paymentProof,
        payment_method: 'gcash',
        notes: paymentNotes
      });

      showAlert('success', 'Payment Processed', response.data.message);
      setShowPaymentModal(false);
      
      // Reset form
      setPaymentStep(1);
      setPaymentProof('');
      setPaymentNotes('');
      
      // Refresh data
      fetchBalance();
      fetchTransactions();
      
    } catch (error) {
      console.error('Error submitting payment:', error);
      showAlert('error', 'Payment Failed', error.response?.data?.error || 'Failed to submit payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentStep(1);
    setPaymentProof('');
    setPaymentNotes('');
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--success)';
      case 'payment_pending': return 'var(--warning)';
      case 'payment_overdue': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'none': return 'var(--success)';
      case 'low': return 'var(--info)';
      case 'medium': return 'var(--warning)';
      case 'high': return 'var(--danger)';
      case 'critical': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="runner-balance-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading balance information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="runner-balance-page">
      {apiError && (
        <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <strong>⚠️ API Connection Issue:</strong> {apiError}. Showing demo data for layout testing.
        </div>
      )}
      
      <div className="balance-header">
        <h1 className="balance-title">💰 My Balance</h1>
        <p className="balance-subtitle">Track your earnings (15% commission auto-processed)</p>
      </div>

      {/* Balance Overview Cards */}
      <div className="balance-overview">
        <div className="balance-card current-balance">
          <div className="balance-card-header">
            <h3 style={{ color: '#000' }}>Current Balance</h3>
            <span className="balance-status" style={{ color: getStatusColor(balanceStatus) }}>
              {balanceStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="balance-amount-large" style={{ color: '#000' }}>₱{parseFloat(balance).toFixed(2)}</div>
          {paymentStatus && (
            <div className="payment-status-info">
              <div className="payment-status-message" style={{ color: getUrgencyColor(paymentStatus.urgency) }}>
                {paymentStatus.message}
              </div>
            </div>
          )}
          
          {/* Pay Balance Now Button */}
          {balance > 0 && (
            <div className="balance-action" style={{ marginTop: 'var(--spacing-md)' }}>
              {pendingPayment ? (
                <button 
                  className="btn-pay-balance"
                  disabled={true}
                  style={{
                    background: '#6c757d',
                    color: '#000',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'bold',
                    cursor: 'not-allowed',
                    fontSize: '1rem',
                    opacity: 0.7
                  }}
                >
                  ⏳ Payment Pending
                </button>
              ) : (
                <button 
                  className="btn-pay-balance"
                  onClick={handlePayBalanceNow}
                  style={{
                    background: 'var(--primary)',
                    color: '#000',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-lg)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'var(--primary-dark)'}
                  onMouseOut={(e) => e.target.style.background = 'var(--primary)'}
                >
                  💳 Pay Balance Now
                </button>
              )}
            </div>
          )}
        </div>

        <div className="balance-card total-earned">
          <div className="balance-card-header">
            <h3>Total Earned</h3>
            <span className="balance-icon">📈</span>
          </div>
          <div className="balance-amount">₱{parseFloat(totalEarned).toFixed(2)}</div>
          <div className="balance-subtitle">Lifetime earnings</div>
        </div>

        <div className="balance-card total-paid">
          <div className="balance-card-header">
            <h3>Total Paid</h3>
            <span className="balance-icon">💸</span>
          </div>
          <div className="balance-amount">₱{parseFloat(totalPaid).toFixed(2)}</div>
          <div className="balance-subtitle">Payments made</div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="earnings-breakdown-section">
        <h3>💰 Your Earnings Breakdown</h3>
        <div className="earnings-cards">
          <div className="earnings-card profit-card">
            <div className="earnings-card-header">
              <h4>🎯 Total Profit Earned</h4>
              <span className="earnings-icon">💵</span>
            </div>
            <div className="earnings-amount profit-amount">₱{parseFloat(totalEarned).toFixed(2)}</div>
            <div className="earnings-subtitle">85% of service fees from completed errands</div>
            <div className="earnings-note">✅ This money is yours to keep!</div>
          </div>
          
          <div className="earnings-card debt-card">
            <div className="earnings-card-header">
              <h4>⚠️ Commission Owed</h4>
              <span className="earnings-icon">📊</span>
            </div>
            <div className="earnings-amount debt-amount">₱{parseFloat(balance).toFixed(2)}</div>
            <div className="earnings-subtitle">15% of service fees (platform commission)</div>
            <div className="earnings-note">💳 Must be paid within 5 days</div>
          </div>
          
          <div className="earnings-card net-card">
            <div className="earnings-card-header">
              <h4>💎 Net Profit</h4>
              <span className="earnings-icon">🏆</span>
            </div>
            <div className="earnings-amount net-amount">₱{(parseFloat(totalEarned) - parseFloat(totalPaid)).toFixed(2)}</div>
            <div className="earnings-subtitle">Total earned minus total paid</div>
            <div className="earnings-note">🎉 Your actual profit after all payments</div>
          </div>
        </div>
        
        {/* Profit Summary */}
        <div className="profit-summary">
          <h4>📈 Profit Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Service Fees Generated:</span>
              <span className="summary-value">₱{(parseFloat(totalEarned) / 0.85).toFixed(2)}</span>
            </div>
            <div className="summary-item profit">
              <span className="summary-label">Your Share (85%):</span>
              <span className="summary-value">₱{parseFloat(totalEarned).toFixed(2)}</span>
            </div>
            <div className="summary-item commission">
              <span className="summary-label">Platform Share (15%):</span>
              <span className="summary-value">₱{((parseFloat(totalEarned) / 0.85) * 0.15).toFixed(2)}</span>
            </div>
            <div className="summary-item outstanding">
              <span className="summary-label">Outstanding Balance:</span>
              <span className="summary-value">₱{parseFloat(balance).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>



      {/* Transaction History */}
      <div className="transactions-section">
        <h3>📋 Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h4>No transactions yet</h4>
            <p>Your transaction history will appear here once you start completing errands.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-header">
                  <div className="transaction-info">
                    <span className="transaction-type">
                      {transaction.type === 'errand_payment' ? '🛍️ Errand Payment' : 
                       transaction.type === 'balance_payment' ? '💳 Balance Payment' : 
                       '📄 ' + transaction.type}
                    </span>
                    <span className="transaction-date">{formatDate(transaction.created_at)}</span>
                  </div>
                  <div className="transaction-status">
                    <span className="status-icon">{getTransactionStatusIcon(transaction.status)}</span>
                    <span className="status-text">{transaction.status_display}</span>
                  </div>
                </div>
                <div className="transaction-details">
                  <div className="transaction-amount">₱{parseFloat(transaction.amount).toFixed(2)}</div>
                  {transaction.post_title && (
                    <div className="transaction-post">Errand: {transaction.post_title}</div>
                  )}
                  {transaction.customer_name && (
                    <div className="transaction-customer">Customer: {transaction.customer_name}</div>
                  )}
                  {transaction.approved_by && (
                    <div className="transaction-approver">Approved by: {transaction.approved_by}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Pay Balance Now</h3>
              <button className="modal-close" onClick={closePaymentModal}>×</button>
            </div>
            
            <div className="modal-body">
              {paymentStep === 1 && (
                <div className="payment-step">
                  <div className="payment-info">
                    <h4>💰 Payment Details</h4>
                    <div className="payment-amount-display">
                      <span>Amount to Pay: </span>
                      <strong>₱{parseFloat(balance).toFixed(2)}</strong>
                    </div>
                  </div>
                  
                  <div className="gcash-info">
                    <h4>📱 GCash Payment Information</h4>
                    <div className="gcash-details">
                      <div className="gcash-item">
                        <span className="gcash-label">GCash Number:</span>
                        <span className="gcash-value">{gcashInfo.number}</span>
                      </div>
                      <div className="gcash-item">
                        <span className="gcash-label">Account Name:</span>
                        <span className="gcash-value">{gcashInfo.account_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="payment-instructions">
                    <h4>📋 Instructions</h4>
                    <ol>
                      <li>Send exactly <strong>₱{parseFloat(balance).toFixed(2)}</strong> to the GCash number above</li>
                      <li>Take a screenshot of the payment confirmation</li>
                      <li>Upload the screenshot as proof of payment</li>
                      <li>Submit - your balance will be processed automatically</li>
                    </ol>
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="btn-secondary" 
                      onClick={closePaymentModal}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={() => setPaymentStep(2)}
                    >
                      I've Made the Payment →
                    </button>
                  </div>
                </div>
              )}
              
              {paymentStep === 2 && (
                <div className="payment-step">
                  <div className="payment-proof-section">
                    <h4>📸 Upload Proof of Payment</h4>
                    <p>Please upload a screenshot or photo of your GCash payment confirmation.</p>
                    
                    <div className="file-upload-area">
                      <input
                        type="file"
                        id="payment-proof"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="payment-proof" className="file-upload-label">
                        {paymentProof ? (
                          <div className="file-uploaded">
                            <span>✅ Proof uploaded successfully</span>
                            <img 
                              src={paymentProof} 
                              alt="Payment proof" 
                              style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '10px' }}
                            />
                          </div>
                        ) : (
                          <div className="file-upload-placeholder">
                            <span>📁 Click to upload proof of payment</span>
                            <small>Supported: JPG, PNG, GIF (Max 10MB)</small>
                          </div>
                        )}
                      </label>
                    </div>
                    
                    <div className="payment-notes">
                      <label htmlFor="payment-notes">Additional Notes (Optional):</label>
                      <textarea
                        id="payment-notes"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Any additional information about your payment..."
                        rows="3"
                      />
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="btn-secondary" 
                      onClick={() => setPaymentStep(1)}
                    >
                      ← Back
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={submitBalancePayment}
                      disabled={!paymentProof || paymentLoading}
                    >
                      {paymentLoading ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alert Component */}
      <Alert
        type={alert.type}
        title={alert.title}
        message={alert.message}
        isVisible={alert.isVisible}
        onClose={closeAlert}
        autoClose={alert.autoClose}
      />
    </div>
  );
}

export default RunnerBalance; 