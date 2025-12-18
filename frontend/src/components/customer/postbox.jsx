import React, { useState, useRef, useEffect } from 'react';
import './postbox.css';

function Postbox({ show, onClose, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [postData, setPostData] = useState({
    content: '',
    deadlineDate: '',
    deadlineTime: '',
    destination: '',
    imageUrl: '',
  });

  const [username, setUsername] = useState('User');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.name) {
      setUsername(userData.name);
    }
  }, []);

  useEffect(() => {
    if (show && currentStep === 1 && textareaRef.current) {
      // Auto-focus on content when modal opens
      setTimeout(() => textareaRef.current.focus(), 100);
    }
  }, [show, currentStep]);

  const firstLetter = username.charAt(0).toUpperCase();

  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'content':
        if (!value.trim()) {
          errors.content = 'Task description is required';
        } else if (value.trim().length < 10) {
          errors.content = 'Please provide more details (at least 10 characters)';
        } else {
          delete errors.content;
        }
        break;
      case 'destination':
        if (!value.trim()) {
          errors.destination = 'Destination is required';
        } else if (value.trim().length < 3) {
          errors.destination = 'Please enter a valid destination';
        } else {
          delete errors.destination;
        }
        break;
      case 'deadlineDate':
        if (!value) {
          errors.deadlineDate = 'Due date is required';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            errors.deadlineDate = 'Due date cannot be in the past';
          } else {
            delete errors.deadlineDate;
          }
        }
        break;
      case 'deadlineTime':
        if (!value) {
          errors.deadlineTime = 'Due time is required';
        } else {
          delete errors.deadlineTime;
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPostData({ ...postData, [name]: value });
    validateField(name, value);
  };

  const canProceedToStep2 = () => {
    return postData.content.trim().length >= 10 && !validationErrors.content;
  };

  const canProceedToStep3 = () => {
    return postData.destination.trim().length >= 3 && !validationErrors.destination;
  };

  const isFormComplete = () => {
    return postData.content.trim() &&
           postData.destination.trim() &&
           postData.deadlineDate &&
           postData.deadlineTime &&
           Object.keys(validationErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3()) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const allFieldsValid = 
      validateField('content', postData.content) &&
      validateField('destination', postData.destination) &&
      validateField('deadlineDate', postData.deadlineDate) &&
      validateField('deadlineTime', postData.deadlineTime);

    if (!allFieldsValid) {
      return;
    }

    // Format date as YYYY-MM-DD for database
    const formattedDate = postData.deadlineDate;
    
    // Format time as HH:MM:SS for database (adding seconds if not present)
    const formattedTime = postData.deadlineTime.includes(':') 
      ? (postData.deadlineTime.split(':').length === 2 
          ? postData.deadlineTime + ':00'
          : postData.deadlineTime)
      : postData.deadlineTime;

    const newPostData = {
      content: postData.content,
      deadlineDate: formattedDate,
      deadlineTime: formattedTime,
      destination: postData.destination,
      imageUrl: postData.imageUrl || null,
    };

    // Pass the post data to parent component to handle API call
    onSubmit(newPostData);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(1);
    setPostData({
      content: '',
      deadlineDate: '',
      deadlineTime: '',
      destination: '',
      imageUrl: '',
    });
    setValidationErrors({});
    onClose();
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      // Validate file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB.');
        return;
      }

      setIsImageLoading(true);
      compressImage(file, (compressedDataUrl) => {
        setPostData((prevData) => ({
          ...prevData,
          imageUrl: compressedDataUrl,
        }));
        setIsImageLoading(false);
      });
    }
  };

  const compressImage = (file, callback) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions (max width/height: 1200px)
        const maxSize = 1200;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression (0.8 = 80% quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        callback(compressedDataUrl);
      } catch (error) {
        console.error('Error compressing image:', error);
        setIsImageLoading(false);
        alert('Failed to process image. Please try a different image.');
      }
    };

    img.onerror = () => {
      console.error('Error loading image');
      setIsImageLoading(false);
      alert('Failed to load image. Please try a different image.');
    };

    img.src = URL.createObjectURL(file);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay2">
      <div className="modal-box2">
        <header className="modal-header">
          <div className="modal-header-content">
            <h3 className="create-post-title">✨ Create New Errand</h3>
            <div className="progress-indicator">
              <div className="progress-steps">
                <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
                <div className="step-line"></div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
                <div className="step-line"></div>
                <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
              </div>
              <div className="step-labels">
                <span className={currentStep === 1 ? 'current' : ''}>Describe</span>
                <span className={currentStep === 2 ? 'current' : ''}>Location</span>
                <span className={currentStep === 3 ? 'current' : ''}>Schedule</span>
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="close-btn">×</button>
        </header>

        <div className="modal-body">
          <div className="step-container">
            
            {/* Step 1: Task Description */}
            {currentStep === 1 && (
              <div className="step-content step-1">
                <div className="step-header">
                  <div className="user-info-card">
                    <div className="profile-circle">{firstLetter}</div>
                    <div className="user-details">
                      <p className="username">{username}</p>
                      <p className="user-subtitle">What do you need help with?</p>
                    </div>
                  </div>
                </div>
                
                <div className="content-section">
                  <div className="form-group-enhanced">
                    <label htmlFor="content" className="form-label-enhanced">
                      📝 Describe your task
                    </label>
                    <div className="textarea-container">
                      <textarea
                        ref={textareaRef}
                        name="content"
                        id="content"
                        placeholder="Example: Pick up groceries from the supermarket, need milk, bread, and eggs..."
                        value={postData.content}
                        onChange={handleChange}
                        className={validationErrors.content ? 'error' : ''}
                      />
                      <div className="char-counter">
                        {postData.content.length}/500
                      </div>
                    </div>
                    {validationErrors.content && (
                      <div className="error-message">{validationErrors.content}</div>
                    )}
                    {postData.content.length >= 10 && (
                      <div className="success-message">✓ Great! Your description looks good</div>
                    )}
                  </div>

                  {/* Optional Image Upload in Step 1 */}
                  <div className="form-group-enhanced optional-section">
                    <label className="form-label-enhanced optional">
                      📷 Add an image (optional)
                    </label>
                    <div className="image-upload-zone" onClick={handleFileClick}>
                      {isImageLoading ? (
                        <div className="loading-state">
                          <div className="spinner"></div>
                          <p>Processing image...</p>
                        </div>
                      ) : postData.imageUrl ? (
                        <div className="image-preview-card">
                          <img src={postData.imageUrl} alt="Preview" />
                          <div className="image-overlay">
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostData(prev => ({ ...prev, imageUrl: '' }));
                              }}
                              className="remove-image-btn"
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <div className="upload-icon">📎</div>
                          <p>Click to add an image</p>
                          <small>Supports JPG, PNG up to 10MB</small>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Destination */}
            {currentStep === 2 && (
              <div className="step-content step-2">
                <div className="step-header">
                  <h4>📍 Where should this be done?</h4>
                  <p className="step-subtitle">Specify the location for your errand</p>
                </div>
                
                <div className="content-section">
                  <div className="form-group-enhanced">
                    <label htmlFor="destination" className="form-label-enhanced">
                      Destination Address
                    </label>
                    <div className="input-container">
                      <input
                        type="text"
                        name="destination"
                        id="destination"
                        placeholder="Enter street address, landmark, or area"
                        value={postData.destination}
                        onChange={handleChange}
                        className={validationErrors.destination ? 'error' : ''}
                      />
                      <div className="input-icon">🎯</div>
                    </div>
                    {validationErrors.destination && (
                      <div className="error-message">{validationErrors.destination}</div>
                    )}
                    {postData.destination.length >= 3 && !validationErrors.destination && (
                      <div className="success-message">✓ Location looks good!</div>
                    )}
                  </div>

                  {/* Task Summary Preview */}
                  <div className="task-preview">
                    <h5>📋 Task Summary</h5>
                    <div className="preview-content">
                      <p><strong>What:</strong> {postData.content}</p>
                      <p><strong>Where:</strong> {postData.destination || 'Not specified yet'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Schedule & Final Review */}
            {currentStep === 3 && (
              <div className="step-content step-3">
                <div className="step-header">
                  <h4>⏰ When do you need this done?</h4>
                  <p className="step-subtitle">Set your deadline</p>
                </div>
                
                <div className="content-section">
                  <div className="datetime-container">
                    <div className="form-group-enhanced half-width">
                      <label htmlFor="deadlineDate" className="form-label-enhanced">
                        📅 Due Date
                      </label>
                      <input
                        type="date"
                        name="deadlineDate"
                        id="deadlineDate"
                        value={postData.deadlineDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className={validationErrors.deadlineDate ? 'error' : ''}
                      />
                      {validationErrors.deadlineDate && (
                        <div className="error-message">{validationErrors.deadlineDate}</div>
                      )}
                    </div>

                    <div className="form-group-enhanced half-width">
                      <label htmlFor="deadlineTime" className="form-label-enhanced">
                        🕐 Due Time
                      </label>
                      <input
                        type="time"
                        name="deadlineTime"
                        id="deadlineTime"
                        value={postData.deadlineTime}
                        onChange={handleChange}
                        className={validationErrors.deadlineTime ? 'error' : ''}
                      />
                      {validationErrors.deadlineTime && (
                        <div className="error-message">{validationErrors.deadlineTime}</div>
                      )}
                    </div>
                  </div>

                  {/* Final Review Card */}
                  <div className="final-review">
                    <h5>📝 Review Your Errand</h5>
                    <div className="review-card">
                      <div className="review-item">
                        <span className="review-label">Task:</span>
                        <span className="review-value">{postData.content}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Location:</span>
                        <span className="review-value">{postData.destination}</span>
                      </div>
                      <div className="review-item">
                        <span className="review-label">Due:</span>
                        <span className="review-value">
                          {postData.deadlineDate && postData.deadlineTime ? 
                            `${new Date(postData.deadlineDate).toLocaleDateString()} at ${postData.deadlineTime}` :
                            'Not set'
                          }
                        </span>
                      </div>
                      {postData.imageUrl && (
                        <div className="review-item">
                          <span className="review-label">Image:</span>
                          <span className="review-value">📎 Image attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-buttons">
            {currentStep > 1 && (
              <button className="btn-secondary" onClick={handlePrevious}>
                ← Previous
              </button>
            )}
            
            <div className="footer-right">
              {currentStep < 3 ? (
                <button 
                  className="btn-primary" 
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedToStep2()) ||
                    (currentStep === 2 && !canProceedToStep3())
                  }
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={!isFormComplete()}
                >
                  🚀 Post Errand
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Postbox;
