import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage, AuthView, PricingView } from './views/PublicViews';
import { UserDashboard } from './views/UserDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { User, ViewState, UserRole } from './types';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  // Persist Dark Mode
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleAuth = (userData: User) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
  };

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return <LandingPage onGetStarted={() => setView(user ? 'dashboard' : 'signup')} />;
      case 'login':
        return <AuthView mode="login" onAuth={handleAuth} onSwitch={() => setView('signup')} />;
      case 'signup':
        return <AuthView mode="signup" onAuth={handleAuth} onSwitch={() => setView('login')} />;
      case 'pricing':
        return <PricingView onSubscribe={() => user ? setView('subscription') : setView('signup')} />;
      case 'about':
        // Minimal About View
        return (
            <div className="max-w-2xl mx-auto text-center pt-10">
                <h1 className="text-4xl font-bold mb-6">About BhashaGPT</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    Born from the desire to make AI accessible to every Indian, BhashaGPT bridges the gap between advanced technology and local cultural context. We aren't just a wrapper; we are a productivity suite designed for Bharat.
                </p>
            </div>
        );
      case 'admin':
        return user?.role === UserRole.ADMIN ? <AdminDashboard /> : <UserDashboard user={user!} activeTab="dashboard" setUser={setUser} />;
      default:
        // Handle User Dashboard Tabs (dashboard, chat, tools, etc.)
        if (user) {
          return <UserDashboard user={user} activeTab={view} setUser={setUser} />;
        }
        return <LandingPage onGetStarted={() => setView('signup')} />;
    }
  };

  return (
    <Layout 
      view={view} 
      setView={setView} 
      darkMode={darkMode} 
      toggleDarkMode={() => setDarkMode(!darkMode)}
      user={user}
      handleLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
