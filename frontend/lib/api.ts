/**
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

export interface AppCapabilities {
  apiVersion: string;
  app: string;
  features: {
    guidedPractices: { availableOffline: boolean; packVersion: string };
    supportPlan: { availableOffline: boolean; storage: string };
    coachChat: { requiresNetwork: boolean };
    clinicalConversationReview: { available: boolean; sharingEnabled: boolean; reason: string };
  };
  privacy: {
    chatRequestSentToReplyService: boolean;
    automaticClinicalReviewSharing: boolean;
    historyBackendHasPerUserIsolation: boolean;
  };
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
  /** Optional: present when the backend echoes its routing decision. */
  emotionalState?: string;
  nextAction?: string;
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

/**
 * Fine-grained capability switches stored with the profile.
 *
 * Keys must stay in sync with `default_permissions` in
 * `backend/app/core/config.py`.
 */
export type PermissionKey = 'chat' | 'tts' | 'voice_input' | 'analytics' | 'history';

/** The full, ordered permission catalogue used by the account page. */
export const PERMISSION_KEYS: PermissionKey[] = [
  'chat',
  'tts',
  'voice_input',
  'analytics',
  'history',
];

/** Short human descriptions shown next to each switch. */
export const PERMISSION_HINTS: Record<PermissionKey, string> = {
  chat: 'Send messages and receive coach replies.',
  tts: 'Let the app speak replies out loud.',
  voice_input: 'Dictate messages with the microphone.',
  analytics: 'Keep local, on-device usage analytics.',
  history: 'Store conversations on this device.',
};

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

  async getCapabilities(): Promise<ApiResponse<AppCapabilities>> {
    return this.get<AppCapabilities>(config.api.endpoints.capabilities);
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
