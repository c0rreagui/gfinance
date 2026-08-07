import { validateMcpRequest } from '@/lib/mcp/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await validateMcpRequest(req);

  if (!auth.authenticated || !auth.userId) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: auth.error || 'Não autorizado' })}\n\n`,
      {
        status: 401,
        headers: { 'Content-Type': 'text/event-stream' }
      }
    );
  }

  const url = new URL(req.url);
  const rawKey = url.searchParams.get('key') || url.searchParams.get('api_key') || '';
  const sessionId = `mcp_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageUrl = `${url.origin}/api/mcp/messages?sessionId=${sessionId}${rawKey ? `&key=${rawKey}` : ''}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial endpoint event per MCP SSE spec
      const endpointEvent = `event: endpoint\ndata: ${messageUrl}\n\n`;
      controller.enqueue(encoder.encode(endpointEvent));

      // Keep-alive heartbeat interval
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
      'Connection': 'keep-alive'
    }
  });
}
