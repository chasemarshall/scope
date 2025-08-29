import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/db/queries';

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const value = await ChatService.getSetting(params.key);
    return NextResponse.json({ value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const { value } = await req.json();
    
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Value must be a string' }, { status: 400 });
    }

    if (value.trim()) {
      await ChatService.setSetting(params.key, value);
    } else {
      await ChatService.deleteSetting(params.key);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}