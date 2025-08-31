import { NextRequest, NextResponse } from 'next/server';

// Temporary solution: store settings in cookies/headers
// In production, this should be replaced with a proper database

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    
    // Try to get from cookie first
    const cookieValue = req.cookies.get(`setting_${key}`)?.value;
    
    return NextResponse.json({ value: cookieValue || null });
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

    const response = NextResponse.json({ success: true });
    
    if (value.trim()) {
      // Store in cookie (will expire in 30 days)
      response.cookies.set(`setting_${key}`, value.trim(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log(`Setting ${key} saved to cookie`);
    } else {
      // Delete cookie
      response.cookies.delete(`setting_${key}`);
      console.log(`Setting ${key} deleted from cookie`);
    }
    
    return response;
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}