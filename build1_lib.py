import os, sys

base = '/home/kalimike/Re-Hardwire/frontend'

def wf(rel_path, content):
    full = os.path.join(base, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)

# ============ LIB FILES ============

wf('lib/config.ts', """/**
 * Re-Hardwire Frontend Configuration
 */
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    endpoints: {
      health: '/health',
      route: '/api/route',
      llm: '/api/llm',
      tts: '/api/tts',
      history: '/api/history',
      profile: '/api/profile',
    },
    timeout: 10000,
  },
  app: {
    name: 'Re-Hardwire',
    version: '1.0.0',
    engine: 'Re-Hardwire Core v1',
  },
  features: {
    ttsEnabled: true,
    voiceInput: true,
    analytics: true,
  },
  storage: {
    conversationKey: 're-hardwire-conversations',
    profileKey: 're-hardwire-profile',
    protocolKey: 're-hardwire-protocol',
    uiPrefsKey: 're-hardwire-ui-prefs',
  },
} as const;

export type Config = typeof config;
""")

wf('lib/api.ts', """/**
 * Re-Hardwire API Client
 */
import { config } from './config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: string;
  engine: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  protocol?: string;
}

export interface LLMResponse {
  content: string;
  protocol?: string;
  confidence?: number;
  tags?: string[];
}

export interface RouteRequest {
  userText: string;
  protocol?: string;
}

export interface RouteResponse {
  protocol: string;
  confidence: number;
  tags: string[];
  nextAction: string;
  emotionalState: string;
}

export interface HistoryEntry {
  id: string;
  sessionId: string;
  messages: LLMMessage[];
  createdAt: string;
  protocolUsed?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: Record<string, unknown>;
  permissions: string[];
  createdAt: string;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json().catch(() => null);
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') return { success: false, error: 'Request timed out' };
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async checkHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.get<HealthResponse>(config.api.endpoints.health);
  }

  async streamLLM(req: LLMRequest): Promise<ApiResponse<LLMResponse>> {
    return this.post<LLMResponse>(config.api.endpoints.llm, req);
  }

  async autoRoute(req: RouteRequest): Promise<ApiResponse<RouteResponse>> {
    return this.post<RouteResponse>(config.api.endpoints.route, req);
  }

  async getHistory(sessionId?: string): Promise<ApiResponse<HistoryEntry[]>> {
    const endpoint = sessionId
      ? `${config.api.endpoints.history}?sessionId=${sessionId}`
      : config.api.endpoints.history;
    return this.get<HistoryEntry[]>(endpoint);
  }

  async saveHistory(session: Omit<HistoryEntry, 'id'>): Promise<ApiResponse<HistoryEntry>> {
    return this.post<HistoryEntry>(config.api.endpoints.history, session);
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(config.api.endpoints.profile);
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>(config.api.endpoints.profile, updates);
  }

  async speak(req: TTSRequest): Promise<ApiResponse<{ audioUrl: string; duration: number }>> {
    return this.post<{ audioUrl: string; duration: number }>(config.api.endpoints.tts, req);
  }
}

export const api = new ApiClient();
""")

print('Lib files written')
