import { useState } from 'react';

function SignUpForm({ openUploadModal }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    // Extract firstname and lastname from full name
    const nameParts = formData.name.trim().split(' ');
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';

    const registrationData = {
      name: formData.name,
      firstname: firstname,
      lastname: lastname,
      email: formData.email,
      password: formData.password,
      birthdate: formData.birthdate,
    };

    setError('');
    
    // Open the upload modal with the form data
    openUploadModal(registrationData);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Enter your full name"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="birthdate">Birthdate</label>
        <input
          type="date"
          id="birthdate"
          name="birthdate"
          value={formData.birthdate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email address"
          autoComplete="username"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="password">Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            required
          />
          <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <span className="eye-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? '🙈' : '👁️'}
          </span>
        </div>
      </div>

      {error && <p className="error-text" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <button type="submit" style={{ marginTop: '20px' }}>Continue to Verification</button>
      
      <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '10px' }}>
        Next step: Complete profile information and upload verification photos.
      </p>
    </form>
  );
}

export default SignUpForm;
