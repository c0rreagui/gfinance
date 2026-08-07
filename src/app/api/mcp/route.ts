import { NextResponse } from 'next/server';
import { validateMcpRequest, getDefaultUserId } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest, MCP_TOOLS_DEFINITION } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghub-ia.vercel.app';

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type, Mcp-Protocol-Version',
  'Mcp-Protocol-Version': '2024-11-05',
};

// OPTIONS: Preflight CORS (obrigatório para clientes remotos como Gemini Spark)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: MCP_CORS_HEADERS });
}

// GET: Descoberta pública do protocolo MCP (Retorna 200 OK para o Gemini validar a URL do servidor)
export async function GET(req: Request) {
  const auth = await validateMcpRequest(req);
  const defaultUserId = auth.userId || (await getDefaultUserId());

  const acceptHeader = req.headers.get('accept') || '';
  if (acceptHeader.includes('text/event-stream')) {
    const url = new URL(req.url);
    const rawKey = url.searchParams.get('key') || url.searchParams.get('api_key') || '';
    const sessionId = `mcp_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const messageUrl = `${url.origin}/api/mcp/messages?sessionId=${sessionId}${rawKey ? `&key=${rawKey}` : ''}`;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const endpointEvent = `event: endpoint\ndata: ${messageUrl}\n\n`;
        controller.enqueue(encoder.encode(endpointEvent));

        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            clearInterval(interval);
          }
        }, 15000);

        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          try {
            controller.close();
          } catch {}
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        ...MCP_CORS_HEADERS
      }
    });
  }

  return NextResponse.json({
    name: 'G-Hub Ecosystem MCP Server',
    status: 'online',
    version: '3.0.0',
    protocolVersion: '2024-11-05',
    authenticated: auth.authenticated,
    userId: defaultUserId,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false }
    },
    toolsCount: MCP_TOOLS_DEFINITION.length,
    authorization: {
      type: 'oauth2',
      authorization_uri: `${baseUrl}/authorize`,
      token_uri: `${baseUrl}/api/oauth/token`,
      registration_uri: `${baseUrl}/api/oauth/register`
    }
  }, { 
    status: 200,
    headers: {
      ...MCP_CORS_HEADERS,
      'WWW-Authenticate': `Bearer realm="G-Hub MCP Server", authorization_uri="${baseUrl}/authorize", token_uri="${baseUrl}/api/oauth/token"`
    } 
  });
}

// POST: Execução de chamadas JSON-RPC 2.0 do protocolo MCP
export async function POST(req: Request) {
  const auth = await validateMcpRequest(req);
  let resolvedUserId = auth.userId || (await getDefaultUserId());

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
