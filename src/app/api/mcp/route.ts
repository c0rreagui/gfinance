import { NextResponse } from 'next/server';
import { validateMcpRequest } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest, MCP_TOOLS_DEFINITION } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await validateMcpRequest(req);

  if (!auth.authenticated) {
    return NextResponse.json({
      name: 'G-Hub Financial MCP Server',
      status: 'unauthorized',
      message: auth.error || 'Autenticação necessária. Forneça ?key=ghub_pat_... na URL ou o cabeçalho Authorization: Bearer'
    }, { status: 401 });
  }

  return NextResponse.json({
    name: 'G-Hub Financial MCP Server',
    status: 'online',
    version: '2.0.0',
    protocolVersion: '2024-11-05',
    authenticatedUser: auth.userId,
    availableToolsCount: MCP_TOOLS_DEFINITION.length,
    instructions: 'Para enviar requisições JSON-RPC 2.0 (initialize, tools/list, tools/call), envie um HTTP POST para este mesmo endpoint.'
  });
}

export async function POST(req: Request) {
  const auth = await validateMcpRequest(req);

  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: auth.error || 'Não autorizado. Forneça o parâmetro ?key=ghub_pat_... ou o cabeçalho Authorization: Bearer' }
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
      body.map(item => processMcpJsonRpcRequest(item, auth.userId!))
    );
    const filteredResponses = responses.filter(r => r !== null);
    return NextResponse.json(filteredResponses);
  }

  // Chamada única JSON-RPC
  const response = await processMcpJsonRpcRequest(body, auth.userId);
  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(response);
}
