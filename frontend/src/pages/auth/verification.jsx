import { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import './verification-formal.css';

function VerificationModal({ closeModal, showSuccess, formData }) {
  const [uploads, setUploads] = useState({ idPic: null, facePic: null });
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstname: formData?.firstname || '',
    lastname: formData?.lastname || '',
    middle_initial: '',
    school_id_no: ''
  });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Image size must be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress and resize image
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 800px)
          const maxSize = 800;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to compressed base64
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setUploads(prev => ({
            ...prev,
            [name]: compressedDataUrl
          }));
          setUploadError(''); // Clear any previous errors
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileDataChange = (e) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUploadSubmit = async () => {
    // Validation
    if (!uploads.idPic || !uploads.facePic) {
      setUploadError('Please upload both ID and Profile pictures.');
      return;
    }

    if (!profileData.firstname.trim() || !profileData.lastname.trim() || !profileData.school_id_no.trim()) {
      setUploadError('Please fill in all required profile information.');
      return;
    }

    setLoading(true);
    setUploadError('');

    try {
      // Prepare registration data
      const registrationData = {
        name: formData.name,
        firstname: profileData.firstname.trim(),
        lastname: profileData.lastname.trim(),
        middle_initial: profileData.middle_initial.trim(),
        email: formData.email,
        password: formData.password,
        birthdate: formData.birthdate,
        school_id_no: profileData.school_id_no.trim(),
        verification_image: uploads.idPic,
        profile_picture: uploads.facePic,
        is_verified: false
      };

      console.log('Submitting registration data...');
      const response = await axiosInstance.post('/register', registrationData);
      
      console.log('Registration successful:', response.data);
      showSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Failed to submit verification. Please try again.';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verification-modal-overlay">
      <div className="verification-modal-container">
        <div className="verification-modal-header">
          <h2>Complete Your Profile</h2>
          <button className="verification-close-btn" onClick={closeModal}>×</button>
        </div>
        
        <div className="verification-modal-content">
          <p className="verification-intro">
            Please complete your profile information and upload verification photos to create your account.
          </p>

          <div className="verification-section">
            <h3>Profile Information</h3>
            <div className="verification-form-grid">
              <div className="verification-input-group">
                <label htmlFor="firstname">First Name *</label>
                <input
                  type="text"
                  id="firstname"
                  name="firstname"
                  value={profileData.firstname}
                  onChange={handleProfileDataChange}
                  placeholder="Enter first name"
                  required
                />
              </div>
              
              <div className="verification-input-group">
                <label htmlFor="lastname">Last Name *</label>
                <input
                  type="text"
                  id="lastname"
                  name="lastname"
                  value={profileData.lastname}
                  onChange={handleProfileDataChange}
                  placeholder="Enter last name"
                  required
                />
              </div>
              
              <div className="verification-input-group">
                <label htmlFor="middle_initial">Middle Initial</label>
                <input
                  type="text"
                  id="middle_initial"
                  name="middle_initial"
                  value={profileData.middle_initial}
                  onChange={handleProfileDataChange}
                  placeholder="Optional"
                  maxLength={5}
                />
              </div>
              
              <div className="verification-input-group">
                <label htmlFor="school_id_no">School ID Number *</label>
                <input
                  type="text"
                  id="school_id_no"
                  name="school_id_no"
                  value={profileData.school_id_no}
                  onChange={handleProfileDataChange}
                  placeholder="Enter school ID"
                  required
                />
              </div>
            </div>
          </div>

          <div className="verification-section">
            <h3>Verification Photos</h3>
            <div className="verification-upload-grid">
              <div className="verification-upload-group">
                <label htmlFor="idPic">ID Picture *</label>
                <div className="verification-upload-area">
                  <input 
                    type="file" 
                    id="idPic"
                    name="idPic" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    required 
                  />
                  <div className="verification-upload-info">
                    <span>📄 Upload clear photo of your ID</span>
                    {uploads.idPic && <span className="verification-file-success">✓ Uploaded</span>}
                  </div>
                </div>
              </div>

              <div className="verification-upload-group">
                <label htmlFor="facePic">Profile Picture *</label>
                <div className="verification-upload-area">
                  <input 
                    type="file" 
                    id="facePic"
                    name="facePic" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    required 
                  />
                  <div className="verification-upload-info">
                    <span>📸 Upload a clear photo of yourself</span>
                    {uploads.facePic && <span className="verification-file-success">✓ Uploaded</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="verification-error">
              {uploadError}
            </div>
          )}
        </div>

        <div className="verification-modal-footer">
          <button 
            type="button" 
            className="verification-submit-btn" 
            onClick={handleUploadSubmit}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
          
          <p className="verification-note">
            Your account will be reviewed by an administrator before you can log in.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerificationModal;
