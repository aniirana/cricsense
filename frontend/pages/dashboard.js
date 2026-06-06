import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/ui/Navbar';
import { useAuth } from '../hooks/useAuth';
import { getStats } from '../lib/api';
import { BarChart2, Upload, Clock, Activity, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (user) getStats().then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="text-xs text-muted tracking-widest uppercase mb-2">Welcome back</div>
          <h1 className="font-syne font-bold text-4xl text-text">{user.name}</h1>
          <p className="text-muted text-sm mt-1">{user.role === 'coach' ? 'Coach' : 'Player'} Account</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Analyses', value: stats?.total ?? '—', icon: <Activity size={18} className="text-green" /> },
            { label: 'Batting Sessions', value: stats?.batting ?? '—', icon: <BarChart2 size={18} className="text-green" /> },
            { label: 'Bowling Sessions', value: stats?.bowling ?? '—', icon: <BarChart2 size={18} className="text-lime" /> },
            { label: 'Recent (30 days)', value: stats?.recent?.length ?? '—', icon: <Clock size={18} className="text-orange" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="card relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green to-lime opacity-30" />
              <div className="flex items-center justify-between mb-3">{icon}<span className="text-xs text-muted tracking-widest uppercase">{label}</span></div>
              <div className="font-syne font-bold text-4xl text-text">{value}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Link href="/analyze" className="card flex items-center gap-4 hover:border-green transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center group-hover:bg-green/20 transition-colors">
              <Upload size={22} className="text-green" />
            </div>
            <div className="flex-1">
              <div className="font-syne font-bold text-sm">New Analysis</div>
              <div className="text-xs text-muted mt-0.5">Upload a batting or bowling video</div>
            </div>
            <ChevronRight size={16} className="text-muted group-hover:text-green transition-colors" />
          </Link>
          <Link href="/history" className="card flex items-center gap-4 hover:border-green transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-green/10 flex items-center justify-center group-hover:bg-green/20 transition-colors">
              <Clock size={22} className="text-green" />
            </div>
            <div className="flex-1">
              <div className="font-syne font-bold text-sm">View History</div>
              <div className="text-xs text-muted mt-0.5">Review all past analyses</div>
            </div>
            <ChevronRight size={16} className="text-muted group-hover:text-green transition-colors" />
          </Link>
        </div>

        {/* Recent analyses */}
        {stats?.recent?.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Recent Analyses</span>
              <div className="flex-1 h-px bg-border" />
              <Link href="/history" className="text-xs text-green hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {stats.recent.map(a => (
                <Link key={a._id} href={`/analysis/${a._id}`}
                  className="card flex items-center gap-4 hover:border-border2 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${a.mode === 'bat' ? 'bg-green' : 'bg-lime'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${a.mode === 'bat' ? 'border-green/30 text-green bg-green/5' : 'border-lime/30 text-lime bg-lime/5'}`}>
                    {a.mode === 'bat' ? 'Batting' : 'Bowling'}
                  </span>
                  <ChevronRight size={14} className="text-muted" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
