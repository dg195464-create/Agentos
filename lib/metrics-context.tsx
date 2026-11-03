'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { defaultDashboardMetrics, type DashboardMetrics } from '@/lib/mock-data';

interface MetricsContextValue {
  metrics: DashboardMetrics;
  threatLevel: string;
  shieldStatus: string;
  encryptionStatus: string;
  sandboxIntegrity: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (partial: Partial<DashboardMetrics>) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextValue | null>(null);

const SECURITY_FIELDS = ['threat_level', 'shield_status', 'encryption_status', 'sandbox_integrity'] as const;

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultDashboardMetrics);
  const [threatLevel, setThreatLevel] = useState('CLEAR');
  const [shieldStatus, setShieldStatus] = useState('ACTIVE');
  const [encryptionStatus, setEncryptionStatus] = useState('AES-256 + PQC');
  const [sandboxIntegrity, setSandboxIntegrity] = useState('INTACT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!session?.user?.id) {
      setMetrics(defaultDashboardMetrics);
      setLoading(false);
      return;
    }
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select(
        'selected_plan, sovereign_cores, tasks_completed, skills_synced, latency, memory_footprint, cloud_node_status, uptime, mutation_rate, threat_level, shield_status, encryption_status, sandbox_integrity'
      )
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    if (!data) {
      // First load — provision a profile row for this user.
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert({ selected_plan: 'Starter' });
      if (insertErr) setError(insertErr.message);
      setMetrics(defaultDashboardMetrics);
      setLoading(false);
      return;
    }

    setMetrics({
      ...defaultDashboardMetrics,
      sovereignCores: data.sovereign_cores ?? defaultDashboardMetrics.sovereignCores,
      tasksCompleted: data.tasks_completed ?? defaultDashboardMetrics.tasksCompleted,
      skillsSynced: data.skills_synced ?? defaultDashboardMetrics.skillsSynced,
      latency: data.latency ?? defaultDashboardMetrics.latency,
      memoryFootprint: data.memory_footprint ?? defaultDashboardMetrics.memoryFootprint,
      cloudNodeStatus: data.cloud_node_status ?? defaultDashboardMetrics.cloudNodeStatus,
      uptime: data.uptime ?? defaultDashboardMetrics.uptime,
      mutationRate: data.mutation_rate ?? defaultDashboardMetrics.mutationRate,
    });
    setThreatLevel(data.threat_level ?? 'CLEAR');
    setShieldStatus(data.shield_status ?? 'ACTIVE');
    setEncryptionStatus(data.encryption_status ?? 'AES-256 + PQC');
    setSandboxIntegrity(data.sandbox_integrity ?? 'INTACT');
    setError(null);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) refresh();
    else setLoading(false);
  }, [session?.user?.id, refresh]);

  // Live drift simulation — writes back to the user's profile row periodically.
  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(async () => {
      tickRef.current += 1;
      if (tickRef.current % 3 !== 0) return; // persist every ~7.5s, not every tick

      setMetrics((prev) => {
        const next: DashboardMetrics = {
          ...prev,
          sovereignCores: Math.max(4170, Math.min(4195, prev.sovereignCores + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3))),
          tasksCompleted: prev.tasksCompleted + Math.floor(Math.random() * 5),
          skillsSynced: prev.skillsSynced + Math.floor(Math.random() * 3),
          latency: `${Math.floor(Math.random() * 8 + 8)}ms`,
        };
        supabase
          .from('profiles')
          .update({
            sovereign_cores: next.sovereignCores,
            tasks_completed: next.tasksCompleted,
            skills_synced: next.skillsSynced,
            latency: next.latency,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .then(({ error: upErr }) => {
            if (upErr) setError(upErr.message);
          });
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const mutate = useCallback(
    async (partial: Partial<DashboardMetrics>) => {
      if (!session?.user?.id) return;
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (partial.sovereignCores !== undefined) row.sovereign_cores = partial.sovereignCores;
      if (partial.tasksCompleted !== undefined) row.tasks_completed = partial.tasksCompleted;
      if (partial.skillsSynced !== undefined) row.skills_synced = partial.skillsSynced;
      if (partial.latency !== undefined) row.latency = partial.latency;
      if (partial.memoryFootprint !== undefined) row.memory_footprint = partial.memoryFootprint;
      if (partial.cloudNodeStatus !== undefined) row.cloud_node_status = partial.cloudNodeStatus;
      if (partial.uptime !== undefined) row.uptime = partial.uptime;
      if (partial.mutationRate !== undefined) row.mutation_rate = partial.mutationRate;

      const { error: upErr } = await supabase
        .from('profiles')
        .update(row)
        .eq('user_id', session.user.id);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setMetrics((prev) => ({ ...prev, ...partial }));
    },
    [session?.user?.id]
  );

  const value: MetricsContextValue = {
    metrics,
    threatLevel,
    shieldStatus,
    encryptionStatus,
    sandboxIntegrity,
    loading,
    error,
    refresh,
    mutate,
  };
  void SECURITY_FIELDS;
  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error('useMetrics must be used within MetricsProvider');
  return ctx;
}
