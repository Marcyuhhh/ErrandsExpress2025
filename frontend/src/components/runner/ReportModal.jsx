import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axiosInstance from '../../api/axiosInstance';
import './ReportModal.css';

const ReportModal = ({ show, postId, customerName, reportedUserId, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState({
    type: 'inappropriate_content',
    description: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reportTextareaRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setCurrentStep(1);
      setReportData({
        type: 'inappropriate_content',
        description: ''
      });
      setValidationErrors({});
      setIsSubmitting(false);
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

  const validateDescription = () => {
    const errors = {};
    
    if (!reportData.description.trim()) {
      errors.description = 'Please describe why you\'re reporting this post';
    } else if (reportData.description.trim().length < 10) {
      errors.description = 'Please provide more details (at least 10 characters)';
    } else if (reportData.description.trim().length > 1000) {
      errors.description = 'Description is too long (maximum 1000 characters)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDescriptionChange = (value) => {
    setReportData(prev => ({ ...prev, description: value }));
    validateDescription();
  };

  const handleTypeChange = (type) => {
    setReportData(prev => ({ ...prev, type }));
  };

  const handleNext = () => {
    setCurrentStep(2);
    // Auto-focus after step change
    setTimeout(() => {
      if (reportTextareaRef.current) {
        reportTextareaRef.current.focus();
      }
    }, 100);
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateDescription() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await axiosInstance.post('/reports', {
        post_id: postId,
        reported_user_id: reportedUserId,
        type: reportData.type,
        description: reportData.description.trim(),
      });

      // Success - close modal and reset
      onClose();
      alert('Report submitted successfully. We will review it and take appropriate action.');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      inappropriate_content: '🚫',
      spam: '📧',
      harassment: '😠',
      fraud: '💰',
      other: '❓'
    };
    return icons[type] || '❓';
  };

  const getReportTypeName = (type) => {
    const names = {
      inappropriate_content: 'Inappropriate Content',
      spam: 'Spam',
      harassment: 'Harassment',
      fraud: 'Fraud',
      other: 'Other'
    };
    return names[type] || 'Other';
  };

  const getReportTypeDescription = (type) => {
    const descriptions = {
      inappropriate_content: 'Contains offensive, harmful, or inappropriate material',
      spam: 'Repetitive, unwanted, or promotional content',
      harassment: 'Bullying, threats, or targeted harassment',
      fraud: 'Scam, fake information, or fraudulent activity',
      other: 'Something else that violates community guidelines'
    };
    return descriptions[type] || 'Something else that violates community guidelines';
  };

  if (!show) return null;

  return createPortal(
    <div className="report-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    }}>
      <div className="report-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-header-content">
            <h2 className="report-modal-title">
              <span className="report-modal-icon">⚠️</span>
              Report Post by {customerName}
            </h2>
            <div className="report-progress-indicator">
              <div className="report-progress-steps">
                <div className={`report-step ${currentStep >= 1 ? 'active' : ''}`}>
                  <span>1</span>
                </div>
                <div className="report-step-line"></div>
                <div className={`report-step ${currentStep >= 2 ? 'active' : ''}`}>
                  <span>2</span>
                </div>
              </div>
              <div className="report-step-labels">
                <span className={currentStep === 1 ? 'current' : ''}>Category</span>
                <span className={currentStep === 2 ? 'current' : ''}>Details</span>
              </div>
            </div>
          </div>
          <button 
            className="report-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="report-modal-body">
          {/* Step 1: Report Category */}
          {currentStep === 1 && (
            <div className="report-step-content">
              <div className="report-step-header">
                <h3>🔍 What's the issue?</h3>
                <p className="report-step-subtitle">
                  Select the category that best describes the problem
                </p>
              </div>
              
              <div className="report-content-section">
                <div className="report-categories">
                  {['inappropriate_content', 'spam', 'harassment', 'fraud', 'other'].map((type) => (
                    <label 
                      key={type}
                      className={`report-option ${reportData.type === type ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        value={type}
                        checked={reportData.type === type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                      />
                      <div className="report-option-content">
                        <div className="report-option-icon">
                          {getReportTypeIcon(type)}
                        </div>
                        <div className="report-option-text">
                          <h4>{getReportTypeName(type)}</h4>
                          <p>{getReportTypeDescription(type)}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Report Details */}
          {currentStep === 2 && (
            <div className="report-step-content">
              <div className="report-step-header">
                <h3>📝 Provide Details</h3>
                <p className="report-step-subtitle">
                  Help us understand the issue with additional details
                </p>
              </div>
              
              <div className="report-content-section">
                <div className="report-selected-category">
                  <h4>Selected Category:</h4>
                  <div className="report-category-display">
                    <span className="report-category-icon">
                      {getReportTypeIcon(reportData.type)}
                    </span>
                    <span className="report-category-name">
                      {getReportTypeName(reportData.type)}
                    </span>
                  </div>
                </div>
                
                <div className="report-form-group">
                  <label htmlFor="reportDescription" className="report-form-label">
                    📄 Description
                  </label>
                  <div className="report-textarea-container">
                    <textarea
                      ref={reportTextareaRef}
                      id="reportDescription"
                      value={reportData.description}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Please describe the specific issue you've encountered..."
                      rows="6"
                      className={`report-textarea ${validationErrors.description ? 'error' : ''}`}
                      disabled={isSubmitting}
                    />
                    <div className="report-char-counter">
                      {reportData.description.length}/1000
                    </div>
                  </div>
                  {validationErrors.description && (
                    <div className="report-error-message">{validationErrors.description}</div>
                  )}
                  {reportData.description.length >= 10 && !validationErrors.description && (
                    <div className="report-success-message">✓ Description looks detailed!</div>
                  )}
                </div>
                
                <div className="report-disclaimer">
                  <div className="report-disclaimer-icon">ℹ️</div>
                  <div className="report-disclaimer-text">
                    <p><strong>Important:</strong> False reports may result in account restrictions. 
                    Please only report content that genuinely violates our community guidelines.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="report-modal-footer">
          <div className="report-footer-buttons">
            {currentStep > 1 && (
              <button 
                className="report-btn report-btn-secondary" 
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                ← Previous
              </button>
            )}
            
            <div className="report-footer-right">
              <button 
                className="report-btn report-btn-secondary" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              
              {currentStep < 2 ? (
                <button 
                  className="report-btn report-btn-primary" 
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="report-btn report-btn-danger"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !reportData.description.trim() || validationErrors.description}
                >
                  {isSubmitting ? '⏳ Submitting...' : '🚨 Submit Report'}
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

export default ReportModal; 