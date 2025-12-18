import { NavLink } from 'react-router-dom';
import '../layout.css';
import { useNotifications } from '../../../contexts/NotificationContext';

function Rsidebar() {
  const { counts, refreshCounts } = useNotifications();

  // Refresh counts when navigating to notification or inbox pages
  const handleNotificationClick = () => {
    setTimeout(() => {
      refreshCounts();
    }, 500); // Refresh after a delay to allow for marking messages as read
  };

  return (
    <aside className="runner-sidebar">
      <nav className="runner-nav-links">
        <NavLink to="/runner" end className={({ isActive }) => isActive ? 'active-link' : ''}>
          <span className="runner-nav-content">
            Home
          </span>
        </NavLink>
        <NavLink 
          to="/runner/notification" 
          className={({ isActive }) => isActive ? 'active-link' : ''}
          onClick={handleNotificationClick}
        >
          <span className="runner-nav-content">
            Notification
            {counts.notifications > 0 && (
              <span className="runner-notification-dot">
                {counts.notifications > 9 ? '9+' : counts.notifications}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink 
          to="/runner/inbox" 
          className={({ isActive }) => isActive ? 'active-link' : ''}
          onClick={handleNotificationClick}
        >
          <span className="runner-nav-content">
            Inbox
            {counts.messages > 0 && (
              <span className="runner-notification-dot">
                {counts.messages > 9 ? '9+' : counts.messages}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink to="/runner/balance" className={({ isActive }) => isActive ? 'active-link' : ''}>
          <span className="runner-nav-content">
            Balance
          </span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Rsidebar;