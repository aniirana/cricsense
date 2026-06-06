import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/ui/Navbar';
import { useAuth } from '../hooks/useAuth';
import { getHistory, deleteAnalysis } from '../lib/api';
import { useRouter } from 'next/router';
import { ChevronRight, Trash2, Activity } from 'lucide-react';

export default function History() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user,loading]);

  useEffect(() => {
    if (user) {
      getHistory().then(r => setAnalyses(r.data)).catch(() => {}).finally(() => setFetching(false));
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this analysis?')) return;
    await deleteAnalysis(id);
    setAnalyses(prev => prev.filter(a => a._id !== id));
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs text-muted tracking-widest uppercase mb-2">Your Sessions</div>
            <h1 className="font-syne font-bold text-4xl">Analysis History</h1>
          </div>
          <Link href="/analyze" className="btn-primary">+ New Analysis</Link>
        </div>

        {fetching ? (
          <div className="text-center py-20 text-muted">
            <Activity size={32} className="mx-auto mb-3 animate-spin text-green" />
            Loading history...
          </div>
        ) : analyses.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🏏</div>
            <div className="font-syne font-bold text-lg mb-2">No analyses yet</div>
            <div className="text-muted text-sm mb-6">Upload your first batting or bowling video</div>
            <Link href="/analyze" className="btn-primary inline-block">Start Analyzing</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {analyses.map(a => (
              <div key={a._id} className="card flex items-center gap-4 hover:border-border2 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.mode==='bat'?'bg-green':'bg-lime'}`} />
                <Link href={`/analysis/${a._id}`} className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.title}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                    &nbsp;·&nbsp; {a.frames} frames
                  </div>
                </Link>
                <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0
                  ${a.mode==='bat' ? 'border-green/30 text-green bg-green/5' : 'border-lime/30 text-lime bg-lime/5'}`}>
                  {a.mode==='bat'?'Batting':'Bowling'}
                </span>
                {a.alerts?.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full border border-red/30 text-red bg-red/5 flex-shrink-0">
                    {a.alerts.length} alert{a.alerts.length>1?'s':''}
                  </span>
                )}
                <button onClick={() => handleDelete(a._id)} className="text-muted hover:text-red transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
                <Link href={`/analysis/${a._id}`} className="text-muted flex-shrink-0">
                  <ChevronRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
