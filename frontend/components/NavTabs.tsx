'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function NavTabs() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const tabs = [
    { href: '/longterm', label: 'Long-term' },
    { href: '/daily', label: 'Daily' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center gap-4 shrink-0">
      <span className="text-sm font-bold text-indigo-400 font-mono mr-2 tracking-widest">PULSE</span>
      <div className="flex gap-1 flex-1">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">{user.display_name}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
