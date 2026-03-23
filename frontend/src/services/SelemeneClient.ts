/**
 * SelemeneClient — TypeScript API client for Selemene API
 * Mirrors the Rust noesis-sdk interface
 * See: .plan/phases/PHASE-1-multi-engine.md for API contract
 */
import type {
  EngineInput,
  EngineOutput,
  EngineInfo,
  WorkflowInfo,
  WorkflowResult,
  ValidationResult,
  ReadingRecord,
  SelemeneAuthResponse,
  SelemeneRegisterResponse,
  SelemeneError,
  SelemeneUserProfile,
  SelemeneProfileUpdate,
} from '../types/selemene';

export class SelemeneClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token?: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token ?? null;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  // --- Private helpers ---

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
    }
    return h;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.headers(),
        ...(options?.headers ?? {}),
      },
    });

    if (!res.ok) {
      let errorBody: SelemeneError;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = {
          error: `HTTP ${res.status}: ${res.statusText}`,
          error_code: 'HTTP_ERROR',
        };
      }
      throw new SelemeneApiError(errorBody, res.status);
    }

    return res.json();
  }

  // --- Auth ---

  async login(email: string, password: string): Promise<SelemeneAuthResponse> {
    const resp = await this.request<SelemeneAuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = resp.token;
    return resp;
  }

  async register(email: string, password: string, fullName?: string): Promise<SelemeneRegisterResponse> {
    return this.request<SelemeneRegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async discordAuthorizeUrl(): Promise<string> {
    const resp = await this.request<{ url: string }>('/api/v1/auth/discord/authorize');
    return resp.url;
  }

  async discordCallback(code: string): Promise<SelemeneAuthResponse> {
    const resp = await this.request<SelemeneAuthResponse>('/api/v1/auth/discord/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    this.token = resp.token;
    return resp;
  }

  // --- Engines ---

  async listEngines(): Promise<EngineInfo[]> {
    return this.request<EngineInfo[]>('/api/v1/engines');
  }

  async calculate(engineId: string, input: EngineInput): Promise<EngineOutput> {
    return this.request<EngineOutput>(`/api/v1/engines/${encodeURIComponent(engineId)}/calculate`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async validate(engineId: string, output: EngineOutput): Promise<ValidationResult> {
    return this.request<ValidationResult>(`/api/v1/engines/${encodeURIComponent(engineId)}/validate`, {
      method: 'POST',
      body: JSON.stringify(output),
    });
  }

  // --- Workflows ---

  async listWorkflows(): Promise<WorkflowInfo[]> {
    return this.request<WorkflowInfo[]>('/api/v1/workflows');
  }

  async executeWorkflow(workflowId: string, input: EngineInput): Promise<WorkflowResult> {
    return this.request<WorkflowResult>(`/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // --- Readings ---

  async listReadings(limit = 20): Promise<ReadingRecord[]> {
    return this.request<ReadingRecord[]>(`/api/v1/readings?limit=${limit}`);
  }

  async getReading(readingId: string): Promise<ReadingRecord> {
    return this.request<ReadingRecord>(`/api/v1/readings/${encodeURIComponent(readingId)}`);
  }

  // --- User ---

  async getMe(): Promise<SelemeneUserProfile> {
    return this.request<SelemeneUserProfile>('/api/v1/users/me');
  }

  async updateMe(updates: SelemeneProfileUpdate): Promise<SelemeneUserProfile> {
    return this.request<SelemeneUserProfile>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Health ---

  async health(): Promise<boolean> {
    try {
      await this.request<unknown>('/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Typed error class for Selemene API errors
 */
export class SelemeneApiError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(body: SelemeneError, statusCode: number) {
    super(body.error);
    this.name = 'SelemeneApiError';
    this.errorCode = body.error_code;
    this.statusCode = statusCode;
    this.details = body.details;
  }

  get isPhaseAccessDenied(): boolean {
    return this.errorCode === 'PHASE_ACCESS_DENIED';
  }

  get isAuthRequired(): boolean {
    return this.errorCode === 'AUTH_REQUIRED';
  }

  get isRateLimited(): boolean {
    return this.errorCode === 'RATE_LIMITED';
  }
}

/**
 * Default client instance — reads base URL from environment
 */
export const selemeneClient = new SelemeneClient(
  import.meta.env.VITE_SELEMENE_API_URL ?? 'https://selemene.tryambakam.space'
);
