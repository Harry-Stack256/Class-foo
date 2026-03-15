import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Users, Calendar, User, PlusCircle, Bell } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/users/${user._id}/friend-requests`);
        if (res.ok) {
          const data = await res.json();
          setRequestCount(data.length);
        }
      } catch (e) {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user?._id]);

  const navItems = [
    { name: 'Events', href: '/', icon: Calendar },
    { name: 'Create', href: '/events/new', icon: PlusCircle },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-brand-red text-white font-sans">
      <header className="bg-brand-red/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <Users className="h-6 w-6 text-white" />
                <span className="font-bold text-xl tracking-tight text-white">FeastMeet</span>
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <nav className="hidden sm:flex items-center gap-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center text-sm font-medium transition-colors relative',
                        isActive ? 'text-white' : 'text-white/70 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                      {item.name === 'Profile' && requestCount > 0 && (
                        <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-red">
                          {requestCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
              <span className="text-sm text-white/70 hidden sm:block border-l border-white/20 pl-6">
                Welcome, {user?.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-brand-red/95 backdrop-blur-md border-t border-white/20 pb-safe">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center py-3 px-4 text-xs font-medium relative',
                  isActive ? 'text-white' : 'text-white/60 hover:text-white'
                )}
              >
                <Icon className="h-6 w-6 mb-1" />
                {item.name}
                {item.name === 'Profile' && requestCount > 0 && (
                  <span className="absolute top-2 right-6 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-red">
                    {requestCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
