import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import './postcard.css';

function PostCard({ post, index, onCancel, onConfirmComplete, isOtherUser = false, onAccept }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Debug logging - Updated 2025-06-06 12:34
  console.log('PostCard props:', { post: post?.id, index, onCancel: !!onCancel, onConfirmComplete: !!onConfirmComplete });
  const [reportData, setReportData] = useState({
    type: 'inappropriate_content',
    description: ''
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportStep, setReportStep] = useState(1);
  const [reportValidationError, setReportValidationError] = useState('');

  // Fetch payment transaction when post changes to accepted status
  useEffect(() => {
    if (post.status === 'accepted' && post.runner_id) {
      fetchPaymentTransaction();
    }
  }, [post.id, post.status]);

  const fetchPaymentTransaction = async () => {
    try {
      const response = await axiosInstance.get(`/posts/${post.id}/transactions`);
      if (response.data && response.data.length > 0) {
        const transaction = response.data.find(t => t.type === 'errand_payment');
        setPaymentTransaction(transaction);
      }
    } catch (error) {
      console.error('Error fetching payment transaction:', error);
    }
  };

  const handleVerifyPayment = async (verified) => {
    setPaymentLoading(true);
    try {
      await axiosInstance.patch(`/balance/verify-payment/${post.id}`, {
        verified: verified,
        payment_method: 'gcash',
        notes: verified ? 'Payment amount verified by customer' : 'Payment amount rejected by customer'
      });
      
      setShowPaymentModal(false);
      alert(verified ? 'Payment verified! Runner can now complete the errand.' : 'Payment rejected. Runner needs to resubmit the amount.');
      
      // Refresh the payment transaction
      fetchPaymentTransaction();
      
      // Force refresh the page to update status
      window.location.reload();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment: ' + (error.response?.data?.message || error.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fixed date/time parsing with validation
  const formatDueDateTime = () => {
    try {
      if (!post.deadline_date || !post.deadline_time) {
        return {
          formattedDueTime: 'Not specified',
          formattedDueDate: 'Not specified'
        };
      }

      // Create date object more safely
      const dateStr = post.deadline_date.includes('T') ? post.deadline_date.split('T')[0] : post.deadline_date;
      const timeStr = post.deadline_time;
      
      const dueDateObj = new Date(`${dateStr}T${timeStr}`);
      
      // Check if date is valid
      if (isNaN(dueDateObj.getTime())) {
        return {
          formattedDueTime: 'Invalid time',
          formattedDueDate: 'Invalid date'
        };
      }

      const formattedDueTime = dueDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const formattedDueDate = dueDateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return { formattedDueTime, formattedDueDate };
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return {
        formattedDueTime: 'Error parsing time',
        formattedDueDate: 'Error parsing date'
      };
    }
  };

  const { formattedDueTime, formattedDueDate } = formatDueDateTime();

  const formatStatus = (status) => {
    if (!status) return 'Pending';
    return status.replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const createdAt = new Date(post.created_at);

  // Use the post's user information instead of localStorage
  const postUser = post.user || {};
  
  const getUsername = () => {
    if (postUser.name) return postUser.name;
    if (postUser.firstname && postUser.lastname) return `${postUser.firstname} ${postUser.lastname}`;
    if (postUser.firstname) return postUser.firstname;
    if (postUser.lastname) return postUser.lastname;
    return 'Unknown User';
  };
  const username = getUsername();
  const firstLetter = username.charAt(0).toUpperCase();

  // Get current user to check if they can report this post
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canReport = currentUser.id && currentUser.id !== postUser.id;

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportData.description.trim()) {
      setReportError('Please provide a description for the report.');
      return;
    }

    setReportLoading(true);
    setReportError('');

    try {
      await axiosInstance.post('/reports', {
        reported_user_id: postUser.id,
        post_id: post.id,
        type: reportData.type,
        description: reportData.description.trim()
      });

      setReportSuccess('Report submitted successfully. It will be reviewed by an administrator.');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess('');
        setReportData({ type: 'inappropriate_content', description: '' });
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setReportError(error.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const validateReportDescription = (description) => {
    if (description.length > 1000) {
      setReportValidationError('Description must be 1000 characters or less.');
    } else {
      setReportValidationError('');
    }
  };

  return (
    <>
      <div className="post-card">
        <div className="post-header">
          <div className="Newfeedprofile-circle">
            {postUser.profile_picture ? (
              <img src={postUser.profile_picture} alt="Profile" className="profile-image" />
            ) : (
              firstLetter
            )}
          </div>
          <div className="name">
            <strong>{username}</strong>
            <p className="created-at">
              Posted on {createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString()}
            </p>
          </div>
          {canReport && (
            <div className="post-options">
              <button 
                className="report-btn" 
                onClick={() => setShowReportModal(true)}
                title="Report this post"
              >
                ⚠️
              </button>
            </div>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="Uploaded" className="post-image" />
        )}

        <p className="post-content">{post.content}</p>

        <footer className="footerpost">
          <div className="due-info">
            <p>
              <strong>Destination:</strong> {post.destination}
            </p>
            <p>
              <strong>Due Time:</strong> {formattedDueTime}
            </p>
            <p>
              <strong>Due Date:</strong> {formattedDueDate}
            </p>
          </div>

          <div className="post-footer">
            {/* Step 5.1.5: Payment Verification - Show when runner has submitted payment */}
            {post.status === 'accepted' && paymentTransaction && !paymentTransaction.payment_verified && (
              <div className="payment-verification-section">
                <div className="payment-alert">
                  <span className="payment-text">⚠️ Runner has submitted payment amount. Please verify before they can complete the errand.</span>
                  <button 
                    className="verify-payment-btn"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Review Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 5.1.6: Wait for runner completion */}
            {post.status === 'accepted' && paymentTransaction && paymentTransaction.payment_verified && (
              <div className="waiting-completion">
                <span className="waiting-text">✅ Payment verified. Waiting for runner to complete and deliver the errand...</span>
              </div>
            )}

            {/* Step 5.1.7: Final confirmation by customer */}
            {post.status === 'runner_completed' ? (
              <div className="completion-actions">
                <span className="completion-text">Runner has marked this as completed. Confirm?</span>
                <button 
                  className="confirm-btn"
                  onClick={() => {
                    console.log('Confirm button clicked, onConfirmComplete:', onConfirmComplete);
                    if (onConfirmComplete) {
                      onConfirmComplete(index);
                    } else {
                      console.error('onConfirmComplete function not available');
                      alert('Error: Confirmation function not available. Please refresh the page.');
                    }
                  }}
                >
                  ✅ Confirm Complete
                </button>
              </div>
            ) : post.status === 'completed' ? (
              <button className="status-btn status-completed" disabled>
                ✅ Completed
              </button>
            ) : post.status === 'accepted' ? (
              <button className="status-btn status-accepted" disabled>
                🏃 In Progress
              </button>
            ) : isOtherUser && post.status === 'pending' && onAccept ? (
              <button 
                className="btn btn-primary accept-btn"
                onClick={() => onAccept(post.id)}
              >
                🏃 Accept Errand
              </button>
            ) : (
              <button className={`status-btn status-${post.status || 'pending'}`} disabled>
                {formatStatus(post.status)}
              </button>
            )}
          </div>
        </footer>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-box enhanced-modal">
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">⚠️ Report Post</h3>
                <div className="progress-indicator">
                  <div className="progress-steps">
                    <div className={`step ${reportStep >= 1 ? 'active' : ''}`}>1</div>
                    <div className="step-line"></div>
                    <div className={`step ${reportStep >= 2 ? 'active' : ''}`}>2</div>
                  </div>
                  <div className="step-labels">
                    <span className={reportStep === 1 ? 'current' : ''}>Category</span>
                    <span className={reportStep === 2 ? 'current' : ''}>Details</span>
                  </div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowReportModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="step-container">
                
                {/* Step 1: Report Category */}
                {reportStep === 1 && (
                  <div className="step-content step-1">
                    <div className="step-header">
                      <h4>🔍 What's the issue?</h4>
                      <p className="step-subtitle">
                        Select the category that best describes the problem with this post
                      </p>
                    </div>
                    
                    <div className="content-section">
                      <div className="report-categories">
                        <label className={`report-option ${reportData.type === 'inappropriate_content' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            value="inappropriate_content"
                            checked={reportData.type === 'inappropriate_content'}
                            onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                          />
                          <div className="option-content">
                            <div className="option-icon">🚫</div>
                            <div className="option-text">
                              <h5>Inappropriate Content</h5>
                              <p>Contains offensive, harmful, or inappropriate material</p>
                            </div>
                          </div>
                        </label>
                        
                        <label className={`report-option ${reportData.type === 'spam' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            value="spam"
                            checked={reportData.type === 'spam'}
                            onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                          />
                          <div className="option-content">
                            <div className="option-icon">📧</div>
                            <div className="option-text">
                              <h5>Spam</h5>
                              <p>Repetitive, unwanted, or promotional content</p>
                            </div>
                          </div>
                        </label>
                        
                        <label className={`report-option ${reportData.type === 'harassment' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            value="harassment"
                            checked={reportData.type === 'harassment'}
                            onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                          />
                          <div className="option-content">
                            <div className="option-icon">😠</div>
                            <div className="option-text">
                              <h5>Harassment</h5>
                              <p>Bullying, threats, or targeted harassment</p>
                            </div>
                          </div>
                        </label>
                        
                        <label className={`report-option ${reportData.type === 'fraud' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            value="fraud"
                            checked={reportData.type === 'fraud'}
                            onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                          />
                          <div className="option-content">
                            <div className="option-icon">💰</div>
                            <div className="option-text">
                              <h5>Fraud</h5>
                              <p>Scam, fake information, or fraudulent activity</p>
                            </div>
                          </div>
                        </label>
                        
                        <label className={`report-option ${reportData.type === 'other' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            value="other"
                            checked={reportData.type === 'other'}
                            onChange={(e) => setReportData(prev => ({ ...prev, type: e.target.value }))}
                          />
                          <div className="option-content">
                            <div className="option-icon">❓</div>
                            <div className="option-text">
                              <h5>Other</h5>
                              <p>Something else that violates community guidelines</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Report Details */}
                {reportStep === 2 && (
                  <div className="step-content step-2">
                    <div className="step-header">
                      <h4>📝 Provide Details</h4>
                      <p className="step-subtitle">
                        Help us understand the issue with additional details
                      </p>
                    </div>
                    
                    <div className="content-section">
                      <div className="selected-category">
                        <h5>Selected Category:</h5>
                        <div className="category-display">
                          <span className="category-icon">
                            {reportData.type === 'inappropriate_content' && '🚫'}
                            {reportData.type === 'spam' && '📧'}
                            {reportData.type === 'harassment' && '😠'}
                            {reportData.type === 'fraud' && '💰'}
                            {reportData.type === 'other' && '❓'}
                          </span>
                          <span className="category-name">
                            {reportData.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                      
                      <div className="form-group-enhanced">
                        <label htmlFor="reportDescription" className="form-label-enhanced">
                          📄 Description
                        </label>
                        <div className="textarea-container">
                          <textarea
                            id="reportDescription"
                            value={reportData.description}
                            onChange={(e) => {
                              setReportData(prev => ({ ...prev, description: e.target.value }));
                              validateReportDescription(e.target.value);
                            }}
                            placeholder="Please describe the specific issue you've encountered..."
                            rows="6"
                            className={reportValidationError ? 'error' : ''}
                          />
                          <div className="char-counter">
                            {reportData.description.length}/1000
                          </div>
                        </div>
                        {reportValidationError && (
                          <div className="error-message">{reportValidationError}</div>
                        )}
                        {reportData.description.length >= 10 && !reportValidationError && (
                          <div className="success-message">✓ Description looks detailed!</div>
                        )}
                      </div>
                      
                      <div className="report-disclaimer">
                        <div className="disclaimer-icon">ℹ️</div>
                        <div className="disclaimer-text">
                          <p><strong>Important:</strong> False reports may result in account restrictions. 
                          Please only report content that genuinely violates our community guidelines.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            <div className="modal-footer">
              <div className="footer-buttons">
                {reportStep > 1 && (
                  <button className="btn-secondary" onClick={() => setReportStep(1)}>
                    ← Previous
                  </button>
                )}
                
                <div className="footer-right">
                  <button className="btn-secondary" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  
                  {reportStep < 2 ? (
                    <button 
                      className="btn-primary" 
                      onClick={() => setReportStep(2)}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      className="btn-danger"
                      onClick={handleReportSubmit}
                      disabled={reportLoading || !reportData.description.trim() || reportValidationError}
                    >
                      {reportLoading ? '⏳ Submitting...' : '🚨 Submit Report'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {showPaymentModal && paymentTransaction && (
        <div className="modal-overlay">
          <div className="modal payment-verification-modal">
            <div className="modal-header">
              <h3>💰 Payment Verification Required</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="payment-details">
                <h4>Runner has submitted the following payment details:</h4>
                
                <div className="payment-info-grid">
                  <div className="payment-row">
                    <span className="label">Original Amount Spent:</span>
                    <span className="value">₱{parseFloat(paymentTransaction.original_amount).toFixed(2)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="label">Service Fee:</span>
                    <span className="value">₱{parseFloat(paymentTransaction.service_fee).toFixed(2)}</span>
                  </div>
                  <div className="payment-row total">
                    <span className="label">Total Amount:</span>
                    <span className="value">₱{parseFloat(paymentTransaction.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                {paymentTransaction.proof_of_purchase && (
                  <div className="proof-section">
                    <h5>Proof of Purchase:</h5>
                    <div className="proof-content">
                      {paymentTransaction.proof_of_purchase.startsWith('data:image/') ? (
                        <img 
                          src={paymentTransaction.proof_of_purchase} 
                          alt="Proof of Purchase" 
                          className="proof-image"
                        />
                      ) : paymentTransaction.proof_of_purchase.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img 
                          src={paymentTransaction.proof_of_purchase} 
                          alt="Proof of Purchase" 
                          className="proof-image"
                        />
                      ) : (
                        <div className="proof-text">{paymentTransaction.proof_of_purchase}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="verification-message">
                  <p>Please verify that this amount is correct. The runner can only complete the errand after you verify the payment.</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => handleVerifyPayment(false)}
                disabled={paymentLoading}
              >
                ❌ Reject Payment
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleVerifyPayment(true)}
                disabled={paymentLoading}
              >
                {paymentLoading ? '⏳ Processing...' : '✅ Verify Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PostCard;
