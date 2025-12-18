import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

function SignInForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Check if this is an admin login
      const isAdminEmail = formData.email === 'admin@errandsexpress.com';
      const loginEndpoint = isAdminEmail ? '/admin/login' : '/login';

      console.log('Using endpoint:', loginEndpoint);

      const response = await axiosInstance.post(loginEndpoint, {
        email: formData.email,
        password: formData.password
      });

      const { token, user, profile_complete, requires_verification } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('Login successful, token stored:', !!token);
      console.log('User data:', user);
      console.log('Profile complete:', profile_complete);
      console.log('Requires verification:', requires_verification);

      // Check if user is admin
      if (user.is_admin) {
        console.log('Redirecting to admin panel');
        navigate('/verify'); // Admin panel
      } else {
        // Check verification status for regular users
        if (!user.is_verified) {
          setError('Your account is pending verification by an administrator. Please wait for approval before logging in.');
          // Clear stored data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return;
        }

        console.log('Redirecting to user home');
        navigate('/home'); // Regular user home
      }

    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Login failed");
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="username"
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
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
          <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>
      </div>

      <div className="input-group remember-me-group">
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={() => setRememberMe(!rememberMe)}
        />
        <label htmlFor="rememberMe">Remember Me</label>
      </div>

      {error && <p className="error-text" style={{color: 'red', textAlign: 'center'}}>{error}</p>}

      <button type="submit">Log In</button>
    </form>
  );
}

export default SignInForm;
