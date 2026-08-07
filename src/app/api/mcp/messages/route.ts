import { NextResponse } from 'next/server';
import { validateMcpRequest, getDefaultUserId } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type, Mcp-Protocol-Version',
  'Mcp-Protocol-Version': '2024-11-05',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await validateMcpRequest(req);
  const resolvedUserId = auth.userId || (await getDefaultUserId());

  if (!resolvedUserId) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: 'Nenhum perfil de usuário disponível para vincular o servidor MCP.' }
    }, { status: 401, headers: MCP_CORS_HEADERS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Payload JSON inválido.' }
    }, { status: 400, headers: MCP_CORS_HEADERS });
  }

  const response = await processMcpJsonRpcRequest(body, resolvedUserId);
  if (response === null) {
    return new NextResponse(null, { status: 202, headers: MCP_CORS_HEADERS });
  }

  return NextResponse.json(response, { headers: MCP_CORS_HEADERS });
}
