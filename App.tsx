import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { User, Role } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  // Persist theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <Layout 
      darkMode={darkMode} 
      toggleTheme={toggleTheme} 
      onLogout={handleLogout}
      userEmail={user.email}
      role={user.role}
    >
      {user.role === Role.ADMIN ? (
        <AdminDashboard darkMode={darkMode} toggleTheme={toggleTheme} />
      ) : (
        <UserDashboard currentUser={user} onLogout={handleLogout} />
      )}
    </Layout>
  );
};

export default App;