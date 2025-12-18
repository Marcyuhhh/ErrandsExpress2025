import { Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import LandingPage from './pages/public/landing/landingpage';

import Auth from './pages/auth/auth';
import Home from './pages/customer/Home';
import Inbox from './pages/customer/Inbox';
import Notification from './pages/customer/Notification';
import Profile from './pages/customer/Profile';
import Settings from './pages/customer/Settings';
import Homelayout from './components/layout/Customer/Layout';

import RunnerHome from './pages/runner/Home';
import RunnerInbox from './pages/runner/Inbox';
import RunnerNotification from './pages/runner/Notification';
import RunnerSettings from './pages/runner/Settings';
import RunnerBalance from './pages/runner/Balance';
import Runnerlayout from './components/layout/Runner/Layout';

import Verify from './pages/admin/VerifyUsers'
import Users from './pages/admin/UserManagement'
import Transactions from './pages/admin/Transactions'
import Reports from './pages/admin/Reports'
import SystemSettings from './pages/admin/SystemSettings'
import AdminLayout from './components/layout/Admin/Layout';

import RunnerBalances from './components/admin/RunnerBalances'
import './styles/global-responsive.css';

function App() {
  return (
    <NotificationProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route element={<Homelayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/notification" element={<Notification />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/runner" element={<Runnerlayout />}>
          <Route index element={<RunnerHome />} />
          <Route path="notification" element={<RunnerNotification />} />
          <Route path="inbox" element={<RunnerInbox />} />
          <Route path="settings" element={<RunnerSettings />} />
          <Route path="balance" element={<RunnerBalance />} />
        </Route>
        <Route element={<AdminLayout />}>
         <Route path="/verify" element={<Verify />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/transactions" element={<Transactions />} />

          <Route path="/users" element={<Users />} />
          <Route path="/runner-balance" element={<RunnerBalances />} />
          <Route path="/system-settings" element={<SystemSettings />} />
        </Route>
      </Routes>
    </NotificationProvider>
  );
}

export default App;