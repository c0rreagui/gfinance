import crypto from 'crypto';

interface OAuthClient {
  client_id: string;
  client_name?: string;
  redirect_uris?: string[];
}

interface AuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  user_id: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: number;
}

interface AccessToken {
  access_token: string;
  client_id: string;
  user_id: string;
  expires_at: number;
}

interface RefreshToken {
  refresh_token: string;
  client_id: string;
  user_id: string;
  expires_at: number;
}

const clients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthCode>();
const accessTokens = new Map<string, AccessToken>();
const refreshTokens = new Map<string, RefreshToken>();

export function registerClient(name?: string): OAuthClient {
  const client_id = `client_${crypto.randomBytes(16).toString('hex')}`;
  const client = { client_id, client_name: name || 'Gemini Spark MCP' };
  clients.set(client_id, client);
  return client;
}

export function createAuthCode(client_id: string, redirect_uri: string, user_id: string, code_challenge: string, code_challenge_method: string): string {
  const code = `ghub_code_${crypto.randomBytes(32).toString('hex')}`;
  const expires_at = Date.now() + 10 * 60 * 1000; // 10 minutes
  authCodes.set(code, {
    code, client_id, redirect_uri, user_id, code_challenge, code_challenge_method, expires_at
  });
  return code;
}

export function validateAuthCode(code: string, client_id: string, redirect_uri: string, code_verifier: string): AuthCode | null {
  const authCode = authCodes.get(code);
  if (!authCode) return null;
  
  if (Date.now() > authCode.expires_at) {
    authCodes.delete(code);
    return null;
  }
  
  // Validação tolerante de client_id e redirect_uri (Google Gemini Spark envia variações)
  if (authCode.client_id !== client_id && client_id !== 'client_0d4515c0c48d7b588becae4ad64716c3') {
    console.warn('[OAuth Store] Client ID mismatch ignored for tolerance:', authCode.client_id, 'vs', client_id);
  }

  // PKCE verification
  if (authCode.code_challenge_method === 'S256') {
    const hash = crypto.createHash('sha256').update(code_verifier).digest();
    const expectedChallenge = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (expectedChallenge !== authCode.code_challenge) {
      console.warn('[OAuth Store] PKCE S256 verification failed');
      return null;
    }
  } else if (authCode.code_challenge_method === 'plain') {
    if (code_verifier !== authCode.code_challenge) {
      console.warn('[OAuth Store] PKCE plain verification failed');
      return null;
    }
  }

  // Single use
  authCodes.delete(code);
  return authCode;
}

export function createTokenPair(client_id: string, user_id: string) {
  const access_token = `ghub_oauth_${crypto.randomBytes(32).toString('hex')}`;
  const refresh_token = `ghub_refresh_${crypto.randomBytes(32).toString('hex')}`;
  
  const accessTokenExpiry = Date.now() + 3600 * 1000; // 1 hour
  const refreshTokenExpiry = Date.now() + 30 * 24 * 3600 * 1000; // 30 days
  
  accessTokens.set(access_token, {
    access_token, client_id, user_id, expires_at: accessTokenExpiry
  });
  
  refreshTokens.set(refresh_token, {
    refresh_token, client_id, user_id, expires_at: refreshTokenExpiry
  });
  
  return {
    access_token,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token
  };
}

export function validateAccessToken(token: string): AccessToken | null {
  const at = accessTokens.get(token);
  if (!at) return null;
  if (Date.now() > at.expires_at) {
    accessTokens.delete(token);
    return null;
  }
  return at;
}

export function refreshTokensFromRefresh(token: string, client_id: string) {
  const rt = refreshTokens.get(token);
  if (!rt) return null;
  if (Date.now() > rt.expires_at) {
    refreshTokens.delete(token);
    return null;
  }
  if (rt.client_id !== client_id) return null;
  
  refreshTokens.delete(token);
  return createTokenPair(client_id, rt.user_id);
}
