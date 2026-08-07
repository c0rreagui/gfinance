import { NextResponse } from 'next/server';
import { registerClient } from '@/lib/mcp/oauth-store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = registerClient(body.client_name);
    
    return NextResponse.json({
      client_id: client.client_id,
      client_name: client.client_name,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    }, {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
