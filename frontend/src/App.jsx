import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import CalendarPage from './pages/CalendarPage';
import Dashboard from './pages/Dashboard';
import { initNotifications } from './utils/notificationManager';
import { useEffect } from 'react';

function NavBar() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '12px 24px',
      background: 'rgba(17, 24, 39, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <NavLink
        to="/"
        end
        style={({ isActive }) => ({
          padding: '8px 20px',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 250ms ease',
          background: isActive
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'rgba(255,255,255,0.04)',
          color: isActive ? '#fff' : '#94a3b8',
          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
        })}
      >
        📅 Calendar
      </NavLink>
      <NavLink
        to="/dashboard"
        style={({ isActive }) => ({
          padding: '8px 20px',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 250ms ease',
          background: isActive
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'rgba(255,255,255,0.04)',
          color: isActive ? '#fff' : '#94a3b8',
          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.06)',
        })}
      >
        📋 Schedule Agenda
      </NavLink>
    </nav>
  );
}

export default function App() {
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <HashRouter>
      <NavBar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
