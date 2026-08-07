import { NextResponse } from 'next/server';
import { validateMcpRequest, getDefaultUserId } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest, MCP_TOOLS_DEFINITION } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Content-Type',
};

// OPTIONS: Preflight CORS (obrigatório para clientes remotos como Gemini Spark)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

// GET: Descoberta pública do protocolo MCP (Streamable HTTP — compatível com Gemini Spark)
export async function GET() {
  const defaultUserId = await getDefaultUserId();

  return NextResponse.json({
    name: 'G-Hub Ecosystem MCP Server',
    status: 'online',
    version: '3.0.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false }
    },
    toolsCount: MCP_TOOLS_DEFINITION.length,
    instructions: 'Envie requisições JSON-RPC 2.0 (initialize, tools/list, tools/call) via HTTP POST para este endpoint.'
  }, { headers: MCP_CORS_HEADERS });
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

  // Se o payload for um array de chamadas JSON-RPC (Batch)
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(item => processMcpJsonRpcRequest(item, resolvedUserId!))
    );
    const filteredResponses = responses.filter(r => r !== null);
    return NextResponse.json(filteredResponses, { headers: MCP_CORS_HEADERS });
  }

  // Chamada única JSON-RPC
  const response = await processMcpJsonRpcRequest(body, resolvedUserId);
  if (response === null) {
    return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
  }

  return NextResponse.json(response, { headers: MCP_CORS_HEADERS });
}
