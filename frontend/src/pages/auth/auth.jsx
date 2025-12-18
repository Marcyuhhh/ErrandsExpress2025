import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import './verification.css';
import Lnavbar from '../../components/layout/Landing/Navbar';
import SignInForm from './signIn';
import SignUpForm from './signUp';
import VerificationModal from './verification';

function Auth() {
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const [isSignUp, setIsSignUp] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/home');
  };

  return (
    <div className='Auth'>
      <Lnavbar />
      <div className="auth-wrapper" >
        <div className="auth-box">
          <h1 className='auth_title'>{isSignUp ? 'Welcome!' : 'Welcome Back!'}</h1>
          <div className="toggle-auth-container">
            <span className="toggle-text">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="toggle-auth-btn"
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </button>
          </div>

          {isSignUp ? (
            <SignUpForm
              onSuccess={handleSuccess}
              openUploadModal={(data) => {
                setPendingUserData(data);
                setShowUploadModal(true);
              }}
            />
          ) : (
            <SignInForm onSuccess={handleSuccess} />
          )}
        </div>
      </div>

      {showUploadModal && (
        <VerificationModal
          closeModal={() => setShowUploadModal(false)}
          showSuccess={() => {
            setShowUploadModal(false);
            setShowSuccessModal(true);
          }}
          formData={pendingUserData}
        />
      )}

      {showSuccessModal && (
        <div className="verification-modal-overlay">
          <div className="verification-modal-container">
            <div className="verification-modal-header">
              <h2>Registration Successful!</h2>
              <button className="verification-close-btn" onClick={() => setShowSuccessModal(false)}>×</button>
            </div>
            <div className="verification-modal-content">
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#495057' }}>
                  Your registration has been submitted successfully! 
                  Please wait for an administrator to review and approve your account.
                </p>
                <p style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '15px' }}>
                  You will receive a notification once your account has been verified.
                </p>
              </div>
            </div>
            <div className="verification-modal-footer">
              <button 
                className="verification-submit-btn"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/auth');
                }}
              >
                Continue to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Auth;