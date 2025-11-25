import React, { useState, useEffect } from 'react';
import { Menu, Moon, Sun, Battery, BatteryCharging, User, MessageSquare, Zap, Settings, LogOut, Briefcase, Trophy, LayoutDashboard, ShieldCheck, Heart } from 'lucide-react';
import { ViewState, User as UserType } from '../types';
import { Button } from './UI';

interface LayoutProps {
  children: React.ReactNode;
  view: ViewState;
  setView: (view: ViewState) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  user: UserType | null;
  handleLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, view, setView, darkMode, toggleDarkMode, user, handleLogout 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100);
        setIsCharging(battery.charging);
        battery.addEventListener('levelchange', () => setBatteryLevel(battery.level * 100));
        battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
      });
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isPublic = ['landing', 'login', 'signup', 'pricing', 'about'].includes(view);

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState; icon: any; label: string }) => (
    <button 
      onClick={() => { setView(target); setIsSidebarOpen(false); }}
      className={`flex items-center w-full px-4 py-3 rounded-xl mb-1 transition-all ${view === target ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
    >
      <Icon size={18} className="mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      {/* Background Blob Animation */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-slate-50 dark:bg-slate-950">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/30 dark:bg-purple-900/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'glass border-b border-slate-200/50 dark:border-slate-800/50 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(user ? 'dashboard' : 'landing')}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">B</div>
            <span className="font-bold text-xl tracking-tight">Bhasha<span className="text-indigo-600 dark:text-indigo-400">GPT</span></span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {isPublic && (
              <>
                <button onClick={() => setView('landing')} className="text-sm font-medium opacity-80 hover:opacity-100">Home</button>
                <button onClick={() => setView('pricing')} className="text-sm font-medium opacity-80 hover:opacity-100">Pricing</button>
                <button onClick={() => setView('about')} className="text-sm font-medium opacity-80 hover:opacity-100">About</button>
              </>
            )}
            
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
            
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {batteryLevel !== null && batteryLevel < 20 && !isCharging && (
               <div className="flex items-center text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                 <Battery size={14} className="mr-1" /> Saver Mode
               </div>
            )}

            {!user && isPublic && (
              <>
                <Button variant="ghost" onClick={() => setView('login')}>Login</Button>
                <Button onClick={() => setView('signup')}>Get Started</Button>
              </>
            )}
            {user && (
               <div className="flex items-center gap-3">
                  <div className="text-right hidden lg:block">
                      <p className="text-xs font-bold">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.plan === 'PREMIUM' ? 'Premium Member' : 'Free Plan'}</p>
                  </div>
                  <button onClick={() => setView('profile')} className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border border-indigo-200 dark:border-indigo-700">
                    <User size={18} className="text-indigo-600 dark:text-indigo-300" />
                  </button>
               </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
             <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout Content */}
      <div className="pt-20 flex flex-1 overflow-hidden">
        {/* User Sidebar (Desktop) */}
        {user && !isPublic && (
          <aside className="hidden md:flex flex-col w-64 fixed h-[calc(100vh-80px)] left-0 top-20 pl-4 pb-4">
             <div className="glass h-full rounded-2xl border border-white/20 dark:border-slate-800 p-4 flex flex-col justify-between">
                <div className="space-y-1">
                  <NavItem target="dashboard" icon={LayoutDashboard} label="Dashboard" />
                  <NavItem target="chat" icon={MessageSquare} label="Bhasha Chat" />
                  <NavItem target="tools" icon={Briefcase} label="AI Tools" />
                  <NavItem target="founder" icon={Heart} label="Founder RJ" />
                  <NavItem target="subscription" icon={Zap} label="Upgrade" />
                  {user.role !== 'USER' && <NavItem target="admin" icon={ShieldCheck} label="Admin" />}
                </div>
                
                <div className="space-y-1">
                   <div className="px-4 py-2 mb-2">
                      <div className="flex justify-between text-xs mb-1">
                         <span>Daily Usage</span>
                         <span>{user.plan === 'PREMIUM' ? '∞' : `${user.dailyUsageMinutes}/30m`}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                         <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: user.plan === 'PREMIUM' ? '100%' : `${(user.dailyUsageMinutes / 30) * 100}%` }}></div>
                      </div>
                   </div>
                   <NavItem target="profile" icon={Settings} label="Settings" />
                   <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                     <LogOut size={18} className="mr-3" />
                     <span className="font-medium">Logout</span>
                   </button>
                </div>
             </div>
          </aside>
        )}

        {/* Mobile Drawer */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
             <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col animate-slide-left">
                <div className="flex justify-end mb-6">
                  <button onClick={() => setIsSidebarOpen(false)}>✕</button>
                </div>
                {user ? (
                  <div className="space-y-2">
                    <NavItem target="dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem target="chat" icon={MessageSquare} label="Bhasha Chat" />
                    <NavItem target="tools" icon={Briefcase} label="AI Tools" />
                    <NavItem target="subscription" icon={Zap} label="Upgrade" />
                    <NavItem target="founder" icon={Heart} label="Meet Founder" />
                    <NavItem target="profile" icon={Settings} label="Profile" />
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-red-500 mt-4">
                     <LogOut size={18} className="mr-3" /> Logout
                   </button>
                  </div>
                ) : (
                  <div className="space-y-4 flex flex-col">
                    <Button onClick={() => { setView('login'); setIsSidebarOpen(false); }} variant="outline">Login</Button>
                    <Button onClick={() => { setView('signup'); setIsSidebarOpen(false); }}>Sign Up</Button>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                    <button onClick={() => setView('landing')} className="text-left px-2 py-2">Home</button>
                    <button onClick={() => setView('pricing')} className="text-left px-2 py-2">Pricing</button>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 w-full transition-all duration-300 ${user && !isPublic ? 'md:pl-72 pr-4' : ''} p-4 pb-20 md:pb-4 overflow-y-auto h-[calc(100vh-80px)] scroll-smooth`}>
           {children}
        </main>
      </div>
    </div>
  );
};
