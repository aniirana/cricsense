import Link from 'next/link';
import Navbar from '../components/ui/Navbar';
import { Activity, Zap, Target, BarChart2, Users, ChevronRight } from 'lucide-react';

const features = [
  { icon: <Zap size={22} className="text-green" />, title: 'Weight Transfer', desc: 'Frame-by-frame hip offset tracking to detect left/right weight shift through the shot or delivery.' },
  { icon: <Target size={22} className="text-green" />, title: 'Joint Angle Analysis', desc: 'Knee bend, hip rotation, arm arc and front knee bracing angle measured per frame.' },
  { icon: <BarChart2 size={22} className="text-green" />, title: 'Benchmark Alerts', desc: 'Every metric benchmarked against professional cricket standards with green/amber/red feedback.' },
  { icon: <Activity size={22} className="text-green" />, title: 'Center of Mass', desc: 'CoM approximated from weighted body landmarks with movement trail drawn on video.' },
  { icon: <Users size={22} className="text-green" />, title: 'Player Comparison', desc: 'Analyze two players side by side with overlay graphs and head-to-head metric table.' },
  { icon: <ChevronRight size={22} className="text-green" />, title: 'Full History', desc: 'All analyses saved to your account. Review past sessions anytime from your dashboard.' },
];

const stats = [
  { num: '33',   label: 'Body Landmarks' },
  { num: '8+',   label: 'Metrics Tracked' },
  { num: '30fps',label: 'Analysis Speed' },
  { num: '2',    label: 'Modes: Bat & Bowl' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="text-xs tracking-[0.25em] text-green uppercase mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-green opacity-40" />
          AI-Powered Cricket Biomechanics
          <span className="h-px w-12 bg-green opacity-40" />
        </div>
        <h1 className="font-syne font-black text-[clamp(3rem,8vw,6rem)] leading-none tracking-tight mb-6"
            style={{ background: 'linear-gradient(135deg,#fff 0%,#a3e635 40%,#22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CricSense
        </h1>
        <p className="text-muted text-lg font-light max-w-xl mx-auto mb-10 leading-relaxed">
          Upload batting or bowling videos and get instant biomechanical analysis
          benchmarked against professional cricket standards.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary">Get Started Free</Link>
          <Link href="/login"    className="btn-secondary">Sign In</Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mt-20 pt-12 border-t border-border max-w-2xl mx-auto">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-syne font-bold text-3xl text-green">{s.num}</div>
              <div className="text-xs text-muted mt-1 tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-xs text-muted tracking-[0.2em] uppercase font-medium">What It Analyzes</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="card hover:border-border2 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
              <div className="mb-4">{f.icon}</div>
              <div className="font-syne font-bold text-sm text-text mb-2">{f.title}</div>
              <div className="text-xs text-muted leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-xs text-muted tracking-[0.2em] uppercase font-medium">How It Works</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            ['01','Upload Video','Drop any batting or bowling clip in MP4, MOV or AVI.'],
            ['02','AI Processing','MediaPipe detects 33 landmarks per frame at 30fps.'],
            ['03','Analysis','Joint angles, weight shift and CoM computed per frame.'],
            ['04','Results','Annotated video, benchmark report, graphs and CSV.'],
          ].map(([n,t,d]) => (
            <div key={n} className="card text-center">
              <div className="font-syne font-black text-4xl text-border2 mb-3">{n}</div>
              <div className="font-syne font-bold text-sm mb-2">{t}</div>
              <div className="text-xs text-muted leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted">
        CricSense &nbsp;·&nbsp; Built with MediaPipe · OpenCV · Next.js · FastAPI
      </footer>
    </div>
  );
}
