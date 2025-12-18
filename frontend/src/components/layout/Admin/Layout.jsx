import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import '../layout.css';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Mobile Overlay */}
      <div 
        className={`admin-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar Wrapper */}
      <div className={`admin-sidebar-wrapper ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Header Wrapper */}
      <div className="admin-header-wrapper">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Main Content Area */}
      <div className="admin-main">
        <div className="admin-page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;