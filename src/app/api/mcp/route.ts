import { NextResponse } from 'next/server';
import { validateMcpRequest, getDefaultUserId } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest, MCP_TOOLS_DEFINITION } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghub-ia.vercel.app';

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type',
};

function getUnauthorizedResponse() {
  return new NextResponse(
    JSON.stringify({
      error: 'unauthorized',
      message: 'Este servidor MCP requer autenticação OAuth 2.0.'
    }),
    {
      status: 401,
      headers: {
        ...MCP_CORS_HEADERS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer realm="G-Hub MCP Server", authorization_uri="${baseUrl}/authorize", token_uri="${baseUrl}/api/oauth/token", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      }
    }
  );
}

// OPTIONS: Preflight CORS (obrigatório para clientes remotos como Gemini Spark)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

// GET: Descoberta do protocolo MCP (Retorna 401 com WWW-Authenticate para instruir o Gemini Spark a usar OAuth)
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return getUnauthorizedResponse();
  }

  const auth = await validateMcpRequest(req);
  if (!auth.authenticated) {
    return getUnauthorizedResponse();
  }

  const defaultUserId = auth.userId || (await getDefaultUserId());

  return NextResponse.json({
    name: 'G-Hub Ecosystem MCP Server',
    status: 'online',
    version: '3.0.0',
    protocolVersion: '2024-11-05',
    authenticated: true,
    userId: defaultUserId,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false }
    },
    toolsCount: MCP_TOOLS_DEFINITION.length
  }, { headers: MCP_CORS_HEADERS });
}

// POST: Execução de chamadas JSON-RPC 2.0 do protocolo MCP
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  // Se a requisição vier sem cabeçalho Authorization Bearer (descoberta do Gemini Spark)
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return getUnauthorizedResponse();
  }

  const auth = await validateMcpRequest(req);
  if (!auth.authenticated || !auth.userId) {
    return getUnauthorizedResponse();
  }

  const resolvedUserId = auth.userId;

  if (!resolvedUserId) {
    return getUnauthorizedResponse();
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
      body.map(item => processMcpJsonRpcRequest(item, resolvedUserId))
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
