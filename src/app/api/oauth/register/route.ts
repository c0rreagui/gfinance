import { NextResponse } from 'next/server';
import { registerClient } from '@/lib/mcp/oauth-store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = registerClient(body.client_name);
    
    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0 
      ? body.redirect_uris 
      : ["https://oauth-redirect.googleusercontent.com/r/user_bound_custom-mcp-111959194183797835589-ghub-ia_vercel_app", "https://gemini.google.com/oauth/callback"];

    return NextResponse.json({
      client_id: client.client_id,
      client_secret: `secret_${Math.random().toString(36).substring(2)}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name: body.client_name || 'Gemini Spark MCP Client',
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    }, {
      status: 201,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
