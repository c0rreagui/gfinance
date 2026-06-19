import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidGoogleToken } from '@/lib/google-auth';
import { insertGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// POST: Create a new calendar event (local + Google Calendar sync)
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    let userId = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, start_time, end_time, location, is_all_day, color, category } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }

    // 1. Insert local event first
    const { data: localEvent, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        start_time,
        end_time,
        location: location || null,
        is_all_day: !!is_all_day,
        color: color || '#6366f1',
        category: category || 'general',
      })
      .select('*')
      .single();

    if (insertError || !localEvent) {
      throw new Error(`Erro ao salvar evento localmente: ${insertError?.message}`);
    }

    // 2. Try to sync to Google Calendar if credentials exist
    let googleEventId = null;
    try {
      const googleToken = await getValidGoogleToken(userId);
      if (googleToken) {
        const googleEvent = await insertGoogleEvent(googleToken, {
          title,
          description,
          start_time,
          end_time,
          location,
        });
        
        if (googleEvent && googleEvent.id) {
          googleEventId = googleEvent.id;
          
          // Update local event with google_event_id
          const { data: updatedEvent } = await supabase
            .from('calendar_events')
            .update({ google_event_id: googleEventId })
            .eq('id', localEvent.id)
            .select('*')
            .single();
            
          if (updatedEvent) {
            return NextResponse.json(updatedEvent, { status: 201 });
          }
        }
      }
    } catch (googleErr: any) {
      console.warn('[Google Calendar Sync Warning] Failed to push event to Google Calendar:', googleErr.message || googleErr);
      // Return local event anyway - hybrid robustness!
      return NextResponse.json({
        ...localEvent,
        sync_warning: 'Não foi possível sincronizar com o Google Agenda.'
      }, { status: 201 });
    }

    return NextResponse.json(localEvent, { status: 201 });

  } catch (err: any) {
    console.error('[Calendar Event Create Route Error]:', err.message || err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE: Remove a calendar event (local + Google Calendar sync)
export async function DELETE(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    let userId = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    // 1. Fetch event first to get google_event_id
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select('google_event_id')
      .eq('id', eventId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    // 2. Delete local event
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Erro ao deletar evento localmente: ${deleteError.message}`);
    }

    // 3. Delete from Google Calendar if linked
    if (event.google_event_id) {
      try {
        const googleToken = await getValidGoogleToken(userId);
        if (googleToken) {
          await deleteGoogleEvent(googleToken, event.google_event_id);
        }
      } catch (googleErr: any) {
        console.warn('[Google Calendar Sync Warning] Failed to delete event from Google Calendar:', googleErr.message || googleErr);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('[Calendar Event Delete Route Error]:', err.message || err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
