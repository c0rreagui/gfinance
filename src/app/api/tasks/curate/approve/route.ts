import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const maxDuration = 300;

// Helper function to recursively insert hierarchical work items into Supabase
async function insertWorkItemsRecursive(
  supabase: any,
  userId: string,
  projectId: string | null,
  transcriptionId: string,
  items: any[],
  parentId: string | null = null
): Promise<string[]> {
  const insertedIds: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Calculate due_date based on daysFromNow
    let dueDate: string | null = null;
    if (typeof item.daysFromNow === 'number') {
      const date = new Date();
      date.setDate(date.getDate() + item.daysFromNow);
      dueDate = date.toISOString();
    }
    
    // Insert current item
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: item.title,
        description: item.description || null,
        status: 'todo',
        priority: item.priority || 'medium',
        type: item.type || 'task',
        parent_id: parentId,
        sort_order: i,
        ai_generated: true,
        ai_confidence: 0.95,
        source_transcription_id: transcriptionId,
        due_date: dueDate
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('[Approve Curation - insertWorkItemsRecursive] Error inserting task:', error);
      continue;
    }
    
    const insertedId = data.id;
    insertedIds.push(insertedId);
    
    // If this item has children, recursively insert them under this parent
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const childIds = await insertWorkItemsRecursive(
        supabase,
        userId,
        projectId,
        transcriptionId,
        item.children,
        insertedId
      );
      insertedIds.push(...childIds);
    }
  }
  
  return insertedIds;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { transcriptionId, approvedMemories } = body;

    if (!transcriptionId) {
      return NextResponse.json({ error: 'ID de transcrição ausente.' }, { status: 400 });
    }

    // 1. Fetch transcription record from database
    const { data: transcription, error: fetchError } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !transcription) {
      return NextResponse.json({ error: 'Transcrição não encontrada ou sem acesso.' }, { status: 404 });
    }

    const entities = transcription.extracted_entities as any;
    if (!entities) {
      return NextResponse.json({ error: 'Rascunho não encontrado. Analise com a IA primeiro.' }, { status: 400 });
    }

    const projectId = transcription.project_id;
    const workItems = entities.work_items || [];
    const insights = entities.insights || [];

    // 2. Insert work items recursively into DB
    let allInsertedWorkItemIds: string[] = [];
    if (workItems.length > 0) {
      allInsertedWorkItemIds = await insertWorkItemsRecursive(
        supabase,
        user.id,
        projectId,
        transcriptionId,
        workItems
      );
    }

    // 3. Insert insights into DB
    if (insights.length > 0) {
      const insightsToInsert = insights.map((insight: any) => ({
        user_id: user.id,
        insight_type: insight.insight_type,
        title: insight.title,
        body: insight.body,
        severity: insight.severity || 'info',
        related_work_items: allInsertedWorkItemIds,
        related_transcriptions: [transcriptionId],
        dismissed: false,
        acted_on: false
      }));

      const { error: insightsError } = await supabase
        .from('ai_insights')
        .insert(insightsToInsert);

      if (insightsError) {
        console.error('[Approve Curation] Error inserting insights:', insightsError);
      }
    }

    // 4. Save approved agent memories
    if (approvedMemories && Array.isArray(approvedMemories) && approvedMemories.length > 0) {
      const rowsToInsert = approvedMemories.map((content: string) => ({
        user_id: user.id,
        content: content.trim(),
        memory_type: 'rule',
        source_transcription_id: transcriptionId,
        is_active: true
      }));

      const { error: memoriesError } = await supabase
        .from('agent_memories')
        .insert(rowsToInsert);

      if (memoriesError) {
        console.error('[Approve Curation] Error inserting memories:', memoriesError);
      }
    }

    // 5. Update transcription to mark as processed/audited
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        processed_at: new Date().toISOString()
      })
      .eq('id', transcriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      insertedTasksCount: allInsertedWorkItemIds.length
    });

  } catch (err: any) {
    console.error('[Curation Approve API Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao aprovar curadoria.' }, { status: 500 });
  }
}
