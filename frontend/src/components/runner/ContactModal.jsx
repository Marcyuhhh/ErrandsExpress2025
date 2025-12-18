import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosInstance from '../../api/axiosInstance';
import './ContactModal.css';

const ContactModal = ({ show, postId, customerName, customerId, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageTextareaRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setCurrentStep(1);
      setMessage('');
      setValidationErrors({});
      setIsSubmitting(false);
      
      // Auto-focus after modal opens
      setTimeout(() => {
        if (messageTextareaRef.current) {
          messageTextareaRef.current.focus();
        }
      }, 100);
    }
  }, [show]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [show]);

  const validateMessage = (value) => {
    const errors = { ...validationErrors };
    
    if (!value.trim()) {
      errors.message = 'Message is required';
    } else if (value.trim().length < 10) {
      errors.message = 'Please provide more details (at least 10 characters)';
    } else if (value.trim().length > 500) {
      errors.message = 'Message is too long (maximum 500 characters)';
    } else {
      delete errors.message;
    }
    
    setValidationErrors(errors);
    return !errors.message;
  };

  const handleMessageChange = (value) => {
    setMessage(value);
    validateMessage(value);
  };

  const handleNext = () => {
    if (validateMessage(message)) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateMessage(message) || isSubmitting) {
      return;
    }

    if (!customerId) {
      alert('Error: Customer information not available. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      await axiosInstance.post('/messages', {
        post_id: postId,
        receiver_id: customerId,
        message: message.trim(),
      });

      // Success - close modal and reset
      onClose();
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!show) return null;

  return createPortal(
    <div className="contact-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    }}>
      <div className="contact-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="contact-modal-header">
          <div className="contact-modal-header-content">
            <h2 className="contact-modal-title">
              <span className="contact-modal-icon">💬</span>
              Contact {customerName}
            </h2>
            <div className="contact-progress-indicator">
              <div className="contact-progress-steps">
                <div className={`contact-step ${currentStep >= 1 ? 'active' : ''}`}>
                  <span>1</span>
                </div>
                <div className="contact-step-line"></div>
                <div className={`contact-step ${currentStep >= 2 ? 'active' : ''}`}>
                  <span>2</span>
                </div>
              </div>
              <div className="contact-step-labels">
                <span className={currentStep === 1 ? 'current' : ''}>Compose</span>
                <span className={currentStep === 2 ? 'current' : ''}>Review & Send</span>
              </div>
            </div>
          </div>
          <button 
            className="contact-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="contact-modal-body">
          {/* Step 1: Compose Message */}
          {currentStep === 1 && (
            <div className="contact-step-content">
              <div className="contact-step-header">
                <h3>✍️ Compose Your Message</h3>
                <p className="contact-step-subtitle">
                  Send a message to negotiate or ask questions before accepting this errand
                </p>
              </div>
              
              <div className="contact-content-section">
                <div className="contact-form-group">
                  <label htmlFor="contactMessage" className="contact-form-label">
                    📝 Your Message
                  </label>
                  <div className="contact-textarea-container">
                    <textarea
                      ref={messageTextareaRef}
                      id="contactMessage"
                      value={message}
                      onChange={(e) => handleMessageChange(e.target.value)}
                      placeholder="Hi! I'm interested in your errand. Could you provide more details about..."
                      rows="6"
                      className={`contact-textarea ${validationErrors.message ? 'error' : ''}`}
                      disabled={isSubmitting}
                    />
                    <div className="contact-char-counter">
                      {message.length}/500
                    </div>
                  </div>
                  {validationErrors.message && (
                    <div className="contact-error-message">{validationErrors.message}</div>
                  )}
                  {message.length >= 10 && !validationErrors.message && (
                    <div className="contact-success-message">✓ Message looks good!</div>
                  )}
                </div>
                
                <div className="contact-tips">
                  <h4>💡 Tips for effective communication:</h4>
                  <ul>
                    <li>Ask specific questions about the task</li>
                    <li>Clarify timeline and expectations</li>
                    <li>Discuss payment details if needed</li>
                    <li>Be professional and friendly</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review & Send */}
          {currentStep === 2 && (
            <div className="contact-step-content">
              <div className="contact-step-header">
                <h3>👀 Review Your Message</h3>
                <p className="contact-step-subtitle">
                  Make sure everything looks good before sending
                </p>
              </div>
              
              <div className="contact-content-section">
                <div className="contact-review-card">
                  <div className="contact-review-header">
                    <div className="contact-customer-info">
                      <div className="contact-customer-avatar">
                        {customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="contact-customer-name">To: {customerName}</p>
                        <p className="contact-message-type">💬 Contact Message</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="contact-message-preview">
                    <h4>Your message:</h4>
                    <div className="contact-message-bubble">
                      {message}
                    </div>
                    <div className="contact-message-stats">
                      <span>{message.length} characters</span>
                      <span>•</span>
                      <span>~{Math.ceil(message.split(' ').length / 200)} min read</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="contact-modal-footer">
          <div className="contact-footer-buttons">
            {currentStep > 1 && (
              <button 
                className="contact-btn contact-btn-secondary" 
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                ← Previous
              </button>
            )}
            
            <div className="contact-footer-right">
              <button 
                className="contact-btn contact-btn-secondary" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              
              {currentStep < 2 ? (
                <button 
                  className="contact-btn contact-btn-primary" 
                  onClick={handleNext}
                  disabled={!message.trim() || message.length < 10 || isSubmitting}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="contact-btn contact-btn-submit"
                  onClick={handleSubmit}
                  disabled={!message.trim() || validationErrors.message || isSubmitting}
                >
                  {isSubmitting ? '⏳ Sending...' : '📨 Send Message'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ContactModal; 