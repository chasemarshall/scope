import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/db/queries';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { role, content } = await req.json();
    
    if (!role || !content || !['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: 'Valid role and content are required' }, { status: 400 });
    }

    const message = await ChatService.addMessage(id, role, content);
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}