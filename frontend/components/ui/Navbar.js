import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Activity, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, signout } = useAuth();
  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="text-green" size={22} />
          <span className="font-syne font-bold text-xl text-green tracking-wide">CricSense</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted hover:text-text text-sm transition-colors">Dashboard</Link>
              <Link href="/analyze"   className="text-muted hover:text-text text-sm transition-colors">Analyze</Link>
              <Link href="/history"   className="text-muted hover:text-text text-sm transition-colors">History</Link>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                <span className="text-sm text-muted">{user.name}</span>
                <button onClick={signout} className="text-muted hover:text-red transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login"    className="text-muted hover:text-text text-sm transition-colors">Login</Link>
              <Link href="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
