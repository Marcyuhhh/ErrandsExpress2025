import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNotifications } from '../../../contexts/NotificationContext';
import '../layout.css';
function Sidebar({ onClose }) {
  const [username, setUsername] = useState('User');
  const { counts, refreshCounts } = useNotifications();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.name) {
      setUsername(userData.name);
    }
  }, []);

  // Refresh counts when navigating to notification or inbox pages
  const handleNotificationClick = () => {
    if (onClose) onClose();
    setTimeout(() => {
      refreshCounts();
    }, 500);
  };

  return (
    <aside className="customer-sidebar">
      <nav className="customer-nav-links">
        <NavLink 
          to="/profile" 
          className={({ isActive }) => isActive ? 'customer-active-link' : ''}
          onClick={onClose}
        >
          <span className="customer-nav-content">
            {username}
          </span>
        </NavLink>
        <NavLink 
          to="/home" 
          className={({ isActive }) => isActive ? 'customer-active-link' : ''}
          onClick={onClose}
        >
          <span className="customer-nav-content">
            Home
          </span>
        </NavLink>
        <NavLink 
          to="/notification" 
          className={({ isActive }) => isActive ? 'customer-active-link' : ''}
          onClick={handleNotificationClick}
        >
          <span className="customer-nav-content">
            Notification
            {counts.notifications > 0 && (
              <span className="customer-notification-dot">
                {counts.notifications > 9 ? '9+' : counts.notifications}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink 
          to="/inbox" 
          className={({ isActive }) => isActive ? 'customer-active-link' : ''}
          onClick={handleNotificationClick}
        >
          <span className="customer-nav-content">
            Inbox
            {counts.messages > 0 && (
              <span className="customer-notification-dot">
                {counts.messages > 9 ? '9+' : counts.messages}
              </span>
            )}
          </span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;