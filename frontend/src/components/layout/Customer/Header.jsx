import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/ErrandsLogo.png';
import logo2 from '../../../assets/RunnersLogo.png';
import axiosInstance from '../../../api/axiosInstance';
import '../layout.css';

function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logo);
  const [username, setUsername] = useState('User');
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.name) {
      setUsername(userData.name);
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
    navigate('/');
  };

  const handleRunnerModeClick = () => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentLogo(logo2);
    }, 1000);

    setTimeout(() => {
      navigate('/runner');
    }, 2500);
  };

  const firstLetter = username.charAt(0).toUpperCase();

  return (
    <div className="customer-header-container">
      <header className="customer-header">
        <div
          className="customer-header-left"
          onClick={() => navigate('/home')}
          style={{ cursor: 'pointer' }}
        >
          <img src={logo} alt="Errands Logo" className="customer-header-logo" />
          <h1 className="customer-header-title">Errands Express</h1>
        </div>

        <div className="customer-header-right">
          <a className="customer-mode-link" onClick={handleRunnerModeClick} style={{ cursor: 'pointer' }}>
            Runner Mode
          </a>

          <div className="customer-profile-info">
            <div className="customer-profile-circle">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="customer-profile-image" />
              ) : (
                firstLetter
              )}
            </div>
            <span className="customer-profile-name">{username}</span>
          </div>

          {/* This hamburger is ONLY for dropdown menu (settings/logout) */}
          <button className="customer-hamburger-btn" onClick={toggleDropdown}>
            ☰
          </button>

          {dropdownOpen && (
            <div className="customer-dropdown-menu">
              <ul>
                <li onClick={() => navigate('/home')}>Home</li>
                <li onClick={() => navigate('/settings')}>Settings</li>
                <li onClick={handleLogout}>Log Out</li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {isTransitioning && (
        <div className="customer-transition">
          <img src={currentLogo} className="customer-transition-logo" alt="Flipping Logo" />
        </div>
      )}
    </div>
  );
}

export default Header;