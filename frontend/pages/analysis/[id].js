import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../../components/ui/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getAnalysis } from '../../lib/api';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';

const BENCH = {
  bat:  { 'Right Knee Bend':[120,160], 'Left Knee Bend':[120,160], 'Hip Rotation':[10,35] },
  bowl: { 'Bowling Arm Angle':[140,180], 'Hip-Sho Separation':[15,45], 'Front Knee':[150,180], 'Trunk Lean':[10,40] },
};

const METRICS = {
  bat: [
    { key: 'r_knee_angle', label: 'Right Knee', range: [120,160], color: '#22c55e' },
    { key: 'l_knee_angle', label: 'Left Knee', range: [120,160], color: '#a3e635' },
    { key: 'hip_rotation', label: 'Hip Rotation', range: [10,35], color: '#f97316' },
  ],
  bowl: [
    { key: 'r_arm_angle', label: 'Bowling Arm', range: [140,180], color: '#22c55e' },
    { key: 'hip_sho_separation', label: 'Hip-Shoulder Separation', range: [15,45], color: '#a3e635' },
    { key: 'front_knee_l', label: 'Front Knee', range: [150,180], color: '#f97316' },
    { key: 'trunk_lean', label: 'Trunk Lean', range: [10,40], color: '#ef4444' },
  ],
};

function statusOf(val, range) {
  if (!range) return 'ok';
  const n = parseFloat(val);
  if (isNaN(n)) return 'ok';
  if (n>=range[0] && n<=range[1]) return 'ok';
  if (n>=(range[0]-15) && n<=(range[1]+15)) return 'warn';
  return 'bad';
}

export default function AnalysisDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id }  = router.query;
  const [analysis, setAnalysis] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user,loading]);

  useEffect(() => {
    if (user && id) {
      getAnalysis(id).then(r => setAnalysis(r.data)).catch(() => router.push('/history')).finally(() => setFetching(false));
    }
  }, [user,id]);

  if (loading || !user || fetching) return null;
  if (!analysis) return null;

  const bench = BENCH[analysis.mode] || {};
  const summaryEntries = analysis.summary ? Object.entries(analysis.summary) : [];
  const metricRows = Array.isArray(analysis.metrics) ? analysis.metrics : [];
  const chartMetrics = METRICS[analysis.mode] || [];
  const sampleEvery = Math.max(1, Math.floor(metricRows.length / 140));
  const chartData = metricRows
    .filter((_, index) => index % sampleEvery === 0)
    .map(row => ({ ...row, time_s: Number(row.time_s || 0).toFixed(1) }));

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <Link href="/history" className="text-muted hover:text-text transition-colors"><ArrowLeft size={18}/></Link>
          <div>
            <div className="text-xs text-muted tracking-widest uppercase mb-1">Analysis Detail</div>
            <h1 className="font-syne font-bold text-3xl">{analysis.title}</h1>
          </div>
          <span className={`ml-auto text-xs px-3 py-1.5 rounded-full border font-syne font-bold tracking-wide
            ${analysis.mode==='bat' ? 'border-green/30 text-green bg-green/5' : 'border-lime/30 text-lime bg-lime/5'}`}>
            {analysis.mode==='bat'?'Batting':'Bowling'}
          </span>
        </div>

        {analysis.analyzedVideoUrl && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Visual Feedback</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <video controls className="w-full rounded-xl border border-border bg-black mb-8" src={analysis.analyzedVideoUrl} />
          </>
        )}

        {/* Meta */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="label">Date</div>
            <div className="font-syne font-bold text-xl">{new Date(analysis.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div className="card text-center">
            <div className="label">Frames Analyzed</div>
            <div className="font-syne font-bold text-3xl text-green">{analysis.frames}</div>
          </div>
          <div className="card text-center">
            <div className="label">Alerts</div>
            <div className={`font-syne font-bold text-3xl ${analysis.alerts?.length>0?'text-red':'text-green'}`}>
              {analysis.alerts?.length ?? 0}
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="flex items-center gap-4 mb-5">
          <span className="text-xs text-muted tracking-widest uppercase">Summary Metrics</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {summaryEntries.map(([k,v]) => {
            const range = bench[k];
            const s = statusOf(v, range);
            const colors = { ok:'text-green border-green', warn:'text-orange border-orange', bad:'text-red border-red' };
            return (
              <div key={k} className="card relative overflow-hidden">
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${s==='ok'?'bg-green':s==='warn'?'bg-orange':'bg-red'}`}/>
                <div className="label">{k}</div>
                <div className={`font-syne font-bold text-2xl mt-1 ${s==='ok'?'text-green':s==='warn'?'text-orange':'text-red'}`}>{v}</div>
                {range && <div className="text-xs text-muted mt-1">Ideal: {range[0]}–{range[1]}</div>}
                <span className={`inline-block text-xs border rounded-full px-2 py-0.5 mt-2 ${colors[s]}`}>
                  {s==='ok'?'✓ Ideal':s==='warn'?'⚠ Check':'✗ Alert'}
                </span>
              </div>
            );
          })}
        </div>

        {chartData.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Movement Trends</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 gap-4 mb-8">
              {chartMetrics.map(metric => (
                <div key={metric.key} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-syne font-bold text-sm">{metric.label}</div>
                    <div className="text-xs text-muted">Ideal: {metric.range[0]}-{metric.range[1]}</div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="#1d2e20" strokeDasharray="3 3" />
                        <XAxis dataKey="time_s" stroke="#6b8f72" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#6b8f72" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: '#111a14', border: '1px solid #253528', color: '#e2ede4' }} />
                        <ReferenceArea y1={metric.range[0]} y2={metric.range[1]} fill="#22c55e" fillOpacity={0.08} />
                        <Line type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={2} dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Alerts */}
        {analysis.alerts?.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Alerts</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="bg-red/5 border border-red/20 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red" />
                <span className="text-xs font-bold text-red tracking-widest uppercase">Areas Needing Attention</span>
              </div>
              {analysis.alerts.map((a,i) => (
                <div key={i} className="text-sm text-red/80 py-1 border-b border-red/10 last:border-0">· {a}</div>
              ))}
            </div>
          </>
        )}

        {!analysis.alerts?.length && (
          <div className="flex items-center gap-2 bg-green/5 border border-green/20 rounded-xl p-4 mb-8">
            <CheckCircle size={16} className="text-green" />
            <span className="text-sm text-green">All metrics within ideal ranges — great technique!</span>
          </div>
        )}

        {analysis.suggestions?.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs text-muted tracking-widest uppercase">Improvement Suggestions</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="bg-green/5 border border-green/20 rounded-xl p-5 mb-8">
              {analysis.suggestions.map((item,i) => (
                <div key={i} className="text-sm text-green/80 py-1 border-b border-green/10 last:border-0">· {item}</div>
              ))}
            </div>
          </>
        )}

        {(analysis.analyzedVideoUrl || analysis.csvUrl) && (
          <div className="grid grid-cols-2 gap-4">
            {analysis.analyzedVideoUrl && <a href={analysis.analyzedVideoUrl} className="btn-primary text-center" download>Download Analyzed Video</a>}
            {analysis.csvUrl && <a href={analysis.csvUrl} className="btn-secondary text-center" download>Download CSV Data</a>}
          </div>
        )}
      </div>
    </div>
  );
}
