import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import '../layout.css';

function Layout() {
  const [posts, setPosts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="customer-layout">
      {/* Mobile Overlay */}
      <div 
        className={`customer-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Floating Sidebar Toggle for Mobile */}
      <button 
        className="customer-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>
      
      {/* Sidebar */}
      <div className={`customer-sidebar-wrapper ${sidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Header */}
      <div className="customer-header-wrapper">
        <Header />
      </div>

      {/* Main Content Area */}
      <div className="customer-main">
        <div className="customer-page-container">
          <Outlet context={{ posts, setPosts }} />
        </div>
      </div>
    </div>
  );
}

export default Layout;