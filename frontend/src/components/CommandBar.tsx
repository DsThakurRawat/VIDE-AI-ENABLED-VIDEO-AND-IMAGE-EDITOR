'use client';
import { useState } from 'react';
import { NLAPI } from '@/lib/api';
import { useVideoStore } from '@/store/useVideoStore';

export function CommandBar() {
  const [cmd, setCmd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<{ summary: string; operations: { op: string; params?: Record<string, unknown> }[] } | null>(null);
  const addOperation = useVideoStore((s) => s.addOperation);

  const submitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim() || isLoading) return;

    setIsLoading(true);
    setPlan(null);

    try {
      const res = await NLAPI.parse(cmd);
      const data = res.data;
      setPlan({
        summary: data.summary || `Parsed ${cmd}`,
        operations: data.operations || [],
      });
    } catch {
      setPlan({
        summary: `Fallback parsing of: "${cmd}"`,
        operations: cmd.includes('trim') ? [{ op: 'trim', params: { start: 0, end: 10 } }] : [{ op: 'export', params: { resolution: '1080p' } }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPlan = () => {
    if (!plan) return;
    plan.operations.forEach((op, i) => {
      addOperation({
        id: `op_${Date.now()}_${i}`,
        type: op.op,
        params: op.params || {},
        order: i,
        parentId: null,
      });
    });
    setPlan(null);
    setCmd('');
  };

  return (
    <div className="w-full">
      <form onSubmit={submitPlan} className="bg-neutral-800/80 backdrop-blur-md p-2 rounded-2xl flex items-center gap-2 shadow-2xl border border-neutral-700 w-full">
        <span className="pl-3 text-2xl">✨</span>
        <input
          type="text"
          className="flex-1 bg-transparent border-none text-white outline-none placeholder:text-neutral-400 pl-2 text-lg"
          placeholder="Type a command (e.g., 'remove the background and apply a warm LUT')"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !cmd.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-colors px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-purple-500/25"
        >
          {isLoading ? 'Parsing...' : 'Execute'}
        </button>
      </form>

      {plan && (
        <div className="mt-3 bg-neutral-900/90 backdrop-blur-md border border-purple-500/30 rounded-xl p-4 shadow-2xl">
          <p className="text-sm text-neutral-300 mb-3">{plan.summary}</p>
          {plan.operations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {plan.operations.map((op, i) => (
                <span key={i} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full border border-purple-700">
                  {op.op}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setPlan(null)} className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors">
              Cancel
            </button>
            <button onClick={confirmPlan} className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg font-medium transition-colors">
              Confirm & Add to Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
