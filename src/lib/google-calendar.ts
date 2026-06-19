/**
 * src/lib/google-calendar.ts
 *
 * Google Calendar API Client using raw fetch.
 * Implements listing, inserting, updating, and deleting events on the user's primary calendar.
 */

const GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface GoogleEventInput {
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
}

export async function listGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<any> {
  const url = `${GOOGLE_CALENDAR_BASE_URL}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=250`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API list error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function insertGoogleEvent(
  accessToken: string,
  event: GoogleEventInput
): Promise<any> {
  const body = {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: new Date(event.start_time).toISOString(),
    },
    end: {
      dateTime: new Date(event.end_time).toISOString(),
    },
    location: event.location || '',
  };

  const response = await fetch(GOOGLE_CALENDAR_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API insert error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  event: GoogleEventInput
): Promise<any> {
  const url = `${GOOGLE_CALENDAR_BASE_URL}/${googleEventId}`;
  
  const body = {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: new Date(event.start_time).toISOString(),
    },
    end: {
      dateTime: new Date(event.end_time).toISOString(),
    },
    location: event.location || '',
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API update error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function deleteGoogleEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const url = `${GOOGLE_CALENDAR_BASE_URL}/${googleEventId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API delete error (${response.status}): ${errorText}`);
  }
}
