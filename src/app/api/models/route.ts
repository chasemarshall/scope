import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/db/queries';

export const runtime = "nodejs";

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

export async function GET(req: NextRequest) {
  try {
    // Get the API key from database or environment
    let apiKey: string | null = null;
    
    try {
      apiKey = await ChatService.getSetting('openai-key');
      console.log('Retrieved API key from database:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
    } catch (error) {
      console.log('Failed to get API key from database:', error);
      // If no user key stored, fall back to environment variable
      apiKey = process.env.OPENAI_API_KEY ?? null;
      console.log('Using environment API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
    }

    if (!apiKey) {
      console.log('No API key available');
      return NextResponse.json({ 
        error: 'No OpenAI API key configured. Please add your API key in settings.' 
      }, { status: 401 });
    }

    console.log('Fetching models from OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('OpenAI API error response:', errorText);
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid API key. Please check your OpenAI API key in settings.' 
        }, { status: 401 });
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: OpenAIModelsResponse = await response.json();
    console.log('Received models count:', data.data.length);
    
    // Filter for chat completion models and sort by ID
    const chatModels = data.data
      .filter(model => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') &&
        !model.id.includes('whisper') &&
        !model.id.includes('tts') &&
        !model.id.includes('embedding') &&
        !model.id.includes('moderation')
      )
      .sort((a, b) => {
        // Sort with newer models first
        if (a.id.includes('4o') && !b.id.includes('4o')) return -1;
        if (!a.id.includes('4o') && b.id.includes('4o')) return 1;
        if (a.id.includes('4') && !b.id.includes('4')) return -1;
        if (!a.id.includes('4') && b.id.includes('4')) return 1;
        return a.id.localeCompare(b.id);
      });

    console.log('Filtered chat models:', chatModels.map(m => m.id));
    return NextResponse.json({ models: chatModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch models from OpenAI API' 
    }, { status: 500 });
  }
}