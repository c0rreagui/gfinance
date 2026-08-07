import { NextResponse } from 'next/server';
import { GET as mcpGet, POST as mcpPost, OPTIONS as mcpOptions } from '@/app/api/mcp/route';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return mcpGet(req);
}

export async function POST(req: Request) {
  return mcpPost(req);
}

export async function OPTIONS() {
  return mcpOptions();
}
