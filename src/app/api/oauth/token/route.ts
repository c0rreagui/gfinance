import { NextResponse } from 'next/server';
import { validateAuthCode, createTokenPair, refreshTokensFromRefresh } from '@/lib/mcp/oauth-store';

export async function POST(req: Request) {
  try {
    const isForm = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
    let body;
    if (isForm) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      body = await req.json();
    }

    const grant_type = body.grant_type;
    const client_id = body.client_id;
    
    if (grant_type === 'authorization_code') {
      const code = body.code;
      const redirect_uri = body.redirect_uri;
      const code_verifier = body.code_verifier;

      if (!code || !client_id || !redirect_uri || !code_verifier) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }

      const authCode = validateAuthCode(code, client_id, redirect_uri, code_verifier);
      if (!authCode) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }

      const tokenPair = createTokenPair(client_id, authCode.user_id);
      return NextResponse.json(tokenPair, { headers: { 'Access-Control-Allow-Origin': '*' } });
      
    } else if (grant_type === 'refresh_token') {
      const refresh_token = body.refresh_token;
      
      if (!refresh_token || !client_id) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }
      
      const tokenPair = refreshTokensFromRefresh(refresh_token, client_id);
      if (!tokenPair) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }
      
      return NextResponse.json(tokenPair, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
    
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
