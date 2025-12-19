import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNotifications } from '../../../contexts/NotificationContext';
import '../layout.css';

function AdminSidebar({ onClose }) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Admin');
  const { counts, refreshCounts } = useNotifications();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.name) {
      setAdminName(userData.name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handlePageNavClick = (pageName) => {
    handleNavClick();
    setTimeout(() => {
      refreshCounts();
    }, 500);
  };

  return (
    <aside className="admin-sidebar">
      <nav className="admin-nav">
        <div className="admin-profile-section">
          <div className="admin-profile-circle">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <span className="admin-profile-name">{adminName}</span>
          <span className="admin-role-badge">Administrator</span>
        </div>
        
        <ul className="admin-nav-list">
          <li>
            <NavLink 
              to="/verify" 
              end 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('verify')}
            >
              <span className="admin-nav-content">
                📋 Verify Users
                {counts.pendingUsers > 0 && (
                  <span className="admin-notification-dot">
                    {counts.pendingUsers > 9 ? '9+' : counts.pendingUsers}
                  </span>
                )}
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('reports')}
            >
              <span className="admin-nav-content">
                📊 Reports
                {counts.reports > 0 && (
                  <span className="admin-notification-dot">
                    {counts.reports > 9 ? '9+' : counts.reports}
                  </span>
                )}
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/transactions" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('transactions')}
            >
              <span className="admin-nav-content">
                💰 Transactions
                {counts.pendingErrandPayments > 0 && (
                  <span className="admin-notification-dot">
                    {counts.pendingErrandPayments > 9 ? '9+' : counts.pendingErrandPayments}
                  </span>
                )}
              </span>
            </NavLink>
          </li>

          <li>
            <NavLink 
              to="/users" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('users')}
            >
              <span className="admin-nav-content">
                👥 Users
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/runner-balance" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('runner-balance')}
            >
              <span className="admin-nav-content">
                💵 Runner Balance
                {counts.pendingBalancePayments > 0 && (
                  <span className="admin-notification-dot">
                    {counts.pendingBalancePayments > 9 ? '9+' : counts.pendingBalancePayments}
                  </span>
                )}
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/system-settings" 
              className={({ isActive }) => isActive ? 'admin-nav-link active' : 'admin-nav-link'}
              onClick={() => handlePageNavClick('system-settings')}
            >
              <span className="admin-nav-content">
                ⚙️ System Settings
              </span>
            </NavLink>
          </li>
        </ul>
        
          <button 
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
      </nav>
    </aside>
  );
}

export default AdminSidebar;