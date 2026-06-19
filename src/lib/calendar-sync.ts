/**
 * src/lib/calendar-sync.ts
 *
 * Core synchronizer that replicates Google Calendar events to the Supabase local database.
 * Deletes local events that were removed from Google Calendar.
 */

import { getValidGoogleToken } from './google-auth';
import { listGoogleEvents } from './google-calendar';
import { createSupabaseServerClient } from './supabase-server';

export async function syncGoogleCalendarEvents(userId: string): Promise<{ success: boolean; upsertedCount: number; deletedCount: number }> {
  const supabase = await createSupabaseServerClient();
  
  // 1. Get valid Google access token
  const googleToken = await getValidGoogleToken(userId);
  if (!googleToken) {
    throw new Error('GOOGLE_AUTH_MISSING');
  }

  // 2. Define sync range (e.g. 15 days ago to 45 days in the future to cover active month dashboard views)
  const timeMin = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

  // 3. Fetch events from Google Calendar
  let googleData;
  try {
    googleData = await listGoogleEvents(googleToken, timeMin, timeMax);
  } catch (err: any) {
    // If permission or auth fails, propagate details
    if (err.message.includes('403') || err.message.includes('Insufficient Permission')) {
      throw new Error('GOOGLE_SCOPE_INSUFFICIENT');
    }
    throw err;
  }

  const googleEvents = googleData.items || [];

  // 4. Load local events in range that have a google_event_id
  const { data: localEvents, error: localFetchError } = await supabase
    .from('calendar_events')
    .select('id, google_event_id')
    .eq('user_id', userId)
    .not('google_event_id', 'is', null)
    .gte('start_time', timeMin)
    .lte('start_time', timeMax);

  if (localFetchError) {
    throw new Error(`Failed to fetch local calendar events: ${localFetchError.message}`);
  }

  const googleEventIdsFetched = new Set(googleEvents.map((item: any) => item.id));
  const upsertRows: any[] = [];
  
  // 5. Build upsert rows for fetched Google events
  for (const item of googleEvents) {
    // Skip cancelled events
    if (item.status === 'cancelled') continue;

    // Parse dates (Google dateTime has time, date has only YYYY-MM-DD for full-day events)
    const isAllDay = !!item.start.date;
    const startTime = item.start.dateTime || `${item.start.date}T00:00:00Z`;
    const endTime = item.end.dateTime || `${item.end.date}T23:59:59Z`;

    // Guess category from summary content
    let category = 'general';
    const summaryLower = (item.summary || '').toLowerCase();
    if (summaryLower.includes('work') || summaryLower.includes('reunião') || summaryLower.includes('sync') || summaryLower.includes('meeting') || summaryLower.includes('curador')) {
      category = 'work';
    } else if (summaryLower.includes('pago') || summaryLower.includes('fatura') || summaryLower.includes('pix') || summaryLower.includes('finança')) {
      category = 'finance';
    } else if (summaryLower.includes('pessoal') || summaryLower.includes('médico') || summaryLower.includes('treino')) {
      category = 'personal';
    }

    // Default color tag mapping based on category
    let color = '#6366f1'; // Indigo
    if (category === 'work') color = '#3b82f6'; // Blue
    if (category === 'finance') color = '#10b981'; // Emerald
    if (category === 'personal') color = '#ec4899'; // Pink

    upsertRows.push({
      user_id: userId,
      google_event_id: item.id,
      title: item.summary || 'Sem título',
      description: item.description || '',
      start_time: startTime,
      end_time: endTime,
      location: item.location || '',
      is_all_day: isAllDay,
      color: color,
      category: category,
    });
  }

  // 6. Perform Supabase upsert
  let upsertedCount = 0;
  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('calendar_events')
      .upsert(upsertRows, { onConflict: 'user_id,google_event_id' });

    if (upsertError) {
      throw new Error(`Failed to upsert calendar events: ${upsertError.message}`);
    }
    upsertedCount = upsertRows.length;
  }

  // 7. Find local events to delete (existed in our DB but deleted in Google Calendar)
  const localEventIdsToDelete: string[] = [];
  if (localEvents && localEvents.length > 0) {
    for (const localEv of localEvents) {
      if (localEv.google_event_id && !googleEventIdsFetched.has(localEv.google_event_id)) {
        localEventIdsToDelete.push(localEv.id);
      }
    }
  }

  // 8. Execute deletions
  let deletedCount = 0;
  if (localEventIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .in('id', localEventIdsToDelete);

    if (deleteError) {
      throw new Error(`Failed to prune deleted calendar events: ${deleteError.message}`);
    }
    deletedCount = localEventIdsToDelete.length;
  }

  return {
    success: true,
    upsertedCount,
    deletedCount
  };
}
