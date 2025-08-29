"use client";

export interface RealtimeMessage {
  type: string;
  [key: string]: unknown;
}

export interface RealtimeConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
}

type EventCallback = (data: unknown) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private isConnected = false;
  private messageQueue: RealtimeMessage[] = [];
  private listeners = new Map<string, Set<EventCallback>>();

  constructor(config: RealtimeConfig) {
    this.config = {
      model: 'gpt-realtime',
      voice: 'cedar', // New voice available in realtime
      temperature: 0.8,
      maxTokens: 1024,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      try {
        // Connect to OpenAI Realtime API
        const url = 'wss://api.openai.com/v1/realtime';
        this.ws = new WebSocket(url, ['realtime', `Bearer.${this.config.apiKey}`]);

        this.ws.onopen = () => {
          console.log('Connected to OpenAI Realtime API');
          this.isConnected = true;
          
          // Send session configuration
          this.send({
            type: 'session.update',
            session: {
              model: this.config.model,
              voice: this.config.voice,
              temperature: this.config.temperature,
              max_tokens: this.config.maxTokens,
              turn_detection: {
                type: 'server_vad',
              },
            },
          });

          // Process queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) this.send(message);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            this.emit(message.type, message);
          } catch (error) {
            console.error('Failed to parse Realtime API message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Realtime WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Realtime WebSocket connection closed');
          this.isConnected = false;
          this.emit('disconnected', {});
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(message: RealtimeMessage): void {
    if (!this.isConnected || !this.ws) {
      this.messageQueue.push(message);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  // Audio input methods
  sendAudioData(audioData: ArrayBuffer): void {
    this.send({
      type: 'input_audio_buffer.append',
      audio: this.arrayBufferToBase64(audioData),
    });
  }

  commitAudio(): void {
    this.send({
      type: 'input_audio_buffer.commit',
    });
  }

  // Text input methods
  sendTextMessage(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    });

    // Trigger response generation
    this.send({
      type: 'response.create',
    });
  }

  // Function calling
  addFunction(name: string, description: string, parameters: Record<string, unknown>): void {
    this.send({
      type: 'session.update',
      session: {
        tools: [
          {
            type: 'function',
            name,
            description,
            parameters,
          },
        ],
      },
    });
  }

  // Event handling
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  get connected(): boolean {
    return this.isConnected;
  }
}