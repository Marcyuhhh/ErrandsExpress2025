import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useNotifications } from '../../contexts/NotificationContext';
import Alert from '../../components/common/Alert.jsx';
import { handleApiError } from '../../utils/errorHandler';
import './customer.css';

function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaymentVerificationModal, setShowPaymentVerificationModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [conversationsWithPendingPayments, setConversationsWithPendingPayments] = useState(new Set());
  const [alert, setAlert] = useState({ isVisible: false, type: '', title: '', message: '', autoClose: true });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1);
  const { refreshCounts } = useNotifications();
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(null);
  const [runnerGCashSettings, setRunnerGCashSettings] = useState({ gcash_number: '', gcash_name: '' });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get('/messages/conversations');
      const conversationsData = response.data || [];
      const activeConversations = conversationsData.filter(conv => !conv.post.archived);
      setConversations(activeConversations);
      
      const pendingPaymentPostIds = new Set();
      for (const conversation of activeConversations) {
        if (conversation.post.user_id === currentUser?.id) {
          const hasPending = await checkForPendingPaymentQuiet(conversation.post.id);
          if (hasPending) {
            pendingPaymentPostIds.add(conversation.post.id);
          }
        }
      }
      setConversationsWithPendingPayments(pendingPaymentPostIds);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setConversations([]);
      setError('Failed to load conversations');
      setLoading(false);
    }
  };

  const fetchMessages = async (postId) => {
    try {
      const response = await axiosInstance.get(`/messages/post/${postId}`);
      setMessages(response.data);
      
      const unreadMessages = response.data.filter(
        message => !message.is_read && message.receiver_id === currentUser.id
      );
      
      for (const message of unreadMessages) {
        try {
          await axiosInstance.patch(`/messages/${message.id}/read`);
        } catch (readErr) {
          console.warn('Failed to mark message as read:', readErr);
        }
      }
      
      if (unreadMessages.length > 0) {
        refreshCounts();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      let receiverId;
      
      if (selectedConversation.post.user_id === currentUser.id) {
        if (selectedConversation.post.runner_id) {
          receiverId = selectedConversation.post.runner_id;
        } else {
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            receiverId = latestMessage.sender_id === currentUser.id 
              ? latestMessage.receiver_id 
              : latestMessage.sender_id;
          }
        }
      } else {
        receiverId = selectedConversation.post.user_id;
      }

      if (!receiverId) {
        setError('Unable to determine message recipient');
        return;
      }

      await axiosInstance.post('/messages', {
        post_id: selectedConversation.post.id,
        receiver_id: receiverId,
        message: newMessage.trim()
      });

      setNewMessage('');
      fetchMessages(selectedConversation.post.id);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.post.id);
    
    const hasPendingPayment = await checkForPendingPaymentQuiet(conversation.post.id);
    if (hasPendingPayment) {
      await checkForPendingPayment(conversation.post.id);
      setShowPaymentVerificationModal(true);
    }
    
    await checkPaymentStatus(conversation.post.id);
  };

  const fetchRunnerGCashDetails = async () => {
    try {
      let runnerId = null;
      
      if (selectedConversation?.post?.runner_id) {
        runnerId = selectedConversation.post.runner_id;
      } else if (selectedConversation?.post?.status === 'pending') {
        if (messages && messages.length > 0) {
          const otherUserId = messages.find(msg => msg.sender_id !== currentUser.id)?.sender_id ||
                             messages.find(msg => msg.receiver_id !== currentUser.id)?.receiver_id;
          
          if (selectedConversation.post.user_id === currentUser.id && otherUserId && otherUserId !== currentUser.id) {
            runnerId = otherUserId;
          }
        }
      }
      
      if (runnerId && runnerId !== currentUser.id) {
        const response = await axiosInstance.get(`/users/${runnerId}`);
        const runnerData = response.data;
        
        if (runnerData.id && runnerData.id.toString() !== currentUser.id.toString()) {
          setRunnerGCashSettings({
            gcash_number: runnerData.gcash_number || '',
            gcash_name: runnerData.gcash_name || ''
          });
        } else {
          setRunnerGCashSettings({ gcash_number: '', gcash_name: '' });
        }
      } else {
        setRunnerGCashSettings({ gcash_number: '', gcash_name: '' });
      }
    } catch (err) {
      console.error('Error fetching runner GCash details:', err);
      setRunnerGCashSettings({ gcash_number: '', gcash_name: '' });
    }
  };

  const sendGCashReminderMessage = async () => {
    try {
      const message = "Hi! I noticed you haven't set up your GCash details in your profile settings. Could you please add your GCash number and name so I can send the payment? Thanks!";
      
      let receiverId;
      
      if (selectedConversation.post.runner_id) {
        receiverId = selectedConversation.post.runner_id;
      } else {
        if (messages.length > 0) {
          const otherUserId = messages.find(msg => msg.sender_id !== currentUser.id)?.sender_id ||
                             messages.find(msg => msg.receiver_id !== currentUser.id)?.receiver_id;
          if (otherUserId && otherUserId !== currentUser.id) {
            receiverId = otherUserId;
          }
        }
      }

      if (!receiverId) {
        showAlert('error', 'Failed', 'Could not determine who to send the reminder to.');
        return;
      }
      
      await axiosInstance.post('/messages', {
        post_id: selectedConversation.post.id,
        receiver_id: receiverId,
        message: message
      });

      await fetchMessages(selectedConversation.post.id);
      setShowPaymentVerificationModal(false);
      
      showAlert('success', 'Message Sent', 'Reminder sent to runner about GCash details.');
    } catch (err) {
      console.error('Error sending GCash reminder:', err);
      showAlert('error', 'Failed', 'Could not send reminder message.');
    }
  };

  const sendAutomaticPaymentMessage = async (verified, paymentAmount) => {
    try {
      let message;
      let receiverId;

      if (selectedConversation.post.runner_id) {
        receiverId = selectedConversation.post.runner_id;
      } else {
        if (messages.length > 0) {
          const otherUserId = messages.find(msg => msg.sender_id !== currentUser.id)?.sender_id ||
                             messages.find(msg => msg.receiver_id !== currentUser.id)?.receiver_id;
          if (otherUserId && otherUserId !== currentUser.id) {
            receiverId = otherUserId;
          }
        }
      }

      if (!receiverId) return;

      if (verified) {
        message = `✅ Payment Verified! I have confirmed your payment request of ₱${paymentAmount}. The payment has been approved and you can now proceed with completing the errand. Thank you!`;
      } else {
        message = `❌ Payment Rejected. I have reviewed your payment request of ₱${paymentAmount} and need you to resubmit with the correct amount or proof. Please check the payment details and try again.`;
      }
      
      await axiosInstance.post('/messages', {
        post_id: selectedConversation.post.id,
        receiver_id: receiverId,
        message: message
      });
    } catch (err) {
      console.error('Error sending automatic payment message:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-badge status-completed';
      case 'pending': return 'status-badge status-pending';
      default: return 'status-badge';
    }
  };

  const checkForPendingPaymentQuiet = async (postId) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}/transactions`);
      const transactions = response.data;
      const pendingTransaction = transactions.find(
        t => t.type === 'errand_payment' && t.status === 'pending' && !t.payment_verified
      );
      return !!pendingTransaction;
    } catch (err) {
      return false;
    }
  };

  const checkForPendingPayment = async (postId) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}/transactions`);
      const transactions = response.data;
      const pendingTransaction = transactions.find(
        t => t.type === 'errand_payment' && t.status === 'pending' && !t.payment_verified
      );
      if (pendingTransaction) {
        setPendingPayment(pendingTransaction);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const checkPaymentStatus = async (postId) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}/transactions`);
      const transactions = response.data;
      const paymentTransaction = transactions.find(t => t.type === 'errand_payment');
      setCurrentPaymentStatus(paymentTransaction || null);
      return paymentTransaction;
    } catch (err) {
      setCurrentPaymentStatus(null);
      return null;
    }
  };

  const showAlert = (type, title, message, autoClose = true) => {
    setAlert({ isVisible: true, type, title, message, autoClose });
  };

  const closeAlert = () => {
    setAlert({ ...alert, isVisible: false });
  };

  const handleConfirmCompletion = async (postId) => {
    const conversation = conversations.find(conv => conv.post.id === postId);
    if (conversation && conversation.post.status !== 'runner_completed') {
      showAlert('warning', 'Cannot Complete Yet', 'Please wait for the runner to confirm completion first.');
      return;
    }

    try {
      await axiosInstance.patch(`/posts/${postId}/confirm-complete`);
      showAlert('success', 'Errand Completed! ✅', 'You have confirmed the errand completion.');
      
      const updatedConversations = conversations.filter(conv => conv.post.id !== postId);
      setConversations(updatedConversations);
      
      if (selectedConversation && selectedConversation.post.id === postId) {
        setSelectedConversation(null);
      }
      
    } catch (error) {
      console.error('Error confirming completion:', error);
      showAlert('error', 'Error', 'Failed to confirm completion: ' + (error.response?.data?.message || error.message));
    }
  };

  const verifyPayment = async (verified) => {
    if (!pendingPayment || !selectedConversation) return;
    setIsVerifying(true);

    try {
      await axiosInstance.patch(`/posts/${selectedConversation.post.id}/verify-payment`, {
        payment_method: paymentMethod,
        verified: verified
      });

      const paymentAmount = (parseFloat(pendingPayment.total_amount) || 0).toFixed(2);
      await sendAutomaticPaymentMessage(verified, paymentAmount);

      setShowPaymentVerificationModal(false);
      setPendingPayment(null);

      await Promise.all([
        fetchMessages(selectedConversation.post.id),
        fetchConversations(),
        checkPaymentStatus(selectedConversation.post.id)
      ]);

      if (verified) {
        showAlert('success', 'Payment Verified!', `Payment amount of ₱${paymentAmount} has been verified.`);
      } else {
        showAlert('info', 'Payment Rejected', 'Payment has been rejected. The runner has been notified to resubmit.');
      }

    } catch (err) {
      const errorInfo = handleApiError(err, 'payment verification');
      let customMessage = errorInfo.message;
      if (err.response?.status === 404) customMessage = 'Payment transaction not found.';
      else if (err.response?.status === 403) customMessage = 'You are not authorized to verify this payment.';
      
      showAlert(errorInfo.type, 'Verification Failed', customMessage, false);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page-container inbox-page">
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Communicate with errand runners and requesters</p>
      </div>

      <div className="inbox-layout">
        {/* Conversations Sidebar */}
        <div className="conversations-panel">
          <div className="panel-header">
            <h2>Conversations</h2>
          </div>
          <div className="conversations-body">
            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {conversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No conversations</h3>
                <p>Messages will appear here when you accept or post errands.</p>
              </div>
            ) : (
              <div className="conversations-list">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.post.id}
                    className={`conversation-item ${selectedConversation?.post.id === conversation.post.id ? 'active' : ''}`}
                    onClick={() => selectConversation(conversation)}
                  >
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <h4 className="conversation-title">
                          {conversation.post.content.substring(0, 35)}
                          {conversation.post.content.length > 35 ? '...' : ''}
                        </h4>
                        <span className={getStatusBadgeClass(conversation.post.status)}>
                          {conversation.post.status}
                        </span>
                      </div>
                      
                      {conversation.post.runner && (
                        <p className="runner-info">
                          🏃‍♂️ {conversation.post.runner.firstname} {conversation.post.runner.lastname}
                        </p>
                      )}
                      
                      <p className="destination-info">
                        📍 {conversation.post.destination}
                      </p>
                      
                      {conversation.latest_message && (
                        <p className="latest-message">
                          {conversation.latest_message.message.substring(0, 40)}
                          {conversation.latest_message.message.length > 40 ? '...' : ''}
                        </p>
                      )}
                      
                      <span className="conversation-time">
                        {conversation.latest_message && formatDate(conversation.latest_message.created_at)}
                      </span>
                    </div>
                    
                    {conversation.unread_count > 0 && (
                      <div className="unread-badge">{conversation.unread_count}</div>
                    )}
                    
                    {conversationsWithPendingPayments.has(conversation.post.id) && (
                      <div className="payment-pending-badge" title="Payment verification required">
                        💰
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-info">
                  <h3>{selectedConversation.post.content}</h3>
                  <div className="chat-meta">
                    <span className="chat-destination">📍 {selectedConversation.post.destination}</span>
                    <span className={getStatusBadgeClass(selectedConversation.post.status)}>
                      {selectedConversation.post.status}
                    </span>
                    {selectedConversation.post.user_id === currentUser?.id && (
                      <>
                        {selectedConversation.post.status === 'runner_completed' ? (
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleConfirmCompletion(selectedConversation.post.id)}
                          >
                            ✅ Confirm Complete
                          </button>
                        ) : currentPaymentStatus && selectedConversation.post.status !== 'runner_completed' && selectedConversation.post.status !== 'completed' ? (
                          <>
                            {currentPaymentStatus.status === 'pending' ? (
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={async () => {
                                  await checkForPendingPayment(selectedConversation.post.id);
                                  setShowPaymentVerificationModal(true);
                                }}
                              >
                                💰 Verify Payment
                              </button>
                            ) : (
                              <button 
                                className={`btn btn-sm ${
                                  currentPaymentStatus.status === 'approved' ? 'btn-info' : 'btn-secondary'
                                }`}
                                disabled={true}
                              >
                                {currentPaymentStatus.status === 'approved' ? '⏳ Waiting for Runner' : '⏳ Processing'}
                              </button>
                            )}
                          </>
                        ) : selectedConversation.post.status === 'completed' ? (
                          <button className="btn btn-success btn-sm" disabled={true}>
                            ✅ Completed
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-sm" disabled={true}>
                            ⏳ Waiting for Runner
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-body">
                <div className="messages-container">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`}
                    >
                      <div className="message-content">
                        <p className="message-text">{message.message}</p>
                        <span className="message-time">{formatDate(message.created_at)}</span>
                      </div>
                      <div className="message-sender">
                        {message.sender_id === currentUser.id ? 'You' : message.sender.firstname}
                      </div>
                    </div>
                  ))}
                </div>

                <form className="message-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    maxLength="1000"
                    className="message-input"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="btn btn-primary send-btn"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the left panel to start messaging.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Verification Modal */}
      {showPaymentVerificationModal && pendingPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentVerificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify Payment Amount</h3>
              <button className="modal-close" onClick={() => setShowPaymentVerificationModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="verification-steps">
                {verificationStep === 1 && (
                  <div className="verification-step">
                    <h4>📋 Review Payment Details</h4>
                    <div className="payment-details">
                      <div className="payment-card">
                        <h5>💵 Payment Breakdown</h5>
                        <div className="amount-details">
                          <div className="amount-item">
                            <span>Original Amount:</span>
                            <span>₱{(parseFloat(pendingPayment.original_amount) || 0).toFixed(2)}</span>
                          </div>
                          <div className="amount-item">
                            <span>Service Fee:</span>
                            <span>₱{(parseFloat(pendingPayment.service_fee) || 0).toFixed(2)}</span>
                          </div>
                          <div className="amount-item total">
                            <span>Total You Pay:</span>
                            <span>₱{(parseFloat(pendingPayment.total_amount) || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {verificationStep === 2 && (
                  <div className="verification-step">
                    <h4>💳 Choose Payment Method</h4>
                    <div className="payment-methods">
                      <label className={`method-option ${paymentMethod === 'gcash' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          value="gcash"
                          checked={paymentMethod === 'gcash'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <span>📱 GCash</span>
                      </label>
                      <label className={`method-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          value="cod"
                          checked={paymentMethod === 'cod'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <span>💵 Cash on Delivery</span>
                      </label>
                    </div>

                    {paymentMethod === 'gcash' && (
                      <div className="gcash-info">
                        <h5>📱 Runner's GCash Details</h5>
                        {runnerGCashSettings.gcash_number && runnerGCashSettings.gcash_name ? (
                          <div className="runner-gcash">
                            <p><strong>Number:</strong> {runnerGCashSettings.gcash_number}</p>
                            <p><strong>Name:</strong> {runnerGCashSettings.gcash_name}</p>
                          </div>
                        ) : (
                          <div className="gcash-missing">
                            <p>⚠️ Runner hasn't set up GCash details yet.</p>
                            <button className="btn btn-primary" onClick={sendGCashReminderMessage}>
                              📱 Send Reminder
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <div className="footer-actions">
                {verificationStep > 1 && (
                  <button className="btn btn-secondary" onClick={() => setVerificationStep(1)}>
                    ← Previous
                  </button>
                )}
                
                <div className="right-actions">
                  <button className="btn btn-secondary" onClick={() => setShowPaymentVerificationModal(false)}>
                    Cancel
                  </button>
                  
                  {verificationStep < 2 ? (
                    <button className="btn btn-primary" onClick={() => setVerificationStep(2)}>
                      Next →
                    </button>
                  ) : (
                    <div className="verification-buttons">
                      <button 
                        className={`btn btn-danger ${isVerifying ? 'loading' : ''}`}
                        onClick={() => verifyPayment(false)}
                        disabled={isVerifying}
                      >
                        {isVerifying ? '⏳ Processing...' : '❌ Reject'}
                      </button>
                      <button 
                        className={`btn btn-success ${isVerifying ? 'loading' : ''}`}
                        onClick={() => verifyPayment(true)}
                        disabled={isVerifying || !paymentMethod}
                      >
                        {isVerifying ? '⏳ Processing...' : '✅ Approve'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default Inbox;