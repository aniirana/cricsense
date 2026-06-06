import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { login } from '../lib/api';
import { Activity } from 'lucide-react';

export default function Login() {
  const { signin } = useAuth();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await login(form);
      signin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Activity className="text-green mx-auto mb-3" size={32} />
          <h1 className="font-syne font-bold text-3xl text-green">CricSense</h1>
          <p className="text-muted text-sm mt-2">Sign in to your account</p>
        </div>
        <div className="card">
          {error && <div className="bg-red/10 border border-red/30 text-red text-sm rounded-lg p-3 mb-4">{error}</div>}
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-xs text-muted mt-5">
            No account? <Link href="/register" className="text-green hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
