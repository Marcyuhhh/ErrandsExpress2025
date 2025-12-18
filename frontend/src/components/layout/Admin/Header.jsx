import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/ErrandsLogo.png';
import '../layout.css';

function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData?.name) {
      setUsername(userData.name);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleMenuItemClick = (action) => {
    setDropdownOpen(false);
    action();
  };

  const firstLetter = username.charAt(0).toUpperCase();

  return (
    <div className="admin-header-container">
      <header className="admin-header">
        <div
          className="admin-header-left"
          onClick={() => navigate('/verify')}
          style={{ cursor: 'pointer' }}
        >
          <img src={logo} alt="Errands Logo" className="admin-header-logo" />
          <h1 className="admin-header-title">Errands Express</h1>
        </div>

        <div className="admin-header-right">
          <div className="admin-mode-label">ADMINISTRATOR MODE</div>

          <div className="admin-header-profile-info">
            <div className="admin-header-profile-circle">
              {firstLetter}
            </div>
            <span className="admin-header-profile-name">{username}</span>
          </div>

          <div className="admin-header-dropdown-container" ref={dropdownRef}>
            <button className="admin-hamburger-btn" onClick={onMenuToggle || toggleDropdown}>
              ☰
            </button>

            {dropdownOpen && (
              <div className="admin-header-dropdown-menu">
                <ul>
                  <li onClick={() => handleMenuItemClick(() => navigate('/verify'))}>Dashboard</li>
                  <li onClick={() => handleMenuItemClick(handleLogout)}>Log Out</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;