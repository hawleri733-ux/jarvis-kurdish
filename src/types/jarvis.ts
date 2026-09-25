export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string | null;
  timestamp: string;
  voiceName?: string;
  duration?: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  kurdishLabel: string;
  desc: string;
  gender: 'male' | 'female';
}

export interface SystemTelemetry {
  powerLevel: number;
  coreTemp: number;
  neuralSync: number;
  activeVoice: string;
  pingMs: number;
  audioMuted: boolean;
  soundFxEnabled: boolean;
}
