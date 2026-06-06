import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/ui/Navbar';
import { useAuth } from '../hooks/useAuth';
import { uploadVideo } from '../lib/api';
import { useRouter } from 'next/router';
import { Upload, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';

const BENCH = {
  bat:  { r_knee_angle:[120,160], l_knee_angle:[120,160], hip_rotation:[10,35] },
  bowl: { r_arm_angle:[140,180], hip_sho_separation:[15,45], front_knee_l:[150,180] },
};

function statusColor(val, range) {
  if (!range || val == null) return 'text-text';
  const [lo,hi] = range;
  if (val>=lo && val<=hi) return 'text-green';
  if (val>=(lo-15) && val<=(hi+15)) return 'text-orange';
  return 'text-red';
}

function MetricCard({ label, value, range }) {
  const cls = statusColor(parseFloat(value), range);
  const status = !range ? 'ok' : parseFloat(value)>=range[0] && parseFloat(value)<=range[1] ? 'ok' : 'warn';
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${status==='ok'?'bg-green':'bg-orange'}`} />
      <div className="text-xs text-muted tracking-widest uppercase mb-2">{label}</div>
      <div className={`font-syne font-bold text-3xl ${cls}`}>{value ?? '--'}</div>
      {range && <div className="text-xs text-muted mt-1">Ideal: {range[0]}–{range[1]}</div>}
    </div>
  );
}

export default function Analyze() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef();
  const [file,    setFile]    = useState(null);
  const [mode,    setMode]    = useState('bat');
  const [title,   setTitle]   = useState('');
  const [status,  setStatus]  = useState('idle'); // idle | uploading | done | error
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [aiUrl,   setAiUrl]   = useState('');

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user,loading]);
  useEffect(() => { setAiUrl(process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000'); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading'); setError('');
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('mode',  mode);
      form.append('title', title || `${mode==='bat'?'Batting':'Bowling'} Analysis`);
      const { data } = await uploadVideo(form);
      setResult(data); setStatus('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed'); setStatus('error');
    }
  };

  if (loading || !user) return null;

  const bench = BENCH[mode];
  const summary = result?.analysis?.summary ? Object.fromEntries(Object.entries(result.analysis.summary)) : {};

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-8">
          <div className="text-xs text-muted tracking-widest uppercase mb-2">New Analysis</div>
          <h1 className="font-syne font-bold text-4xl">Upload Video</h1>
        </div>

        {/* Upload form */}
        {status !== 'done' && (
          <form onSubmit={handleSubmit} className="card mb-8">
            {/* Mode toggle */}
            <div className="flex gap-3 mb-6">
              {[['bat','🏏 Batting'],['bowl','🎳 Bowling']].map(([m,l]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 py-3 rounded-lg border font-syne font-bold text-sm tracking-wide transition-all
                    ${mode===m ? 'bg-green/10 border-green text-green' : 'border-border text-muted hover:border-border2'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Title */}
            <div className="mb-5">
              <label className="label">Session Title (optional)</label>
              <input className="input" placeholder="e.g. Batting practice — June 5"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Drop zone */}
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-5
                ${file ? 'border-green bg-green/5' : 'border-border2 hover:border-green'}`}>
              <input ref={fileRef} type="file" accept=".mp4,.mov,.avi" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              <Upload size={32} className={`mx-auto mb-3 ${file ? 'text-green' : 'text-muted'}`} />
              {file ? (
                <><div className="font-syne font-bold text-sm text-green">{file.name}</div>
                  <div className="text-xs text-muted mt-1">{(file.size/1024/1024).toFixed(1)} MB</div></>
              ) : (
                <><div className="font-syne font-bold text-sm text-text">Drop your video here</div>
                  <div className="text-xs text-muted mt-1">MP4 · MOV · AVI &nbsp;·&nbsp; 720p or higher recommended</div></>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red/10 border border-red/30 text-red text-sm rounded-lg p-3 mb-4">
                <AlertCircle size={16} />{error}
              </div>
            )}

            <button className="btn-primary w-full" disabled={!file || status==='uploading'}>
              {status==='uploading' ? (
                <span className="flex items-center justify-center gap-2">
                  <Activity size={16} className="animate-spin" /> Analyzing video...
                </span>
              ) : `▶  Run ${mode==='bat'?'Batting':'Bowling'} Analysis`}
            </button>
            {status==='uploading' && (
              <p className="text-xs text-muted text-center mt-3">This may take a few minutes depending on video length.</p>
            )}
          </form>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle size={20} className="text-green" />
              <span className="font-syne font-bold text-lg">Analysis Complete</span>
              <button onClick={() => { setStatus('idle'); setResult(null); setFile(null); }}
                className="ml-auto text-xs text-muted hover:text-text border border-border rounded-lg px-3 py-1.5">
                New Analysis
              </button>
            </div>

            {/* Summary cards */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Summary</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {Object.entries(summary).map(([k,v]) => (
                <MetricCard key={k} label={k} value={v} range={bench?.[k.toLowerCase().replace(/ /g,'_')]} />
              ))}
            </div>

            {/* Alerts */}
            {result.analysis?.alerts?.length > 0 && (
              <div className="bg-red/5 border border-red/20 rounded-xl p-5 mb-8">
                <div className="text-xs font-bold text-red tracking-widest uppercase mb-3">⚠ Areas Needing Attention</div>
                {result.analysis.alerts.map((a,i) => (
                  <div key={i} className="text-sm text-red/80 py-1">· {a}</div>
                ))}
              </div>
            )}

            {result.analysis?.suggestions?.length > 0 && (
              <div className="bg-green/5 border border-green/20 rounded-xl p-5 mb-8">
                <div className="text-xs font-bold text-green tracking-widest uppercase mb-3">Improvement Suggestions</div>
                {result.analysis.suggestions.map((item,i) => (
                  <div key={i} className="text-sm text-green/80 py-1">· {item}</div>
                ))}
              </div>
            )}

            {/* Frame count */}
            <div className="flex items-center gap-4 mb-8">
              <div className="card flex-1 text-center">
                <div className="text-xs text-muted uppercase tracking-widest mb-1">Frames Analyzed</div>
                <div className="font-syne font-bold text-3xl text-green">{result.analysis?.frames ?? result.frames}</div>
              </div>
              <div className="card flex-1 text-center">
                <div className="text-xs text-muted uppercase tracking-widest mb-1">Mode</div>
                <div className="font-syne font-bold text-3xl text-green">{mode==='bat'?'Batting':'Bowling'}</div>
              </div>
            </div>

            {/* Downloads */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Export Results</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <a href={result.analyzedVideoUrl || result.analysis?.analyzedVideoUrl || `${aiUrl}/download/video?path=${encodeURIComponent(result.video_path)}`}
                className="btn-primary text-center" download>
                ⬇ Download Analyzed Video
              </a>
              <a href={result.csvUrl || result.analysis?.csvUrl || `${aiUrl}/download/csv?path=${encodeURIComponent(result.csv_path)}`}
                className="btn-secondary text-center" download>
                ⬇ Download CSV Data
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
