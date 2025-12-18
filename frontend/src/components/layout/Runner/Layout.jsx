import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Rheader from './Header';
import Rsidebar from './Sidebar';
import '../layout.css';

function Runnerlayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="runner-layout">
      {/* Mobile Overlay */}
      <div 
        className={`runner-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Floating Sidebar Toggle for Mobile */}
      <button 
        className="runner-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>
      
      {/* Sidebar Wrapper */}
      <div className={`runner-sidebar-wrapper ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Rsidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Header Wrapper */}
      <div className="runner-header-wrapper">
        <Rheader />
      </div>

      {/* Main Content Area */}
      <div className="runner-main">
        <div className="runner-page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Runnerlayout;