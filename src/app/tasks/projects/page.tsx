'use client';

import React, { useState } from 'react';
import { useGWork } from '@/app/tasks/layout';
import { supabase } from '@/lib/supabase';
import { TiltCard } from '@/components/TiltCard';
import { 
  Plus, 
  FolderKanban, 
  Search, 
  X, 
  Check, 
  Layers,
  FileText,
  Clock,
  TrendingUp,
  Tag
} from 'lucide-react';

export default function ProjectsPage() {
  const { user, projects, workItems, refreshData } = useGWork();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectColor, setProjectColor] = useState('emerald');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    { name: 'emerald', bg: 'bg-emerald-500', text: 'emerald' },
    { name: 'blue', bg: 'bg-blue-500', text: 'blue' },
    { name: 'indigo', bg: 'bg-indigo-500', text: 'indigo' },
    { name: 'amber', bg: 'bg-amber-500', text: 'amber' },
    { name: 'pink', bg: 'bg-pink-500', text: 'pink' },
    { name: 'violet', bg: 'bg-violet-500', text: 'violet' }
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !user) {
      setError('O nome do projeto é obrigatório.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('tasks_projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: projectDesc || null,
          color: projectColor
        });

      if (insertError) throw insertError;

      setProjectName('');
      setProjectDesc('');
      setProjectColor('emerald');
      setIsModalOpen(false);
      refreshData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao criar projeto.');
    } finally {
      setCreating(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50/10 dark:bg-slate-950/10">
      {/* Top Controls Bar */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/5 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black dark:text-white tracking-tight flex items-center gap-1.5">
            <FolderKanban className="w-5 h-5 text-blue-500" /> Projetos
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gestão de módulos e áreas de trabalho</p>
        </div>

        {/* Search & Add */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-48 pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Projects Grid Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white/10 dark:bg-slate-900/10 rounded-[32px] border border-dashed border-slate-200 dark:border-white/5 max-w-lg mx-auto">
            <FolderKanban className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
            <h5 className="font-bold text-sm dark:text-white uppercase tracking-tight">Nenhum projeto encontrado</h5>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
              Crie seu primeiro projeto para segmentar suas metas e auditar transcrições do Google Drive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => {
              const projectTasks = workItems.filter(t => t.project_id === proj.id);
              const completedCount = projectTasks.filter(t => t.status === 'done').length;
              const totalCount = projectTasks.length;
              const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500 shadow-emerald-500/10 border-emerald-500/20',
                blue: 'bg-blue-500 shadow-blue-500/10 border-blue-500/20',
                indigo: 'bg-indigo-500 shadow-indigo-500/10 border-indigo-500/20',
                amber: 'bg-amber-500 shadow-amber-500/10 border-amber-500/20',
                pink: 'bg-pink-500 shadow-pink-500/10 border-pink-500/20',
                violet: 'bg-violet-500 shadow-violet-500/10 border-violet-500/20'
              };
              
              const projectColorClass = colorMap[proj.color] || 'bg-slate-500';

              return (
                <TiltCard key={proj.id} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-blue-500/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between aspect-[1.2/1]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className={`w-3.5 h-3.5 rounded-full ${projectColorClass} block`}></span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded">
                        {totalCount} itens
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white truncate">
                        {proj.name}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-2 leading-relaxed line-clamp-3">
                        {proj.description || 'Sem descrição cadastrada para este projeto.'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2 pt-4 border-t border-slate-200/60 dark:border-white/5 mt-4">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Metas completas</span>
                      <span className="text-slate-800 dark:text-white font-black">{percentComplete}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
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

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md glass border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <FolderKanban className="w-4.5 h-4.5 text-blue-500" />
                <span>Novo Projeto</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProject} className="py-4 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nome do Projeto</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Integração Pix"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descrição</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Finalidades e escopo..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none resize-none"
                />
              </div>

              {/* Color Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cor Identificadora</label>
                <div className="flex gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setProjectColor(c.name)}
                      className={`w-6 h-6 rounded-full ${c.bg} border-2 transition-all flex items-center justify-center ${
                        projectColor === c.name 
                          ? 'border-slate-800 dark:border-white scale-110 shadow-md shadow-black/20' 
                          : 'border-transparent scale-100 hover:scale-105'
                      }`}
                    >
                      {projectColor === c.name && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{creating ? 'Criando...' : 'Criar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
