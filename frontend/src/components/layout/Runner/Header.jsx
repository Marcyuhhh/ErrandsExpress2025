import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../../assets/ErrandsLogo.png';
import logo2 from '../../../assets/RunnersLogo.png';
import axiosInstance from '../../../api/axiosInstance';
import '../layout.css';

function Rheader() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isRunnerMode = location.pathname.startsWith('/runner');
  const [currentLogo, setCurrentLogo] = useState(isRunnerMode ? logo2 : logo);
  const [userName, setUserName] = useState('User');
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData?.name) {
      setUserName(userData.name);
    }
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axiosInstance.get('/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data.user;
      if (user.profile_picture) {
        setProfileImage(user.profile_picture);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleModeSwitch = () => {
    setIsTransitioning(true);
    setTimeout(() => setCurrentLogo(isRunnerMode ? logo : logo2), 1000);
    setTimeout(() => navigate(isRunnerMode ? '/home' : '/runner'), 2500);
  };

  return (
    <div className="runner-header-container">
      <header className="runner-header">
        <div className="runner-header-left" onClick={() => navigate(isRunnerMode ? '/runner' : '/home')} style={{ cursor: 'pointer' }}>
          <img src={currentLogo} alt="Errands Logo" className="runner-header-logo" />
          <h1 className="runner-header-title">Errands Express</h1>
        </div>

        <div className="runner-header-right">
          <span className="runner-mode-switch" onClick={handleModeSwitch}>
            {isRunnerMode ? 'Customer Mode' : 'Runner Mode'}
          </span>

          <div className="runner-profile-info">
            <div className="runner-profile-circle">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="runner-profile-image" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="runner-profile-name">{userName}</div>
          </div>

          {/* This hamburger is ONLY for dropdown menu */}
          <button className="runner-hamburger-btn" onClick={toggleDropdown}>
            ☰
          </button>

          {dropdownOpen && (
            <div className="runner-dropdown-menu">
              <ul>
                <li onClick={() => navigate(isRunnerMode ? '/runner' : '/home')}>Home</li>
                <li onClick={() => navigate(isRunnerMode ? '/runner/settings' : '/settings')}>Settings</li>
                <li onClick={handleLogout}>Log Out</li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {isTransitioning && (
        <div className="runner-transition">
          <img src={currentLogo} className="runner-transition-logo" alt="Flipping Logo" />
        </div>
      )}
    </div>
  );
}

export default Rheader;