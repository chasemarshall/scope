import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/db/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const value = await ChatService.getSetting(key);
    return NextResponse.json({ value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const { value } = await req.json();
    
    console.log(`Saving setting ${key}:`, value ? `${value.substring(0, 10)}...` : 'empty');
    
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Value must be a string' }, { status: 400 });
    }

    if (value.trim()) {
      await ChatService.setSetting(key, value.trim());
      console.log(`Setting ${key} saved successfully`);
    } else {
      await ChatService.deleteSetting(key);
      console.log(`Setting ${key} deleted (empty value)`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}