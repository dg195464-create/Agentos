'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 grid-bg">
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-8 text-center neon-glow">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
          <AlertTriangle className="h-6 w-6 text-cyan-400" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-white">Sovereign link interrupted</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          The interface encountered a temporary fault. Reconnect to resume your session.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-[0_0_24px_rgba(6,182,212,0.5)]"
        >
          <RotateCcw className="h-4 w-4" />
          Reconnect
        </button>
      </div>
    </main>
  );
}
