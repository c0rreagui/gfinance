import { NextResponse } from 'next/server';
import { validateMcpRequest, getDefaultUserId } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest, MCP_TOOLS_DEFINITION } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

// GET: Descoberta pública do protocolo MCP (compatível com Gemini Spark / Claude Desktop / Cursor)
export async function GET(req: Request) {
  const auth = await validateMcpRequest(req);
  const defaultUserId = await getDefaultUserId();

  return NextResponse.json({
    name: 'G-Hub Executive MCP Server',
    status: 'online',
    version: '2.0.0',
    protocolVersion: '2024-11-05',
    authenticated: auth.authenticated,
    authenticatedUser: auth.userId || defaultUserId,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false }
    },
    toolsCount: MCP_TOOLS_DEFINITION.length,
    instructions: 'Para enviar requisições JSON-RPC 2.0 (initialize, tools/list, tools/call), envie um HTTP POST para este mesmo endpoint.'
  });
}

// POST: Execução de chamadas JSON-RPC 2.0 do protocolo MCP
export async function POST(req: Request) {
  const auth = await validateMcpRequest(req);
  let resolvedUserId = auth.userId;

  if (!resolvedUserId) {
    resolvedUserId = await getDefaultUserId();
  }

  if (!resolvedUserId) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: 'Nenhum perfil de usuário disponível para vincular o servidor MCP.' }
    }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Payload JSON inválido.' }
    }, { status: 400 });
  }

  // Se o payload for um array de chamadas JSON-RPC (Batch)
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(item => processMcpJsonRpcRequest(item, resolvedUserId!))
    );
    const filteredResponses = responses.filter(r => r !== null);
    return NextResponse.json(filteredResponses);
  }

  // Chamada única JSON-RPC
  const response = await processMcpJsonRpcRequest(body, resolvedUserId);
  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(response);
}
