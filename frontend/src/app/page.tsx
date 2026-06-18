'use client';
import { useState, useEffect } from 'react';
import { Timeline } from '@/components/Timeline';
import { CommandBar } from '@/components/CommandBar';
import { DirectorPanel } from '@/components/DirectorPanel';
import { WasmCanvas } from '@/components/WasmCanvas';
import { ProjectsAPI } from '@/lib/api';
import { useVideoStore } from '@/store/useVideoStore';

export default function Home() {
  const [appMode, setAppMode] = useState<'director' | 'manual'>('director');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; title: string; status: string; duration_sec: number; created_at: string }>>([]);
  const clips = useVideoStore((s) => s.clips);

  useEffect(() => {
    const stored = localStorage.getItem('vide_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const loadProjects = async () => {
    try {
      const res = await ProjectsAPI.list();
      setProjects(res.data.projects || []);
      setShowProjects(true);
    } catch {}
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans antialiased selection:bg-purple-500/30">
      <header className="h-14 border-b border-neutral-800 flex items-center px-6 justify-between bg-neutral-950 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent tracking-tighter">
            VIDE
          </h1>
          <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-1 rounded font-medium">Alpha v0.2.0</span>
        </div>

        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden p-1 shadow-inner">
          <button
            onClick={() => setAppMode('director')}
            className={`px-4 py-1 text-sm font-medium rounded-md transition-all ${
              appMode === 'director' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            AI Director
          </button>
          <button
            onClick={() => setAppMode('manual')}
            className={`px-4 py-1 text-sm font-medium rounded-md transition-all ${
              appMode === 'manual' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Pro Editor
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <button onClick={loadProjects} className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
            Projects
          </button>
          {user ? (
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-sm shadow-lg border-2 border-neutral-800" title={user.email}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Login</button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {showProjects ? (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Projects</h2>
              <button onClick={() => setShowProjects(false)} className="text-sm text-neutral-400 hover:text-white px-3 py-1 rounded bg-neutral-800 transition-colors">
                Back to Editor
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-neutral-500">No projects yet. Create one in the editor.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors">
                    <h3 className="font-semibold text-lg">{p.title}</h3>
                    <p className="text-sm text-neutral-500 mt-1">{p.status} · {Math.round(p.duration_sec || 0)}s</p>
                    <p className="text-xs text-neutral-600 mt-2">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : appMode === 'director' ? (
          <DirectorPanel onSwitchToManual={() => setAppMode('manual')} />
        ) : (
          <>
            <aside className="w-16 border-r border-neutral-800 bg-neutral-950 flex flex-col items-center py-6 gap-6 z-10 shrink-0">
              <button title="Upload Media" className="p-3 bg-neutral-900 border border-neutral-700 hover:border-purple-500 hover:bg-neutral-800 rounded-xl transition-all shadow-lg text-lg">
                📂
              </button>
              <button title="AI Magic" className="p-3 text-xl bg-neutral-900 border border-neutral-700 hover:border-pink-500 hover:bg-neutral-800 rounded-xl transition-all shadow-lg">
                ✨
              </button>
              <button title="Export" className="p-3 mt-auto bg-neutral-900 border border-neutral-700 hover:border-blue-500 hover:bg-neutral-800 rounded-xl transition-all shadow-lg text-lg">
                📤
              </button>
            </aside>

            <div className="flex-1 flex flex-col relative bg-neutral-900/50">
              <section className="flex-1 flex items-center justify-center p-8 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="aspect-video bg-black w-full max-w-5xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-neutral-800 flex items-center justify-center overflow-hidden z-10 hover:border-neutral-600 transition-colors">
                  <WasmCanvas />
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
                  <CommandBar />
                </div>
              </section>

              <section className="h-72 border-t border-neutral-800 bg-neutral-950 p-4 overflow-x-auto shadow-2xl relative z-20 shrink-0">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Timeline</h3>
                  <span className="text-xs text-neutral-600">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
                </div>
                <Timeline />
              </section>
            </div>

            <aside className="w-72 border-l border-neutral-800 bg-neutral-950 p-6 flex flex-col shrink-0 z-10">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6 border-b border-neutral-800 pb-2">Properties</h2>
              <div className="flex flex-col gap-6">
                <div className="text-sm text-neutral-500 flex flex-col items-center justify-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                  <span className="text-xl mb-2">🖱️</span>
                  No clip selected
                </div>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
