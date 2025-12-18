import React from 'react';
import './Alert.css';

const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  isVisible, 
  onClose, 
  autoClose = true, 
  duration = 5000,
  actions = null 
}) => {
  React.useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-info';
    }
  };

  return (
    <div className="alert-overlay" onClick={onClose}>
      <div className={`alert-container ${getTypeClass()}`} onClick={(e) => e.stopPropagation()}>
        <div className="alert-header">
          <div className="alert-icon">{getIcon()}</div>
          <div className="alert-content">
            {title && <h3 className="alert-title">{title}</h3>}
            <p className="alert-message">{message}</p>
          </div>
          <button className="alert-close" onClick={onClose}>×</button>
        </div>
        
        {actions && (
          <div className="alert-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert; 