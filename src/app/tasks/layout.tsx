'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

import { Project, WorkItem, Transcription, AiInsight } from '@/types/gwork';

// ============================================================================
// CONTEXT
// ============================================================================

interface GWorkContextValue {
  user: User | null;
  loading: boolean;
  projects: Project[];
  workItems: WorkItem[];
  transcriptions: Transcription[];
  insights: AiInsight[];
  refreshData: () => Promise<void>;
  refreshInsights: () => Promise<void>;
}

const GWorkContext = createContext<GWorkContextValue>({
  user: null,
  loading: true,
  projects: [],
  workItems: [],
  transcriptions: [],
  insights: [],
  refreshData: async () => {},
  refreshInsights: async () => {},
});

export const useGWork = () => useContext(GWorkContext);

// ============================================================================
// PROVIDER
// ============================================================================

function GWorkProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);

  const fetchData = useCallback(async (userId: string) => {
    try {
      const [
        { data: dbProjects },
        { data: dbTasks },
        { data: dbTranscriptions }
      ] = await Promise.all([
        supabase.from('tasks_projects').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
        supabase.from('transcriptions').select('*').eq('user_id', userId).order('transcribed_at', { ascending: false })
      ]);
      
      setProjects(dbProjects || []);
      setWorkItems(dbTasks || []);
      setTranscriptions(dbTranscriptions || []);
    } catch (err) {
      console.error('[G-Work] Error loading data:', err);
    }
  }, []);

  const fetchInsights = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(20);
      setInsights(data || []);
    } catch (err) {
      console.error('[G-Work] Error loading insights:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (user) await fetchData(user.id);
  }, [user, fetchData]);

  const refreshInsights = useCallback(async () => {
    if (user) await fetchInsights(user.id);
  }, [user, fetchInsights]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        setUser(authUser);
        await Promise.all([fetchData(authUser.id), fetchInsights(authUser.id)]);
      } catch (err) {
        console.error('[G-Work] Error during init:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchData, fetchInsights]);

  // Silent background Google Drive synchronization on startup
  useEffect(() => {
    if (!user) return;
    
    const syncDrive = async () => {
      try {
        const res = await fetch('/api/tasks/sync-drive', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success && data.filesImported > 0) {
          // If new files were imported, refresh the data to display them
          await refreshData();
        }
      } catch (err) {
        console.error('[G-Work] Silent Drive sync failed:', err);
      }
    };

    // Delay the sync slightly to not block initial page rendering
    const timer = setTimeout(syncDrive, 1500);
    return () => clearTimeout(timer);
  }, [user, refreshData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const tasksChannel = supabase
      .channel('gwork-tasks-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWorkItems(prev => [payload.new as WorkItem, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setWorkItems(prev => prev.map(t => t.id === payload.new.id ? (payload.new as WorkItem) : t));
          } else if (payload.eventType === 'DELETE') {
            setWorkItems(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const transcriptionsChannel = supabase
      .channel('gwork-transcriptions-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transcriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTranscriptions(prev => prev.map(tr => tr.id === payload.new.id ? (payload.new as Transcription) : tr));
          }
        }
      )
      .subscribe();

    const insightsChannel = supabase
      .channel('gwork-insights-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_insights', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setInsights(prev => [payload.new as AiInsight, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(transcriptionsChannel);
      supabase.removeChannel(insightsChannel);
    };
  }, [user]);

  return (
    <GWorkContext.Provider value={{ user, loading, projects, workItems, transcriptions, insights, refreshData, refreshInsights }}>
      {children}
    </GWorkContext.Provider>
  );
}

// ============================================================================
// LAYOUT
// ============================================================================

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <GWorkProvider>
      {children}
    </GWorkProvider>
  );
}
