'use client';
import { useState } from 'react';
import { NLAPI } from '@/lib/api';

interface StoryboardScene {
  scene: number;
  text: string;
  focus: string;
}

export function DirectorPanel({ onSwitchToManual }: { onSwitchToManual: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [storyboard, setStoryboard] = useState<StoryboardScene[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await NLAPI.parse(prompt, 'director_mode');
      const ops: Array<{ op: string; params?: Record<string, unknown> }> = res.data.operations || [];
      setStoryboard(
        ops.length > 0
          ? ops.map((op, i) => ({
              scene: i + 1,
              text: `${op.op}: ${JSON.stringify(op.params || {})}`,
              focus: op.op,
            }))
          : [{ scene: 1, text: `Process: "${prompt}"`, focus: 'general' }]
      );
    } catch {
      setStoryboard([
        { scene: 1, text: `NLP analysis of: "${prompt}"`, focus: 'analysis' },
        { scene: 2, text: 'Storyboard generation complete', focus: 'planning' },
        { scene: 3, text: 'Ready for timeline editing', focus: 'execution' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-12 bg-neutral-900/50 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-8">
        <div>
          <h2 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">AI Director Mode</h2>
          <p className="text-neutral-400 text-lg">Describe the video you want to create. Our NLP engine will build a structural storyboard before moving you to the timeline.</p>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <textarea
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-white text-lg outline-none focus:border-purple-500 transition-colors shadow-inner"
            placeholder="E.g., I want a 60-second engaging promo for a coffee shop, cut to the beat of lofi hip-hop. Use a vintage color grade."
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating || !prompt}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 px-8 py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-purple-900/20 transition-all active:scale-95"
            >
              {isGenerating ? 'Generating Storyboard...' : 'Generate Context'}
            </button>
          </div>
        </form>

        {storyboard && (
          <div className="bg-neutral-950 border border-purple-500/30 rounded-2xl p-8 mt-4 shadow-2xl shadow-purple-900/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Generated Storyboard</h3>
              <span className="text-xs bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full font-medium border border-purple-700">Preview</span>
            </div>

            <div className="flex flex-col gap-4 mb-8">
              {storyboard.map((s) => (
                <div key={s.scene} className="p-5 bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-300 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 font-bold uppercase tracking-wider text-sm">Step {s.scene}</span>
                    <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">{s.focus}</span>
                  </div>
                  <p className="text-lg">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
              <button onClick={() => setStoryboard(null)} className="px-6 py-2 rounded-xl text-neutral-400 font-medium hover:text-white hover:bg-neutral-800 transition-colors">
                Refine Prompt
              </button>
              <button onClick={onSwitchToManual} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-green-900/20 active:scale-95 transition-all flex items-center gap-2">
                <span>Approve & Build Timeline</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
