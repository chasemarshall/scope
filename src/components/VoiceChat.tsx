"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Headphones } from "lucide-react";
import { RealtimeClient, type RealtimeConfig } from "@/lib/realtime/client";

interface VoiceChatProps {
  apiKey: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface RealtimeSessionData {
  session_id?: string;
  [key: string]: unknown;
}

interface RealtimeTranscriptData {
  transcript: string;
  [key: string]: unknown;
}

interface RealtimeAudioDeltaData {
  delta: string;
  [key: string]: unknown;
}

interface RealtimeErrorData {
  error?: {
    message: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default function VoiceChat({ apiKey, onTranscript, onError }: VoiceChatProps) {
  const [_isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const realtimeClient = useRef<RealtimeClient | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  // Initialize Realtime client
  useEffect(() => {
    if (!apiKey) return;

    const config: RealtimeConfig = {
      apiKey,
      model: 'gpt-realtime',
      voice: 'cedar',
      temperature: 0.8,
    };

    realtimeClient.current = new RealtimeClient(config);

    // Set up event listeners
    realtimeClient.current.on('session.created', (data: unknown) => {
      const sessionData = data as RealtimeSessionData;
      console.log('Realtime session created:', sessionData);
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    realtimeClient.current.on('input_audio_buffer.speech_started', (_data: unknown) => {
      console.log('Speech detected');
      setIsListening(true);
    });

    realtimeClient.current.on('input_audio_buffer.speech_stopped', (_data: unknown) => {
      console.log('Speech ended');
      setIsListening(false);
    });

    realtimeClient.current.on('conversation.item.input_audio_transcription.completed', (data: unknown) => {
      const transcriptData = data as RealtimeTranscriptData;
      console.log('User transcript:', transcriptData.transcript);
      onTranscript?.(transcriptData.transcript, true);
    });

    realtimeClient.current.on('response.audio.delta', (data: unknown) => {
      const audioData = data as RealtimeAudioDeltaData;
      // Play audio response chunks
      if (audioData.delta) {
        playAudioChunk(audioData.delta);
      }
    });

    realtimeClient.current.on('response.audio_transcript.delta', (data: unknown) => {
      const audioData = data as RealtimeAudioDeltaData;
      // Show assistant's speech as it's being generated
      if (audioData.delta) {
        onTranscript?.(audioData.delta, false);
      }
    });

    realtimeClient.current.on('response.audio_transcript.done', (data: unknown) => {
      const transcriptData = data as RealtimeTranscriptData;
      // Final assistant transcript
      onTranscript?.(transcriptData.transcript, true);
    });

    realtimeClient.current.on('error', (data: unknown) => {
      const errorData = data as RealtimeErrorData;
      console.error('Realtime API error:', errorData);
      onError?.(errorData.error?.message || 'Unknown error');
      setConnectionStatus('disconnected');
      setIsConnected(false);
    });

    realtimeClient.current.on('disconnected', () => {
      setConnectionStatus('disconnected');
      setIsConnected(false);
    });

    return () => {
      realtimeClient.current?.disconnect();
      cleanup();
    };
  }, [apiKey, onTranscript, onError, cleanup]);

  const cleanup = useCallback(() => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
    }
    if (audioContext.current) {
      audioContext.current.close();
    }
  }, []);

  const connect = async () => {
    if (!realtimeClient.current) return;

    setConnectionStatus('connecting');
    try {
      await realtimeClient.current.connect();
      await startAudioCapture();
    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      onError?.('Failed to connect to voice chat');
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    realtimeClient.current?.disconnect();
    cleanup();
    setConnectionStatus('disconnected');
    setIsListening(false);
  };

  const startAudioCapture = async () => {
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        } 
      });

      audioContext.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      
      // Create a processor to send audio data to Realtime API
      const processor = audioContext.current.createScriptProcessor(1024, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (realtimeClient.current?.connected) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const audioData = new Float32Array(inputBuffer);
          
          // Convert to the format expected by Realtime API (PCM16)
          const pcm16 = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            pcm16[i] = Math.round(audioData[i] * 0x7FFF);
          }
          
          realtimeClient.current.sendAudioData(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.current.destination);

    } catch (error) {
      console.error('Failed to start audio capture:', error);
      onError?.('Failed to access microphone');
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (audioContext.current) {
        audioContext.current.decodeAudioData(bytes.buffer.slice()).then(audioBuffer => {
          const source = audioContext.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.current!.destination);
          source.start();
          
          setIsPlaying(true);
          source.onended = () => setIsPlaying(false);
        }).catch(error => {
          console.error('Error decoding audio:', error);
        });
      }
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {connectionStatus === 'disconnected' && (
        <button
          onClick={connect}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition"
          title="Start voice chat"
        >
          <Headphones size={16} />
          <span>Voice Chat</span>
        </button>
      )}

      {connectionStatus === 'connecting' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-600 rounded-lg text-sm font-medium">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Connecting...</span>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <>
          <div className="flex items-center gap-1">
            {isListening ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-600 rounded-lg text-sm font-medium">
                <Mic size={16} className="animate-pulse" />
                <span>Listening...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-600 rounded-lg text-sm font-medium">
                <MicOff size={16} />
                <span>Ready</span>
              </div>
            )}

            {isPlaying && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg text-sm font-medium">
                <Volume2 size={16} className="animate-pulse" />
                <span>Speaking...</span>
              </div>
            )}
          </div>

          <button
            onClick={disconnect}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
            title="End voice chat"
          >
            End Call
          </button>
        </>
      )}
    </div>
  );
}