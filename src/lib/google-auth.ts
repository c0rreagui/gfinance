import { createSupabaseServerClient } from './supabase-server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  // Fetch saved tokens from profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single();

  if (error || !profile?.google_access_token) {
    return null;
  }

  // Check if token is expired (with a 5-minute safety window)
  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (!isExpired) {
    return profile.google_access_token;
  }

  // If expired, try to refresh it
  if (!profile.google_refresh_token) {
    return null;
  }

  try {
    const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errText = await refreshResponse.text();
      console.error('[Google Token Refresh] Cascade refresh failed:', errText);
      return null;
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

    // Update database
    await supabase
      .from('profiles')
      .update({
        google_access_token: newAccessToken,
        google_token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return newAccessToken;
  } catch (err: any) {
    console.error('[Google Token Refresh] Unexpected error:', err.message);
    return null;
  }
}
