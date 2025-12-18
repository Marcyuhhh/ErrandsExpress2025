import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import Alert from '../../components/common/Alert.jsx';
import { handlePaymentError } from '../../utils/errorHandler';
import { useNotifications } from '../../contexts/NotificationContext';
import './Inbox.css';

function RunnerInbox() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [proofOfPurchase, setProofOfPurchase] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [alert, setAlert] = useState({ isVisible: false, type: 'info', title: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({ amount: '', proof: '' });
  const { refreshCounts } = useNotifications();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axiosInstance.get('/messages/runner/conversations');
      const conversationsData = response.data || [];
      
      // Filter out archived conversations (additional safety measure)
      const activeConversations = conversationsData.filter(conv => !conv.post.archived);
      setConversations(activeConversations);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      // Set empty array on error to prevent crashes
      setConversations([]);
      setError('Failed to load conversations');
      setLoading(false);
    }
  };

  const fetchMessages = async (postId) => {
    try {
      const response = await axiosInstance.get(`/messages/post/${postId}`);
      setMessages(response.data);
      
      // Mark unread messages as read
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
      
      // Refresh message counts if any messages were marked as read
      if (unreadMessages.length > 0) {
        refreshCounts();
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      
      // Handle different error cases
      if (err.response?.status === 404) {
        console.warn('Messages not found for this post, this is normal for new conversations');
        setMessages([]);
      } else if (err.response?.status === 403) {
        console.warn('Not authorized to view messages for this post');
        setMessages([]);
        setError('Not authorized to view messages for this conversation');
      } else {
        setError('Failed to load messages');
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const receiverId = selectedConversation.post.user_id;

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

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.post.id);
    
    // Only check payment data for accepted errands (not pending ones)
    if (conversation.post.status === 'accepted' || 
        conversation.post.status === 'runner_completed' || 
        conversation.post.status === 'confirmed') {
      checkExistingPayment(conversation.post.id);
    } else {
      // Clear payment data for pending posts
      setExistingPayment(null);
    }
  };

  const checkExistingPayment = async (postId) => {
    try {
      // Try to get payment directly for this post
      try {
        const response = await axiosInstance.get(`/posts/${postId}/transactions`);
        
        if (response.data && response.data.length > 0) {
          const payment = response.data.find(t => t.type === 'errand_payment');
          setExistingPayment(payment);
          return;
        } else {
          setExistingPayment(null);
          return;
        }
      } catch (directErr) {
        console.error('Error fetching payment transactions:', directErr.message);
      }
      
      // If direct endpoint fails, set payment to null
      setExistingPayment(null);
      setRefreshCounter(prev => prev + 1); // Force re-render
      
    } catch (err) {
      console.error('Error checking existing payment:', err);
      setExistingPayment(null);
      setRefreshCounter(prev => prev + 1); // Force re-render
    }
  };

  const acceptErrand = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/accept`);
      
      // Update the conversation status
      setConversations(conversations.map(conv => 
        conv.post.id === postId 
          ? { ...conv, post: { ...conv.post, status: 'accepted', runner_id: currentUser.id } }
          : conv
      ));
      
      if (selectedConversation && selectedConversation.post.id === postId) {
        const updatedConversation = {
          ...selectedConversation,
          post: { ...selectedConversation.post, status: 'accepted', runner_id: currentUser.id }
        };
        setSelectedConversation(updatedConversation);
        
        // Now that the errand is accepted, check for payment data
        checkExistingPayment(postId);
      }
      
      showAlert(
        'success',
        'Errand Accepted!',
        'You have successfully accepted this errand. You can now start working on it.'
      );
    } catch (err) {
      console.error('Error accepting errand:', err);
      showAlert(
        'error',
        'Cannot Accept Errand',
        err.response?.data?.message || 'Failed to accept errand. Please try again.',
        false
      );
    }
  };

  const sendAutomaticRunnerCompletionMessage = async (postId) => {
    try {
      const conversation = conversations.find(conv => conv.post.id === postId);
      if (!conversation || !conversation.post.user_id) {
        console.error('Could not find conversation or customer for runner completion message');
        return;
      }

      const message = `✅ Errand Completed! Hi! I have successfully completed your errand as requested. Everything has been taken care of according to your instructions. Please review the work and confirm completion when you're satisfied. Thank you for choosing me for your errand!`;
      
      await axiosInstance.post('/messages', {
        post_id: postId,
        receiver_id: conversation.post.user_id,
        message: message
      });

      console.log('Automatic runner completion message sent successfully');
    } catch (err) {
      console.error('Error sending automatic runner completion message:', err);
      // Don't show error to user as this is automatic
    }
  };

  const markTaskComplete = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/complete`);
      
      // Send automatic message to customer
      await sendAutomaticRunnerCompletionMessage(postId);
      
      // Update the conversation status
      setConversations(conversations.map(conv => 
        conv.post.id === postId 
          ? { ...conv, post: { ...conv.post, status: 'runner_completed' } }
          : conv
      ));
      
      if (selectedConversation && selectedConversation.post.id === postId) {
        setSelectedConversation({
          ...selectedConversation,
          post: { ...selectedConversation.post, status: 'runner_completed' }
        });
      }
      
      showAlert(
        'success',
        'Task Completed!',
        'The errand has been marked as completed and the customer has been notified.'
      );
    } catch (err) {
      const errorInfo = handlePaymentError(err);
      
      // Customize error messages for task completion
      let customMessage = errorInfo.message;
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.error?.includes('Payment amount must be provided')) {
          customMessage = 'You must provide a payment amount before completing this errand.';
        } else if (errorData.error?.includes('Payment must be verified by customer')) {
          customMessage = 'The customer must verify your payment amount first.';
        } else if (errorData.error?.includes('Payment must be approved by admin')) {
          customMessage = 'The admin must approve the payment first.';
        }
      }
      
      showAlert(
        errorInfo.type,
        'Cannot Complete Task',
        customMessage,
        false
      );
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showAlert('warning', 'File Too Large', 'File size must be less than 10MB. Please choose a smaller file or compress the image.');
      e.target.value = ''; // Clear the input
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('warning', 'Invalid File Type', 'Please upload an image (JPG, PNG, GIF) or PDF file.');
      e.target.value = ''; // Clear the input
      return;
    }

    // Convert image file to base64 for storage
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setProofOfPurchase(base64Data);
        setSelectedFile(file);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, store file info as text
      const fileInfo = `File: ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${file.type}) - Uploaded on ${new Date().toLocaleString()}`;
      setProofOfPurchase(fileInfo);
      setSelectedFile(file);
    }
    
    // Show success message
    showAlert('success', 'File Uploaded', `Successfully uploaded ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
  };

  const calculateServiceFee = (amount) => {
    const numAmount = parseFloat(amount);
    
    if (numAmount <= 0) {
      return 0;
    }
    
    // Apply the exact specification to match backend
    if (numAmount <= 150) {
      return 20; // ₱20 service fee for amounts ≤ ₱150
    } else {
      return Math.round(numAmount * 0.20 * 100) / 100; // 20% of amount for amounts > ₱150
    }
  };

  const calculateRunnerEarnings = (amount) => {
    const serviceFee = calculateServiceFee(amount);
    return Math.round(serviceFee * 0.85 * 100) / 100; // Runner gets 85% of service fee (their profit)
  };

  const calculatePlatformCommission = (amount) => {
    const serviceFee = calculateServiceFee(amount);
    return Math.round(serviceFee * 0.15 * 100) / 100; // Platform gets 15% of service fee (added to errands balance)
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

  const validatePaymentAmount = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationErrors({ ...validationErrors, amount: 'Please enter a valid payment amount greater than ₱0.' });
    } else if (numAmount > 50000) {
      setValidationErrors({ ...validationErrors, amount: 'Payment amount cannot exceed ₱50,000.' });
    } else {
      setValidationErrors({ ...validationErrors, amount: '' });
    }
  };

  const handlePaymentPrevious = () => {
    if (paymentStep > 1) {
      setPaymentStep(paymentStep - 1);
    }
  };

  const handlePaymentNext = () => {
    if (paymentStep < 3) {
      setPaymentStep(paymentStep + 1);
    }
  };

  const submitPaymentAmount = async () => {
    // Validation
    if (!paymentAmount || !proofOfPurchase || !selectedConversation) {
      showAlert('warning', 'Missing Information', 'Please fill in all required fields: payment amount and proof of purchase.');
      return;
    }

    // Validate amount
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('warning', 'Invalid Amount', 'Please enter a valid payment amount greater than ₱0.');
      return;
    }

    if (amount > 50000) {
      showAlert('warning', 'Amount Too Large', 'Payment amount cannot exceed ₱50,000.');
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceFee = calculateServiceFee(paymentAmount);
      const totalAmount = parseFloat(paymentAmount) + serviceFee;

      console.log('Submitting payment:', {
        postId: selectedConversation.post.id,
        original_amount: parseFloat(paymentAmount),
        proof_of_purchase: proofOfPurchase
      });

      const response = await axiosInstance.post(`/posts/${selectedConversation.post.id}/payment`, {
        original_amount: parseFloat(paymentAmount),
        proof_of_purchase: proofOfPurchase
      });

      console.log('Payment response:', response.data);

      // Close modal and reset form first
      setShowPaymentModal(false);
      setPaymentAmount('');
      setProofOfPurchase('');
      setSelectedFile(null);

      // Show success alert
      showAlert(
        'success', 
        'Payment Submitted Successfully!', 
        `Your payment amount of ₱${totalAmount.toFixed(2)} has been submitted. The customer will now verify the payment amount before you can complete the errand.`
      );

      // Refresh data immediately and then again after a delay
      console.log('Refreshing payment status after successful submission...');
      await Promise.all([
        fetchMessages(selectedConversation.post.id),
        checkExistingPayment(selectedConversation.post.id)
      ]);
      
      // Also refresh again after a delay to ensure backend has fully processed
      setTimeout(async () => {
        console.log('Second refresh after delay...');
        await checkExistingPayment(selectedConversation.post.id);
        console.log('Second refresh completed');
      }, 1000);

    } catch (err) {
      console.error('Payment submission error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Handle 409 conflict (payment already processed) specially
      if (err.response?.status === 409) {
        // Close modal and reset form
        setShowPaymentModal(false);
        setPaymentAmount('');
        setProofOfPurchase('');
        setSelectedFile(null);
        
        // Show info message instead of error
        showAlert('info', 'Payment Already Processed', 'This payment has already been processed for this errand.');
        
        // Refresh data to show current payment status
        setTimeout(async () => {
          await Promise.all([
            fetchMessages(selectedConversation.post.id),
            checkExistingPayment(selectedConversation.post.id)
          ]);
        }, 500);
      } else {
        // Use enhanced error handling for other errors
        const errorInfo = handlePaymentError(err);
        
        showAlert(
          errorInfo.type,
          errorInfo.title,
          errorInfo.message,
          false // Don't auto-close error messages
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'runner_completed':
      case 'confirmed':
        return 'status-badge status-completed';
      case 'accepted':
        return 'status-badge status-pending';
      case 'pending':
        return 'status-badge status-available';
      default:
        return 'status-badge';
    }
  };

  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'runner_completed':
        return 'completed';
      case 'confirmed':
        return 'confirmed';
      case 'accepted':
        return 'in progress';
      case 'pending':
        return 'available';
      default:
        return status;
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
    <div className="page-container runner-layout inbox-page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Communicate with errand runners and requesters</p>
      </div>

      <div className="inbox-layout">
        {/* Conversations Sidebar */}
        <div className="conversations-panel card">
          <div className="card-header">
            <h2 className="card-title">Conversations</h2>
          </div>
          <div className="card-body conversations-body">
            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {conversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3 className="empty-state-title">No conversations</h3>
                <p className="empty-state-description">
                  Messages will appear here when you accept or post errands.
                </p>
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
                          {getStatusDisplayText(conversation.post.status)}
                        </span>
                      </div>
                      
                      {conversation.post.user && (
                        <p className="runner-info">
                          👤 {conversation.post.user.firstname} {conversation.post.user.lastname}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-panel card">
          {selectedConversation ? (
            <>
              <div className="card-header chat-header">
                <div className="chat-info">
                  <h3 className="chat-title">{selectedConversation.post.content}</h3>
                  <div className="chat-meta">
                    <span className="chat-destination">📍 {selectedConversation.post.destination}</span>
                    <span className={getStatusBadgeClass(selectedConversation.post.status)}>
                      {getStatusDisplayText(selectedConversation.post.status)}
                    </span>
                    
                    {/* Accept Errand button for pending posts */}
                    {selectedConversation.post.status === 'pending' && (
                      <button 
                        className="btn btn-sm"
                        onClick={() => acceptErrand(selectedConversation.post.id)}
                        style={{ 
                          marginLeft: 'auto',
                          background: 'linear-gradient(135deg, #28a745, #20c997)',
                          color: 'white',
                          border: 'none',
                          fontWeight: '600',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #218838, #1aa179)';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
                        }}
                        title="Accept this errand and start working on it"
                      >
                        ✅ Accept Errand
                      </button>
                    )}
                    
                    {/* Mark Complete button for accepted posts */}
                    {selectedConversation.post.status === 'accepted' && (
                      <button 
                        className={`btn btn-sm ${
                          existingPayment && existingPayment.status === 'approved'
                            ? 'btn-success' 
                            : 'btn-danger'
                        }`}
                        onClick={() => markTaskComplete(selectedConversation.post.id)}
                        disabled={!existingPayment || existingPayment.status !== 'approved'}
                        style={{ marginLeft: 'auto' }}
                        title={
                          !existingPayment 
                            ? 'Please provide payment amount first' 
                            : existingPayment.status === 'pending'
                            ? 'Waiting for customer to verify payment' 
                            : existingPayment.status === 'approved'
                            ? 'Mark this errand as completed'
                            : 'Payment not ready for completion'
                        }
                      >
                        {existingPayment && existingPayment.status === 'approved'
                          ? '✅ Mark Complete' 
                          : existingPayment && existingPayment.status === 'pending'
                          ? '⏳ Waiting for Customer Verification'
                          : '💰 Provide Payment First'
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-body chat-body">
                <div className="messages-container custom-scrollbar">
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

                {/* Payment Button - Only show for accepted posts */}
                {selectedConversation.post.status === 'accepted' && (
                  <div key={`payment-${selectedConversation.post.id}-${existingPayment?.id || 'none'}-${refreshCounter}`} style={{ position: 'relative', padding: 'var(--spacing-sm)', borderTop: '1px solid var(--border-light)', background: 'var(--bg-muted)' }}>
                    {(() => {
                      console.log('Rendering payment section for post:', selectedConversation.post.id);
                      console.log('existingPayment state:', existingPayment);
                      console.log('refreshCounter:', refreshCounter);
                      return null;
                    })()}
                    {existingPayment ? (
                      <div className="payment-status-info">
                        <div className="payment-status-header">
                          <span className="payment-status-icon">💰</span>
                          <span className="payment-status-text">
                            Payment Status: 
                            <span className={`payment-status-badge ${existingPayment.status}`}>
                              {existingPayment.status === 'pending' && !existingPayment.payment_verified ? 'Pending Customer Verification' :
                               existingPayment.status === 'approved' && existingPayment.payment_verified ? 'Approved & Verified' :
                               existingPayment.status === 'rejected' ? 'Rejected' : existingPayment.status}
                            </span>
                          </span>
                        </div>
                        <div className="payment-amount-info">
                          Amount: ₱{parseFloat(existingPayment.total_amount).toFixed(2)}
                        </div>
                        

                        
                        {existingPayment.status === 'rejected' ? (
                          <button 
                            className="btn btn-warning btn-sm"
                            onClick={() => setShowPaymentModal(true)}
                            style={{ width: '100%', marginTop: '8px' }}
                          >
                            🔄 Resubmit Payment Amount
                          </button>
                        ) : existingPayment.status === 'pending' && !existingPayment.payment_verified ? (
                          <div className="payment-provided-status" style={{ marginTop: '8px', textAlign: 'center' }}>
                            <div className="status-badge pending" style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              padding: '8px 16px',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              border: '1px solid #ffeaa7',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              ✅ Payment Provided - Waiting for Verification
                            </div>
                          </div>
                        ) : (existingPayment.status === 'approved') ? (
                          <div className="payment-processed-status" style={{ marginTop: '8px', textAlign: 'center' }}>
                            <div className="status-badge processed" style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              padding: '8px 16px',
                              backgroundColor: '#d4edda',
                              color: '#155724',
                              border: '1px solid #c3e6cb',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              ✅ Payment Processed
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => setShowPaymentModal(true)}
                          style={{ width: '100%' }}
                        >
                          💰 Provide Payment Amount
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form className="message-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    maxLength="1000"
                    className="form-input message-input"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="btn btn-primary send-button"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3 className="empty-state-title">Select a conversation</h3>
                <p className="empty-state-description">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content enhanced-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">💰 Provide Payment Amount</h3>
                <div className="progress-indicator">
                  <div className="progress-steps">
                    <div className={`step ${paymentStep >= 1 ? 'active' : ''}`}>1</div>
                    <div className="step-line"></div>
                    <div className={`step ${paymentStep >= 2 ? 'active' : ''}`}>2</div>
                    <div className="step-line"></div>
                    <div className={`step ${paymentStep >= 3 ? 'active' : ''}`}>3</div>
                  </div>
                  <div className="step-labels">
                    <span className={paymentStep === 1 ? 'current' : ''}>Amount</span>
                    <span className={paymentStep === 2 ? 'current' : ''}>Proof</span>
                    <span className={paymentStep === 3 ? 'current' : ''}>Review</span>
                  </div>
                </div>
              </div>
              <button 
                className="modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="step-container">
                
                {/* Step 1: Payment Amount */}
                {paymentStep === 1 && (
                  <div className="step-content step-1">
                    <div className="step-header">
                      <h4>💵 Enter Payment Amount</h4>
                      <p className="step-subtitle">
                        Provide the original amount you spent for this errand
                      </p>
                    </div>
                    
                    <div className="content-section">
                      <div className="form-group-enhanced">
                        <label htmlFor="paymentAmount" className="form-label-enhanced">
                          💱 Original Amount (₱)
                        </label>
                        <div className="input-container">
                          <input
                            type="number"
                            id="paymentAmount"
                            step="0.01"
                            min="0.01"
                            value={paymentAmount}
                            onChange={(e) => {
                              setPaymentAmount(e.target.value);
                              validatePaymentAmount(e.target.value);
                            }}
                            placeholder="0.00"
                            className={`form-input ${validationErrors.amount ? 'error' : ''}`}
                          />
                          <div className="input-icon">₱</div>
                        </div>
                        {validationErrors.amount && (
                          <div className="error-message">{validationErrors.amount}</div>
                        )}
                        {paymentAmount && parseFloat(paymentAmount) > 0 && !validationErrors.amount && (
                          <div className="success-message">✓ Amount looks good!</div>
                        )}
                      </div>
                      
                      {paymentAmount && parseFloat(paymentAmount) > 0 && (
                        <div className="fee-breakdown-card">
                          <h5>📊 Fee Breakdown</h5>
                          <div className="fee-item">
                            <span>Original Amount:</span>
                            <span>₱{parseFloat(paymentAmount).toFixed(2)}</span>
                          </div>
                          <div className="fee-item">
                            <span>Service Fee:</span>
                            <span>₱{calculateServiceFee(paymentAmount).toFixed(2)}</span>
                          </div>
                          <div className="fee-item runner-earnings">
                            <span>Your Earnings (85%):</span>
                            <span>₱{calculateRunnerEarnings(paymentAmount).toFixed(2)}</span>
                          </div>
                          <div className="fee-item platform-commission">
                            <span>Platform Fee (15% - Auto-deducted):</span>
                            <span>₱{calculatePlatformCommission(paymentAmount).toFixed(2)}</span>
                          </div>
                          <div className="fee-item total">
                            <span>Total Customer Payment:</span>
                            <span>₱{(parseFloat(paymentAmount) + calculateServiceFee(paymentAmount)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="info-box">
                        <div className="info-icon">ℹ️</div>
                        <div className="info-text">
                          <p><strong>Payment Structure:</strong> You earn 85% of the service fee (₱{paymentAmount ? calculateRunnerEarnings(paymentAmount).toFixed(2) : '0.00'}) as your profit. 
                          The remaining 15% (₱{paymentAmount ? calculatePlatformCommission(paymentAmount).toFixed(2) : '0.00'}) is automatically deducted as platform commission.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Proof of Purchase */}
                {paymentStep === 2 && (
                  <div className="step-content step-2">
                    <div className="step-header">
                      <h4>📷 Upload Proof of Purchase</h4>
                      <p className="step-subtitle">
                        Upload a clear photo of your receipt or proof of purchase
                      </p>
                    </div>
                    
                    <div className="content-section">
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">
                          📄 Proof of Purchase
                        </label>
                        <div className="file-upload-zone" onClick={() => document.getElementById('proofFile').click()}>
                          {selectedFile ? (
                            <div className="file-preview">
                              <div className="file-info">
                                <div className="file-icon">
                                  {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                                </div>
                                <div className="file-details">
                                  <div className="file-name">{selectedFile.name}</div>
                                  <div className="file-size">{(selectedFile.size / 1024).toFixed(1)}KB</div>
                                  <div className="file-status">✅ Ready to upload</div>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                  setProofOfPurchase('');
                                }}
                                className="remove-file-btn"
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          ) : (
                            <div className="upload-placeholder">
                              <div className="upload-icon">📎</div>
                              <p>Click to upload receipt or proof</p>
                              <small>JPG, PNG, GIF, or PDF (max 5MB)</small>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          id="proofFile"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                        {validationErrors.proof && (
                          <div className="error-message">{validationErrors.proof}</div>
                        )}
                      </div>
                      
                      <div className="upload-tips">
                        <h5>📋 Tips for good proof photos:</h5>
                        <ul>
                          <li>Ensure the receipt is clearly visible and readable</li>
                          <li>Include the store name, date, and total amount</li>
                          <li>Make sure the image is well-lit and not blurry</li>
                          <li>Keep personal information private when possible</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Submit */}
                {paymentStep === 3 && (
                  <div className="step-content step-3">
                    <div className="step-header">
                      <h4>👀 Review Payment Details</h4>
                      <p className="step-subtitle">
                        Please verify all information before submitting
                      </p>
                    </div>
                    
                    <div className="content-section">
                      <div className="review-card">
                        <div className="review-header">
                          <h5>💰 Payment Summary</h5>
                        </div>
                        
                        <div className="review-content">
                          <div className="review-section">
                            <h6>Amount Details</h6>
                            <div className="review-item">
                              <span>Original Amount:</span>
                              <span>₱{paymentAmount ? parseFloat(paymentAmount).toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="review-item">
                              <span>Service Fee:</span>
                              <span>₱{paymentAmount ? calculateServiceFee(paymentAmount).toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="review-item runner-earnings">
                              <span>Your Earnings (85%):</span>
                              <span>₱{paymentAmount ? calculateRunnerEarnings(paymentAmount).toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="review-item platform-commission">
                              <span>Errands Balance (15% - Due for Payment):</span>
                              <span>₱{paymentAmount ? calculatePlatformCommission(paymentAmount).toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="review-item total">
                              <span>Total Customer Payment:</span>
                              <span>₱{paymentAmount ? (parseFloat(paymentAmount) + calculateServiceFee(paymentAmount)).toFixed(2) : '0.00'}</span>
                            </div>
                          </div>
                          
                          <div className="review-section">
                            <h6>Proof of Purchase</h6>
                            <div className="proof-preview">
                              {selectedFile ? (
                                <div className="proof-file-display">
                                  <div className="file-icon-large">
                                    {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                                  </div>
                                  <div className="file-info-display">
                                    <p><strong>File:</strong> {selectedFile.name}</p>
                                    <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)}KB</p>
                                    <p><strong>Type:</strong> {selectedFile.type.split('/')[1].toUpperCase()}</p>
                                  </div>
                                </div>
                              ) : (
                                <p>No file selected</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="final-disclaimer">
                        <div className="disclaimer-icon">⚠️</div>
                        <div className="disclaimer-text">
                          <p><strong>Important:</strong> By submitting this payment request, you confirm that all information is accurate. 
                          False information may result in account restrictions.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            <div className="modal-footer">
              <div className="footer-buttons">
                {paymentStep > 1 && (
                  <button className="btn-secondary" onClick={handlePaymentPrevious}>
                    ← Previous
                  </button>
                )}
                
                <div className="footer-right">
                  <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </button>
                  
                  {paymentStep < 3 ? (
                    <button 
                      className="btn-primary" 
                      onClick={handlePaymentNext}
                      disabled={
                        (paymentStep === 1 && (!paymentAmount || parseFloat(paymentAmount) <= 0 || validationErrors.amount)) ||
                        (paymentStep === 2 && (!selectedFile || !proofOfPurchase))
                      }
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      className={`btn-submit ${isSubmitting ? 'loading' : ''}`}
                      onClick={submitPaymentAmount}
                      disabled={!paymentAmount || !proofOfPurchase || isSubmitting || validationErrors.amount}
                    >
                      {isSubmitting ? '⏳ Submitting...' : '🚀 Submit Payment'}
                    </button>
                  )}
                </div>
              </div>
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

export default RunnerInbox;
