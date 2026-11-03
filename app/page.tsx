'use client';

import { useState, useEffect } from 'react';
import { Hero } from '@/components/hero';
import { ProfessionGrid } from '@/components/profession-grid';
import { Pricing } from '@/components/pricing';
import { Dashboard } from '@/components/dashboard';
import { SwarmMemory } from '@/components/swarm-memory';
import { Navbar } from '@/components/navbar';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/lib/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import type { ProfessionId } from '@/lib/mock-data';

type View = 'landing' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [selectedProfession, setSelectedProfession] = useState<ProfessionId | null>(null);
  const { requireAuth } = useAuth();

  useEffect(() => {
    if (view === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

  const handleProfessionSelect = (id: ProfessionId) => {
    setSelectedProfession(id);
    setView('dashboard');
  };

  const handleBack = () => {
    setView('landing');
  };

  const handlePricingSelect = (tierId: string) => {
    requireAuth();
  };

  if (view === 'dashboard' && selectedProfession) {
    return (
      <>
        <ErrorBoundary label="Authentication console">
          <AuthModal />
        </ErrorBoundary>
        <ErrorBoundary label="Control center">
          <Dashboard professionId={selectedProfession} onBack={handleBack} />
        </ErrorBoundary>
      </>
    );
  }

  return (
    <main className="min-h-screen">
      <ErrorBoundary label="Authentication console">
        <AuthModal />
      </ErrorBoundary>
      <ErrorBoundary label="Navigation console">
        <Navbar />
      </ErrorBoundary>
      <Hero onExplore={() => {
        const el = document.getElementById('demo');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }} />
      <ErrorBoundary label="Profession terminal">
        <ProfessionGrid onSelect={handleProfessionSelect} selected={selectedProfession} />
      </ErrorBoundary>
      <SwarmMemory />
      <ErrorBoundary label="Pricing console">
        <Pricing onSelect={handlePricingSelect} />
      </ErrorBoundary>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <span className="text-cyan-400 font-bold text-sm">A</span>
            </div>
            <span className="text-sm font-semibold text-white">AgentOS</span>
          </div>
          <p className="text-xs text-slate-600">
            Pre-cognitive cloud workers for any profession. Quantum-resistant. Zero-knowledge. Sovereign.
          </p>
          <p className="mt-4 text-xs text-slate-700">
            © 2026 AgentOS. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
