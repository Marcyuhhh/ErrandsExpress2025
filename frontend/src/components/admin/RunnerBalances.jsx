import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../pages/admin/admin.css';

function RunnerBalances() {
  const [pendingBalancePayments, setPendingBalancePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingBalancePayments();
  }, []);

  const fetchPendingBalancePayments = async () => {
    try {
      const response = await axiosInstance.get('/admin/balances/pending-payments');
      setPendingBalancePayments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending balance payments:', error);
      setLoading(false);
    }
  };

  const approveBalancePayment = async (transactionId) => {
    try {
      const payment = pendingBalancePayments.find(p => p.id === transactionId);
      await axiosInstance.patch(`/admin/balances/payment/${transactionId}/approve`, {
        confirmed: true,
        notes: `Approved balance payment for ${payment?.runner_name || 'Runner'} - Amount: ₱${payment?.amount || '0.00'}`
      });
      alert('Balance payment approved successfully!');
      setSelectedPayment(null);
      fetchPendingBalancePayments();
    } catch (error) {
      console.error('Error approving balance payment:', error);
      alert('Failed to approve balance payment: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const rejectBalancePayment = async (transactionId) => {
    try {
      await axiosInstance.patch(`/admin/balances/payment/${transactionId}/reject`, {
        reason: rejectionReason
      });
      alert('Balance payment rejected successfully!');
      setShowRejectModal(false);
      setSelectedPayment(null);
      setRejectionReason('');
      fetchPendingBalancePayments();
    } catch (error) {
      console.error('Error rejecting balance payment:', error);
      alert('Failed to reject balance payment: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const showRejectionModal = (payment) => {
    setSelectedPayment(payment);
    setShowRejectModal(true);
  };

  const togglePaymentExpansion = (paymentId) => {
    setExpandedPayment(expandedPayment === paymentId ? null : paymentId);
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

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">💰 Runner Balance</h1>
        <p className="admin-subtitle">Review and approve runner commission payments</p>
      </div>

      {/* Runner Balance Payments Section */}
      <div className="tab-content">
        {pendingBalancePayments.length === 0 ? (
          <div className="admin-empty">
            <h3>No Pending Balance Payments</h3>
            <p>All runner balance payments have been processed or no payments are awaiting approval.</p>
          </div>
        ) : (
          <div className="transactions-table-container">
            <table className="commission-transactions-table">
              <thead>
                <tr>
                  <th>Runner</th>
                  <th>Balance Amount</th>
                  <th>Payment Method</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingBalancePayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="errand-info">
                        <p className="errand-title">{payment.runner_name}</p>
                        <small>{payment.runner_email}</small>
                      </div>
                    </td>
                    <td className="service-fee">₱{parseFloat(payment.total_amount).toFixed(2)}</td>
                    <td>
                      <span className="payment-method-badge">
                        {payment.payment_method_display || payment.payment_method}
                      </span>
                    </td>
                    <td>{formatDate(payment.created_at)}</td>
                    <td>
                      <span className="status-badge pending">
                        {payment.status_display || 'Pending Approval'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-approve"
                          onClick={() => approveBalancePayment(payment.id)}
                          title="Approve Balance Payment"
                        >
                          ✅
                        </button>
                        <button 
                          className="btn-reject"
                          onClick={() => showRejectionModal(payment)}
                          title="Reject Payment"
                        >
                          ❌
                        </button>
                        <button 
                          className="btn-view"
                          onClick={() => togglePaymentExpansion(payment.id)}
                          title="View Payment Proof"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Details Expansion */}
        {expandedPayment && (
          <div className="payment-details-modal">
            {(() => {
              const payment = pendingBalancePayments.find(p => p.id === expandedPayment);
              if (!payment) return null;
              
              return (
                <div className="payment-details-content">
                  <div className="payment-details-header">
                    <h3>Payment Proof - {payment.runner_name}</h3>
                    <button 
                      className="close-details"
                      onClick={() => setExpandedPayment(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="payment-proof-container">
                    {payment.proof_of_purchase && (
                      <img 
                        src={payment.proof_of_purchase} 
                        alt="Payment Proof" 
                        className="payment-proof-image"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                      />
                    )}
                  </div>
                  <div className="payment-details-info">
                    <p><strong>Amount:</strong> ₱{parseFloat(payment.total_amount).toFixed(2)}</p>
                    <p><strong>Payment Method:</strong> {payment.payment_method_display}</p>
                    <p><strong>Submitted:</strong> {formatDate(payment.created_at)}</p>
                    {payment.notes && <p><strong>Notes:</strong> {payment.notes}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Payment Rejection Modal */}
      {showRejectModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ Reject Balance Payment</h3>
              <button 
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="rejection-details">
                <div className="warning-message">
                  <div className="warning-icon">⚠️</div>
                  <p>You are about to reject a balance payment. This action cannot be undone.</p>
                </div>
                
                <div className="payment-confirmation-summary">
                  <h4>Payment Details</h4>
                  <div className="confirmation-item">
                    <span className="label">Runner:</span>
                    <span className="value">{selectedPayment.runner_name}</span>
                  </div>
                  <div className="confirmation-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedPayment.runner_email}</span>
                  </div>
                  <div className="confirmation-item">
                    <span className="label">Balance Amount:</span>
                    <span className="value amount">₱{parseFloat(selectedPayment.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="confirmation-item">
                    <span className="label">Payment Method:</span>
                    <span className="value">{selectedPayment.payment_method_display}</span>
                  </div>
                  <div className="confirmation-item">
                    <span className="label">Submitted:</span>
                    <span className="value">{formatDate(selectedPayment.created_at)}</span>
                  </div>
                </div>

                <div className="approval-notes-section">
                  <label htmlFor="rejection-reason">Rejection Reason (Required)</label>
                  <textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this balance payment..."
                    rows="3"
                    className="form-input"
                    required
                  />
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => rejectBalancePayment(selectedPayment.id)}
                disabled={!rejectionReason.trim()}
              >
                ❌ Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunnerBalances; 