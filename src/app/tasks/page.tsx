'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Briefcase, 
  Target, 
  Mic, 
  Sparkles, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Play,
  FileText,
  User,
  Trash2,
  ListTodo,
  CornerUpLeft
} from 'lucide-react';
import { 
  Tabs, 
  Modal, 
  Select, 
  Input, 
  DatePicker, 
  Tag, 
  Tooltip, 
  message, 
  Spin, 
  Empty 
} from 'antd';
import { supabase } from '@/lib/supabase';
import { TiltCard } from '@/components/TiltCard';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const { Option } = Select;
const { TextArea } = Input;

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
}

interface Transcription {
  id: string;
  file_name: string;
  google_drive_file_id: string | null;
  content: string;
  transcribed_at: string;
  project_id: string | null;
  ai_summary: string | null;
  ai_insights: string | null;
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex justify-center items-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  
  // Navigation & Active States
  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form & Modals States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newProjectId, setNewProjectId] = useState<string | null>(null);

  // Project Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalLoading, setProjectModalLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState<string>('emerald');
  const [newDueDate, setNewDueDate] = useState<any>(null);
  const [columnToAddTask, setColumnToAddTask] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  // Curated AI Tasks States (TD-G03 & TD-G04)
  const [proposedTasks, setProposedTasks] = useState<any[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Transcription Filters States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  useEffect(() => {
    if (tab === 'projects') {
      setActiveTab('projects');
    } else if (tab === 'transcriptions') {
      setActiveTab('transcriptions');
    } else {
      setActiveTab('tasks');
    }
  }, [tab]);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      await fetchData(user.id);
      setupRealTimeSubscriptions(user.id);
    } catch (err) {
      console.error('Error fetching initial tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (userId: string) => {
    try {
      // Parallel fetch of all task-related datasets to eliminate waterfall latency
      const [
        { data: dbProjects },
        { data: dbTasks },
        { data: dbTranscriptions }
      ] = await Promise.all([
        supabase.from('tasks_projects').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('transcriptions').select('*').eq('user_id', userId).order('transcribed_at', { ascending: false })
      ]);
      
      setProjects(dbProjects || []);
      setTasks(dbTasks || []);
      setTranscriptions(dbTranscriptions || []);

      // Automatically select the first transcription for the AI command hub
      if (dbTranscriptions && dbTranscriptions.length > 0) {
        setSelectedTranscription(dbTranscriptions[0]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const setupRealTimeSubscriptions = (userId: string) => {
    // Tasks Subscriptions
    const tasksChannel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Task) : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id === payload.old.id));
          }
        }
      )
      .subscribe();

    // Transcriptions Subscriptions
    const transcriptionsChannel = supabase
      .channel('transcriptions-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transcriptions', filter: `user_id=eq.${userId}` },
        (payload) => {
          setTranscriptions(prev => prev.map(tr => tr.id === payload.new.id ? (payload.new as Transcription) : tr));
          setSelectedTranscription(prev => prev?.id === payload.new.id ? (payload.new as Transcription) : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(transcriptionsChannel);
    };
  };

  // --- Task Operations ---
  const handleOpenTaskModal = (column: 'todo' | 'in_progress' | 'completed') => {
    setColumnToAddTask(column);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      message.warning('O título da atividade é obrigatório!');
      return;
    }

    try {
      setModalLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: newProjectId,
          title: newTitle,
          description: newDescription,
          status: columnToAddTask,
          priority: newPriority,
          due_date: newDueDate ? newDueDate.toISOString() : null
        })
        .select('*');

      if (error) throw error;

      message.success('Atividade criada com sucesso!');
      setIsTaskModalOpen(false);
      
      // Reset Form fields
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewProjectId(null);
      setNewDueDate(null);
    } catch (err: any) {
      message.error(err.message || 'Erro ao criar atividade.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
      message.success('Status da atividade atualizado!');
    } catch (err: any) {
      message.error(err.message || 'Erro ao atualizar status.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
      message.success('Atividade removida com sucesso.');
    } catch (err: any) {
      message.error(err.message || 'Erro ao remover atividade.');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      message.warning('O nome do projeto é obrigatório!');
      return;
    }

    try {
      setProjectModalLoading(true);
      const { data, error } = await supabase
        .from('tasks_projects')
        .insert({
          user_id: user.id,
          name: newProjectName,
          description: newProjectDesc,
          color: newProjectColor
        })
        .select('*');

      if (error) throw error;

      message.success('Projeto criado com sucesso!');
      setIsProjectModalOpen(false);
      
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectColor('emerald');

      // Refresh data
      await fetchData(user.id);
    } catch (err: any) {
      message.error(err.message || 'Erro ao criar projeto.');
    } finally {
      setProjectModalLoading(false);
    }
  };

  // --- IA Gemini Command Operations ---
  const handleTriggerGeminiAI = async () => {
    if (!selectedTranscription) return;

    try {
      setAiLoading(true);
      message.info('Iniciando análise semântica com o Gemini Pro...');

      // Call API Route to generate tasks and summary from transcription
      const response = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcriptionId: selectedTranscription.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar áudio com IA.');
      }

      // Update selected transcription state in place to show new summary and insights
      setSelectedTranscription(prev => prev ? { 
        ...prev, 
        ai_summary: result.summary,
        ai_insights: result.insights
      } : null);

      // Force refresh transcriptions list to show "Audited" badge in list too
      setTranscriptions(prev => prev.map(tr => tr.id === selectedTranscription.id ? {
        ...tr,
        ai_summary: result.summary,
        ai_insights: result.insights
      } : tr));

      if (result.tasks && result.tasks.length > 0) {
        // Map tasks with initial check state and local ID for editing
        const mappedProposedTasks = result.tasks.map((t: any, index: number) => ({
          id: `proposed-${index}`,
          title: t.title,
          description: t.description,
          priority: t.priority === 'low' || t.priority === 'medium' || t.priority === 'high' ? t.priority : 'medium',
          daysFromNow: t.daysFromNow !== undefined ? t.daysFromNow : 3,
          checked: true
        }));
        
        setProposedTasks(mappedProposedTasks);
        setIsPreviewModalOpen(true);
        message.success('Gemini Brain concluiu a análise! Analise o plano de ação proposto.');
      } else {
        message.success('Gemini Brain concluiu a análise, mas nenhuma tarefa foi proposta.');
      }

    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Falha ao processar comando do Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveCuratedTasks = async () => {
    const checkedTasks = proposedTasks.filter(t => t.checked);
    if (checkedTasks.length === 0) {
      message.warning('Nenhuma atividade selecionada para salvar!');
      return;
    }

    try {
      setPreviewLoading(true);
      
      const tasksToInsert = checkedTasks.map(t => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (t.daysFromNow || 3));

        return {
          user_id: user.id,
          project_id: selectedTranscription?.project_id || null,
          title: t.title,
          description: t.description,
          status: 'todo',
          priority: t.priority === 'low' || t.priority === 'medium' || t.priority === 'high' ? t.priority : 'medium',
          due_date: dueDate.toISOString()
        };
      });

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      message.success(`${checkedTasks.length} atividades cadastradas com sucesso no Kanban!`);
      setIsPreviewModalOpen(false);
      setProposedTasks([]);

      // Force fetch active tasks list
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTasks(dbTasks || []);

    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Erro ao salvar atividades selecionadas.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Filters and Formatting Helpers ---
  const getProjectBadgeColor = (colorName: string) => {
    const map: { [key: string]: string } = {
      emerald: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      blue: 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400',
      indigo: 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      amber: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      pink: 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400',
      violet: 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    };
    return map[colorName] || 'border-slate-500 bg-slate-500/10 text-slate-600';
  };

  const getPriorityTag = (priority: 'low' | 'medium' | 'high') => {
    const map = {
      high: { color: 'red', text: 'Alta Prioridade' },
      medium: { color: 'blue', text: 'Média' },
      low: { color: 'default', text: 'Baixa' }
    };
    return <Tag color={map[priority].color}>{map[priority].text}</Tag>;
  };

  // Filter Tasks by active Project Filter
  const filteredTasks = tasks.filter(task => {
    if (!activeProjectFilter) return true;
    return task.project_id === activeProjectFilter;
  });

  // Filter & Sort Transcriptions list
  const filteredTranscriptions = transcriptions.filter(tr => {
    const matchesSearch = searchQuery.trim() === '' || 
      tr.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tr.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProject = !filterProject || tr.project_id === filterProject;

    return matchesSearch && matchesProject;
  }).sort((a, b) => {
    const dateA = new Date(a.transcribed_at).getTime();
    const dateB = new Date(b.transcribed_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  if (loading || !mounted) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/10">
      {/* Top Welcome Panel */}
      <div className="p-8 pb-4 border-b border-white/20 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black dark:text-white flex items-center gap-2 tracking-tight">
            G-Work <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            Planejamento Tático de Projetos & Gravações
          </p>
        </div>

        {/* Tab switcher using customizable visual layout */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/50 dark:border-white/5">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListTodo className="w-4 h-4" /> Quadro Kanban
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" /> Projetos
          </button>
          <button
            onClick={() => setActiveTab('transcriptions')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'transcriptions'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" /> Transcrições Drive
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'tasks' ? (
          /* =========================================================================
             1. KANBAN BOARD VIEW
             ========================================================================= */
          <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
            
            {/* Attribution Grid (Projects Horizontal List) */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Painel de Atribuições (Projetos Ativos)</h4>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {/* "All" button card */}
                <button
                  onClick={() => setActiveProjectFilter(null)}
                  className={`px-6 py-4 rounded-3xl border backdrop-blur-md text-left transition-all duration-300 cursor-pointer min-w-[140px] flex flex-col justify-between aspect-[1.8/1] ${
                    activeProjectFilter === null
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 scale-[1.02]'
                      : 'bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <LayersIcon className="w-5 h-5" />
                  <div>
                    <h5 className="font-black text-sm dark:text-white">Todos os Projetos</h5>
                    <p className="text-[10px] opacity-80 mt-0.5">{tasks.length} atividades</p>
                  </div>
                </button>

                {projects.map((proj) => {
                  const isActive = activeProjectFilter === proj.id;
                  const projectTasksCount = tasks.filter(t => t.project_id === proj.id).length;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => setActiveProjectFilter(proj.id)}
                      className={`px-6 py-4 rounded-3xl border backdrop-blur-md text-left transition-all duration-300 cursor-pointer min-w-[200px] flex flex-col justify-between aspect-[1.8/1] ${
                        isActive
                          ? `border-${proj.color}-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 scale-[1.02]`
                          : 'bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full bg-${proj.color}-500 block`}></span>
                      <div>
                        <h5 className="font-black text-sm dark:text-white truncate max-w-[170px]">{proj.name}</h5>
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{proj.description || 'Sem descrição'}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{projectTasksCount} ativas</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kanban columns Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
              
              {/* Column 1: A Fazer */}
              <div className="flex flex-col bg-slate-100/40 dark:bg-slate-900/40 rounded-[32px] border border-slate-200/50 dark:border-white/5 p-5 overflow-hidden">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <h4 className="font-black text-sm uppercase dark:text-white tracking-tight">A Fazer</h4>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[10px] font-black rounded-lg dark:text-white">
                      {todoTasks.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenTaskModal('todo')}
                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                  {todoTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs uppercase font-bold tracking-wider">Coluna Vazia</div>
                  ) : (
                    todoTasks.map(task => renderTaskCard(task, 'in_progress', 'Em Andamento'))
                  )}
                </div>
              </div>

              {/* Column 2: Em Andamento */}
              <div className="flex flex-col bg-slate-100/40 dark:bg-slate-900/40 rounded-[32px] border border-slate-200/50 dark:border-white/5 p-5 overflow-hidden">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <h4 className="font-black text-sm uppercase dark:text-white tracking-tight">Em Progresso</h4>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-[10px] font-black rounded-lg text-blue-600 dark:text-blue-400">
                      {inProgressTasks.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenTaskModal('in_progress')}
                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                  {inProgressTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs uppercase font-bold tracking-wider">Coluna Vazia</div>
                  ) : (
                    inProgressTasks.map(task => renderTaskCard(task, 'completed', 'Concluir'))
                  )}
                </div>
              </div>

              {/* Column 3: Concluído */}
              <div className="flex flex-col bg-slate-100/40 dark:bg-slate-900/40 rounded-[32px] border border-slate-200/50 dark:border-white/5 p-5 overflow-hidden">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h4 className="font-black text-sm uppercase dark:text-white tracking-tight">Concluído</h4>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-[10px] font-black rounded-lg text-emerald-600 dark:text-emerald-400">
                      {completedTasks.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenTaskModal('completed')}
                    className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs uppercase font-bold tracking-wider">Coluna Vazia</div>
                  ) : (
                    completedTasks.map(task => renderTaskCard(task, 'todo', 'Refazer'))
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : activeTab === 'projects' ? (
          /* =========================================================================
             3. PROJECTS VIEW
             ========================================================================= */
          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativos</h4>
                <h3 className="text-xl font-black dark:text-white mt-1 tracking-tight">Meus Projetos & Iniciativas</h3>
              </div>
              <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Projeto
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-20 bg-white/10 dark:bg-slate-900/10 rounded-[32px] border border-dashed border-slate-200 dark:border-white/5">
                <Target className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
                <h5 className="font-black text-sm dark:text-white uppercase tracking-tight">Nenhum Projeto Ativo</h5>
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                  Crie seu primeiro projeto para segmentar suas atividades, transcrever áudios focados e auditar metas com IA.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((proj) => {
                  const projectTasks = tasks.filter(t => t.project_id === proj.id);
                  const completedCount = projectTasks.filter(t => t.status === 'completed').length;
                  const totalCount = projectTasks.length;
                  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  
                  return (
                    <TiltCard key={proj.id} className="bg-slate-950/40 backdrop-blur-xl p-8 rounded-[48px] border border-slate-800/80 hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden flex flex-col justify-between aspect-[1.1/1] shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.04)]">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-start">
                          <span className={`w-3.5 h-3.5 rounded-full bg-${proj.color}-500 shadow-[0_0_15px_rgba(0,0,0,0.2)] block`}></span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                            {totalCount} ativas
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-xl font-black text-white tracking-[-0.02em] group-hover:text-blue-400 transition-colors">
                            {proj.name}
                          </h4>
                          <p className="text-slate-300 font-medium text-xs mt-3 leading-relaxed line-clamp-3">
                            {proj.description || 'Sem descrição cadastrada para este projeto.'}
                          </p>
                        </div>
                      </div>

                      {/* Progress tracker */}
                      <div className="space-y-3 relative z-10 pt-6 border-t border-slate-800/80">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Progresso</span>
                          <span className="text-white font-black">{percentComplete}%</span>
                        </div>
                        <div className="w-full bg-slate-900 border border-slate-800/50 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${percentComplete}%` }}
                          ></div>
                        </div>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             2. TRANSCRIPTIONS & AI COMMAND HUB VIEW
             ========================================================================= */
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left Column: Transcriptions list with Filters */}
            <div className="w-full lg:w-[450px] border-r border-white/20 dark:border-white/5 flex flex-col overflow-hidden bg-white/10 dark:bg-slate-900/10">
              
              {/* Search & Filters block */}
              <div className="p-6 border-b border-white/20 dark:border-white/5 space-y-4 bg-white/20 dark:bg-slate-900/20">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar palavras-chave..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    placeholder="Filtrar por Projeto"
                    allowClear
                    value={filterProject}
                    onChange={(val) => setFilterProject(val)}
                    className="w-full text-xs"
                    dropdownStyle={{ borderRadius: '16px' }}
                  >
                    {projects.map(p => (
                      <Option key={p.id} value={p.id}>{p.name}</Option>
                    ))}
                  </Select>

                  <Select
                    value={sortOrder}
                    onChange={(val) => setSortOrder(val)}
                    className="w-full text-xs"
                  >
                    <Option value="desc">Mais Recentes</Option>
                    <Option value="asc">Mais Antigas</Option>
                  </Select>
                </div>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3 no-scrollbar">
                {filteredTranscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Empty description="Nenhuma transcrição correspondente." />
                  </div>
                ) : (
                  filteredTranscriptions.map((tr) => {
                    const isSelected = selectedTranscription?.id === tr.id;
                    const linkedProject = projects.find(p => p.id === tr.project_id);
                    return (
                      <div
                        key={tr.id}
                        onClick={() => setSelectedTranscription(tr)}
                        className={`p-5 rounded-[24px] border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between aspect-[2.1/1] ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 scale-[1.01] shadow-md shadow-blue-500/5'
                            : 'bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[200px]">
                              {tr.file_name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">
                              {dayjs(tr.transcribed_at).format('DD MMM • HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm font-black dark:text-white line-clamp-2 leading-tight">
                            {tr.content}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 mt-2">
                          {linkedProject ? (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getProjectBadgeColor(linkedProject.color)}`}>
                              {linkedProject.name}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              Geral
                            </span>
                          )}

                          {tr.ai_summary ? (
                            <Tag color="emerald" className="m-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Audited by AI</Tag>
                          ) : (
                            <Tag color="gold" className="m-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Pending IA</Tag>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Right Column: AI Command Hub Details Panel */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
              {selectedTranscription ? (
                <div className="max-w-3xl space-y-8 animate-in">
                  
                  {/* Header Title block */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/40 dark:bg-slate-800/40 p-6 rounded-[32px] border border-white/50 dark:border-white/5 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
                        <Mic className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg dark:text-white truncate max-w-[350px] sm:max-w-md">
                          {selectedTranscription.file_name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                          Microfone Gravador • Transcrito em {dayjs(selectedTranscription.transcribed_at).format('DD [de] MMMM [às] HH:mm')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerGeminiAI}
                      disabled={aiLoading}
                      className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 self-stretch sm:self-auto text-center"
                    >
                      {aiLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Auditar com Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 animate-bounce" />
                          Disparar Gemini AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* Raw Text Content */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto Transcrito Bruto</h5>
                    <div className="p-6 rounded-[32px] bg-white/40 dark:bg-slate-900/40 border border-white/30 dark:border-white/5 shadow-inner">
                      <p className="text-sm dark:text-white leading-relaxed font-bold">
                        "{selectedTranscription.content}"
                      </p>
                    </div>
                  </div>

                  {/* AI Results Section */}
                  {aiLoading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center bg-white/30 dark:bg-slate-900/30 rounded-[40px] border border-white/20 border-dashed space-y-4">
                      <Spin size="large" className="text-blue-500" />
                      <p className="text-sm font-black text-blue-500 uppercase tracking-widest animate-pulse mt-2">
                        O Gemini Brain está interpretando sua fala, extraindo planos de ação e montando novas tarefas...
                      </p>
                    </div>
                  ) : selectedTranscription.ai_summary ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in">
                      
                      {/* Summary Block */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-500" /> Resumo Executivo da IA
                        </h5>
                        <div className="p-6 rounded-[32px] bg-emerald-500/5 dark:bg-emerald-500/2 border border-emerald-500/10 shadow-sm h-full flex flex-col justify-between">
                          <p className="text-sm dark:text-slate-200 leading-relaxed font-medium">
                            {selectedTranscription.ai_summary}
                          </p>
                          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest block mt-4">
                            Processado com sucesso pelo Gemini Pro
                          </span>
                        </div>
                      </div>

                      {/* Strategic Insights */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" /> Insights e Plano de Ação
                        </h5>
                        <div className="p-6 rounded-[32px] bg-blue-500/5 dark:bg-blue-500/2 border border-blue-500/10 shadow-sm h-full flex flex-col justify-between">
                          <p className="text-sm dark:text-slate-200 leading-relaxed font-medium">
                            {selectedTranscription.ai_insights}
                          </p>
                          <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest block mt-4">
                            Tarefas correspondentes inseridas no Kanban
                          </span>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* Pending AI state */
                    <div className="p-12 text-center flex flex-col items-center justify-center bg-white/30 dark:bg-slate-900/30 rounded-[40px] border border-white/20 border-dashed space-y-4">
                      <Sparkles className="w-10 h-10 text-slate-300 animate-pulse" />
                      <div>
                        <h6 className="font-black text-sm dark:text-white uppercase tracking-tight">Análise Pendente da Inteligência Artificial</h6>
                        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                          Dispare o Gemini AI para analisar semântica do áudio, produzir resumos corporativos e cadastrar de forma completamente autônoma suas tarefas em lote.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Empty description="Nenhuma gravação selecionada." />
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* =========================================================================
         MODALS & FORMS
         ========================================================================= */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2">
            <LayersIcon className="w-5 h-5 text-blue-500" />
            <span className="font-black text-lg dark:text-white">Nova Atividade</span>
          </div>
        }
        open={isTaskModalOpen}
        onOk={handleCreateTask}
        onCancel={() => setIsTaskModalOpen(false)}
        confirmLoading={modalLoading}
        okText="Criar Atividade"
        cancelText="Cancelar"
        className="glass-modal dark:bg-slate-900"
        okButtonProps={{ className: 'bg-blue-500 hover:bg-blue-600 rounded-xl font-bold border-none h-10 px-5 text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/20' }}
        cancelButtonProps={{ className: 'rounded-xl font-bold h-10 px-5 text-xs uppercase tracking-widest cursor-pointer' }}
        maskStyle={{ backdropFilter: 'blur(10px)' }}
        style={{ borderRadius: '32px', overflow: 'hidden' }}
      >
        <div className="space-y-5 pt-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título da Atividade</label>
            <Input
              placeholder="O que precisa ser feito?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição / Contexto</label>
            <TextArea
              rows={3}
              placeholder="Adicione detalhes, observações ou metas..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Prioridade</label>
              <Select
                value={newPriority}
                onChange={(val) => setNewPriority(val)}
                className="w-full h-11"
                dropdownStyle={{ borderRadius: '16px' }}
              >
                <Option value="low">Baixa</Option>
                <Option value="medium">Média</Option>
                <Option value="high">Alta Prioridade</Option>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vencimento</label>
              <DatePicker
                placeholder="Prazo limite"
                value={newDueDate}
                onChange={(date) => setNewDueDate(date)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl"
                format="DD/MM/YYYY"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vincular a Projeto</label>
            <Select
              placeholder="Selecionar projeto ou cliente"
              allowClear
              value={newProjectId}
              onChange={(val) => setNewProjectId(val)}
              className="w-full h-11"
              dropdownStyle={{ borderRadius: '16px' }}
            >
              {projects.map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2 pb-2">
            <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="font-black text-lg dark:text-white">Curadoria de Tarefas IA</span>
          </div>
        }
        open={isPreviewModalOpen}
        onOk={handleSaveCuratedTasks}
        onCancel={() => {
          setIsPreviewModalOpen(false);
          setProposedTasks([]);
        }}
        confirmLoading={previewLoading}
        okText={`Cadastrar ${proposedTasks.filter(t => t.checked).length} Atividades`}
        cancelText="Descartar Tudo"
        className="glass-modal dark:bg-slate-900"
        okButtonProps={{ 
          className: 'bg-blue-500 hover:bg-blue-600 rounded-xl font-bold border-none h-10 px-5 text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/20',
          disabled: proposedTasks.filter(t => t.checked).length === 0
        }}
        cancelButtonProps={{ className: 'rounded-xl font-bold h-10 px-5 text-xs uppercase tracking-widest cursor-pointer hover:text-red-500 transition-colors' }}
        maskStyle={{ backdropFilter: 'blur(10px)' }}
        width={720}
        style={{ borderRadius: '32px', overflow: 'hidden' }}
      >
        <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
            Selecione, revise e edite o plano de ação derivado da transcrição antes do envio tático:
          </p>

          {proposedTasks.map((task) => (
            <div 
              key={task.id} 
              className={`p-5 rounded-[24px] border backdrop-blur-md transition-all duration-300 flex items-start gap-4 ${
                task.checked 
                  ? 'bg-blue-500/5 border-blue-500/30' 
                  : 'bg-slate-100/10 dark:bg-slate-900/10 border-slate-200 dark:border-white/5 opacity-50'
              }`}
            >
              {/* Checkbox */}
              <input 
                type="checkbox" 
                checked={task.checked}
                onChange={(e) => {
                  setProposedTasks(prev => prev.map(t => t.id === task.id ? { ...t, checked: e.target.checked } : t));
                }}
                className="w-5 h-5 rounded-md border-slate-300 dark:border-white/10 text-blue-500 focus:ring-blue-500 mt-1.5 cursor-pointer"
              />

              {/* Task Fields */}
              <div className="flex-1 space-y-3">
                <div className="flex gap-4">
                  {/* Title */}
                  <Input
                    placeholder="Título da Atividade"
                    value={task.title}
                    disabled={!task.checked}
                    onChange={(e) => {
                      setProposedTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: e.target.value } : t));
                    }}
                    className="flex-1 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-black focus:outline-none"
                  />
                  
                  {/* Priority Select */}
                  <Select
                    value={task.priority}
                    disabled={!task.checked}
                    onChange={(val) => {
                      setProposedTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: val } : t));
                    }}
                    className="w-32 h-9"
                    dropdownStyle={{ borderRadius: '16px' }}
                  >
                    <Option value="low">Baixa</Option>
                    <Option value="medium">Média</Option>
                    <Option value="high">Alta</Option>
                  </Select>
                </div>

                {/* Description */}
                <TextArea
                  rows={2}
                  placeholder="Descrição da atividade..."
                  value={task.description}
                  disabled={!task.checked}
                  onChange={(e) => {
                    setProposedTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: e.target.value } : t));
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:outline-none"
                />

                {/* Date suggestion indicator */}
                <div className="flex items-center gap-4 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Prazo sugerido: {task.daysFromNow === 0 ? 'Hoje' : task.daysFromNow === 1 ? 'Amanhã' : `Em ${task.daysFromNow} dias`}
                  </span>
                  
                  {/* Days adjustment slider or input */}
                  <div className="flex items-center gap-2">
                    <span>Ajustar prazo (dias):</span>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      disabled={!task.checked}
                      value={task.daysFromNow}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setProposedTasks(prev => prev.map(t => t.id === task.id ? { ...t, daysFromNow: isNaN(val) ? 0 : val } : t));
                      }}
                      className="w-16 py-1 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2 pb-2">
            <Target className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="font-black text-lg dark:text-white">Novo Projeto</span>
          </div>
        }
        open={isProjectModalOpen}
        onOk={handleCreateProject}
        onCancel={() => setIsProjectModalOpen(false)}
        confirmLoading={projectModalLoading}
        okText="Criar Projeto"
        cancelText="Cancelar"
        className="glass-modal dark:bg-slate-900"
        okButtonProps={{ className: 'bg-blue-500 hover:bg-blue-600 rounded-xl font-bold border-none h-10 px-5 text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/20' }}
        cancelButtonProps={{ className: 'rounded-xl font-bold h-10 px-5 text-xs uppercase tracking-widest cursor-pointer' }}
        maskStyle={{ backdropFilter: 'blur(10px)' }}
        style={{ borderRadius: '32px', overflow: 'hidden' }}
      >
        <div className="space-y-5 pt-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome do Projeto</label>
            <Input
              placeholder="Ex: Reengenharia de App, Synapse Core..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descrição / Escopo</label>
            <TextArea
              rows={3}
              placeholder="Adicione objetivos estratégicos, cliente ou cronograma..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cor de Identificação</label>
            <Select
              value={newProjectColor}
              onChange={(val) => setNewProjectColor(val)}
              className="w-full h-11"
              dropdownStyle={{ borderRadius: '16px' }}
            >
              <Option value="emerald">Verde Esmeralda (G-Finance)</Option>
              <Option value="blue">Azul Cobalto (G-Work)</Option>
              <Option value="indigo">Índigo Real</Option>
              <Option value="amber">Âmbar Dourado</Option>
              <Option value="pink">Rosa Vibrante</Option>
              <Option value="violet">Violeta Profundo</Option>
            </Select>
          </div>
        </div>
      </Modal>

    </main>
  );

  // --- Card Render Sub-Helper ---
  function renderTaskCard(task: Task, nextStatus: 'todo' | 'in_progress' | 'completed', nextStatusLabel: string) {
    const linkedProject = projects.find(p => p.id === task.project_id);
    const isHighPriority = task.priority === 'high';
    const isCompleted = task.status === 'completed';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

    return (
      <div
        key={task.id}
        className={`bg-white dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 relative group flex flex-col justify-between gap-4 border-l-4 ${
          linkedProject ? `border-l-${linkedProject.color}-500` : 'border-l-slate-400'
        }`}
      >
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {linkedProject ? linkedProject.name : 'Geral'}
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                title="Deletar tarefa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <h5 className={`font-black text-sm dark:text-white leading-tight ${
            isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}>
            {task.title}
          </h5>
          
          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {getPriorityTag(task.priority)}

            {task.due_date && (
              <span className={`text-[10px] font-bold flex items-center gap-1 ${
                isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-400'
              }`}>
                {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {dayjs(task.due_date).format('DD MMM')}
              </span>
            )}
          </div>

          <button
            onClick={() => handleUpdateTaskStatus(task.id, nextStatus)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 ${
              isCompleted
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                : task.status === 'in_progress'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10 hover:bg-emerald-600'
                  : 'bg-blue-500 text-white shadow-sm shadow-blue-500/10 hover:bg-blue-600'
            }`}
          >
            {isCompleted ? <CornerUpLeft className="w-3 h-3" /> : <Play className="w-2.5 h-2.5" />}
            {nextStatusLabel}
          </button>
        </div>
      </div>
    );
  }
}

// Icons sub-components to support styling imports
function LayersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-10 5 10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}
