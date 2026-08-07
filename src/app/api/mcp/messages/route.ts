import { NextResponse } from 'next/server';
import { validateMcpRequest } from '@/lib/mcp/auth';
import { processMcpJsonRpcRequest } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await validateMcpRequest(req);

  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: auth.error || 'Não autorizado.' }
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

  const response = await processMcpJsonRpcRequest(body, auth.userId);
  if (response === null) {
    return new NextResponse(null, { status: 202 });
  }

  return NextResponse.json(response);
}
